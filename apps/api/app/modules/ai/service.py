"""
AI Assistant orchestration.

Implemented now:
- Conversation + message history CRUD
- Manual memory CRUD
- Embedding chunk registry CRUD
- Capabilities endpoint
- Live Writing Copilot (`polish_writing`) via OpenAI-compatible LLM

Not implemented (raises NotImplementedAppError):
- Full LLM chat / RAG retrieve + answer
- Embedding generation
- Personal-data domain adapters
"""

from __future__ import annotations

import uuid

from app.core.config import Settings
from app.core.errors import NotFoundError, NotImplementedAppError
from app.modules.ai.models import (
    AiMessage,
    Conversation,
    EmbeddingChunk,
    EmbeddingSource,
    MemoryItem,
    MemoryKind,
    MessageRole,
)
from app.modules.ai.ports.embeddings import EmbeddingProvider
from app.modules.ai.ports.llm import LLMMessage, LLMProvider, ChatCompletionRequest
from app.modules.ai.ports.personal_data import PersonalDataGateway
from app.modules.ai.ports.retriever import VectorStore
from app.modules.ai.rag import Chunker, RagIndexer
from app.modules.ai.repository import (
    ConversationRepository,
    EmbeddingChunkRepository,
    MemoryRepository,
    MessageRepository,
    soft_delete,
)
from app.modules.ai.schemas import (
    AiCapabilities,
    ChatRequest,
    ChatResponse,
    ConversationCreate,
    ConversationDetail,
    ConversationOut,
    ConversationUpdate,
    EmbeddingChunkCreate,
    EmbeddingChunkOut,
    IndexRequest,
    IndexStatus,
    MemoryCreate,
    MemoryOut,
    MemoryUpdate,
    MessageCreate,
    MessageOut,
    MessageRole as MessageRoleSchema,
    WritingPolishRequest,
    WritingPolishResponse,
)

EXAMPLE_PROMPTS = [
    "What mistakes am I repeating in trading?",
    "What books have I completed?",
    "How much did I save last month?",
    "Show my June goals.",
    "Prepare today's review.",
]

WRITING_POLISH_SYSTEM = """You are Harry OS Writing Copilot.

You are an expert English editor, professional trading journal writer, and writing assistant.

Your responsibility is NOT to generate new content.
Your responsibility is to transform raw notes into a polished trading journal.

The user usually writes in Hindi, Hinglish, broken English, bullet points, short notes, incomplete sentences, random observations, and mixed language. They are thinking aloud. Convert those raw thoughts into beautifully written journal prose.

OUTPUT STYLE
- Professional, natural, human-like, easy to read
- Fluent English, journal quality
- Well structured with smooth transitions
- Story-like where appropriate
- Never robotic or AI-generated sounding
- Prefer complete paragraphs over choppy one-line sentences

YOU MUST
- Intelligently understand the user's thoughts
- Rewrite sentences naturally
- Merge fragmented thoughts into complete paragraphs
- Improve readability, sentence flow, wording, and paragraph structure
- Add smooth transitions between ideas
- Organize information logically
- Convert Hindi / Hinglish into natural English
- Write like an experienced trader journaling the session

YOU MUST PRESERVE
- All facts, numbers, prices, stop loss, target, quantity, P&L, strike, dates, times
- Trading setup, market observations, emotions, lessons, and mistakes the user actually wrote
- Exact meaning — never change the substance

NEVER
- Invent information
- Add analysis, market conditions, trades, emotions, lessons, or psychology the user did not mention
- Change numbers, timings, or trading terminology
- Hallucinate or guess missing details
- Summarize away content
- Explain your changes
- Mention grammar corrections
- Provide suggestions
- Add headings, introductions, or conclusions unless they already exist naturally in the user's writing

TRADING TERMS — keep exactly as written when present:
CE, PE, Spot, Premium, VWAP, CPR, EMA, Support, Resistance, Demand Zone, Supply Zone,
Liquidity Sweep, Trendline, Breakout, Breakdown, False Breakout, M Pattern, W Pattern,
BOS, CHOCH, FVG, Price Action

EXAMPLE
Raw:
Market flat open
24280 resistance
office meeting thi
jaldi me trade li
SL bada tha
fake breakdown
SL hit

Good:
The market opened flat, and I had already identified the key support and resistance levels before the session began. After observing my planned setup, I entered the trade. However, after entering, I realized that my stop loss was much larger than my planned risk. The market eventually produced a false breakdown and hit my stop loss.

Return ONLY the polished journal text. No preamble. No commentary."""


class AiService:
    def __init__(
        self,
        *,
        settings: Settings,
        conversations: ConversationRepository,
        messages: MessageRepository,
        memory: MemoryRepository,
        chunks: EmbeddingChunkRepository,
        llm: LLMProvider,
        embeddings: EmbeddingProvider,
        vector_store: VectorStore,
        personal_data: PersonalDataGateway,
    ) -> None:
        self.settings = settings
        self.conversations = conversations
        self.messages = messages
        self.memory = memory
        self.chunks = chunks
        self.llm = llm
        self.embeddings = embeddings
        self.vector_store = vector_store
        self.personal_data = personal_data
        self.indexer = RagIndexer(chunker=Chunker())

    # —— Capabilities ——

    def capabilities(self) -> AiCapabilities:
        key = bool(self.settings.llm_api_key)
        llm_ready = bool(self.settings.ai_enabled and key)
        return AiCapabilities(
            ai_enabled=self.settings.ai_enabled,
            llm_ready=llm_ready,
            embeddings_ready=False,
            rag_ready=False,
            memory_ready=True,
            history_ready=True,
            imports_ready=True,
            writing_polish_ready=llm_ready,
            allowed_modules=list(self.settings.ai_allowed_modules),
            llm_model=self.settings.llm_model,
            embedding_model=self.settings.embedding_model,
            example_prompts=EXAMPLE_PROMPTS,
        )

    async def polish_writing(self, user_id: str, data: WritingPolishRequest) -> WritingPolishResponse:
        """Rewrite raw notes into polished trading-journal English without inventing facts."""
        _ = user_id
        raw = (data.text or "").strip()
        if not raw:
            return WritingPolishResponse(polished="", unchanged=True, model=None)

        if not self.settings.ai_enabled or not self.settings.llm_api_key:
            raise NotImplementedAppError(
                "Writing polish requires AI_ENABLED=true and LLM_API_KEY.",
                details={"writing_polish_ready": False},
            )

        context_bits = [
            f"Field name: {data.field_name}" if data.field_name else None,
            f"Field purpose: {data.field_description}" if data.field_description else None,
            f"Writing style: {data.writing_style}" if data.writing_style else None,
            f"Extra instruction: {data.ai_instruction}" if data.ai_instruction else None,
        ]
        context = "\n".join(b for b in context_bits if b) or "Trading journal notes field."

        user_prompt = (
            f"Journal field context:\n{context}\n\n"
            f"Transform the raw notes below into a polished trading journal entry.\n"
            f"Preserve every fact and the exact meaning. Do not invent details.\n"
            f"Return only the rewritten journal text.\n\n"
            f"---\n{raw}\n---"
        )

        result = await self.llm.complete(
            ChatCompletionRequest(
                messages=[
                    LLMMessage(role="system", content=WRITING_POLISH_SYSTEM),
                    LLMMessage(role="user", content=user_prompt),
                ],
                model=self.settings.llm_model,
                temperature=0.35,
                max_tokens=min(4000, max(500, len(raw) * 4)),
            )
        )
        polished = (result.content or "").strip()
        # Strip accidental markdown fences
        if polished.startswith("```"):
            polished = polished.strip("`")
            if "\n" in polished:
                polished = polished.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        unchanged = polished == raw or not polished
        return WritingPolishResponse(
            polished=polished or raw,
            model=result.model,
            unchanged=unchanged,
        )

    # —— Conversations ——

    def _to_conversation_out(self, c: Conversation) -> ConversationOut:
        msgs = [m for m in (c.messages or []) if not m.deleted_at]
        return ConversationOut(
            id=c.id,
            title=c.title,
            summary=c.summary,
            message_count=len(msgs),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    def _to_message_out(self, m: AiMessage) -> MessageOut:
        return MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,  # type: ignore[arg-type]
            content=m.content,
            token_count=m.token_count,
            model=m.model,
            created_at=m.created_at,
        )

    async def list_conversations(self, user_id: str) -> list[ConversationOut]:
        rows = await self.conversations.list_for_user(user_id)
        return [self._to_conversation_out(c) for c in rows]

    async def get_conversation(self, user_id: str, conversation_id: str) -> ConversationDetail:
        c = await self._conversation(user_id, conversation_id)
        msgs = [self._to_message_out(m) for m in (c.messages or []) if not m.deleted_at]
        base = self._to_conversation_out(c)
        return ConversationDetail(**base.model_dump(), messages=msgs)

    async def create_conversation(self, user_id: str, data: ConversationCreate) -> ConversationOut:
        row = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title.strip() or "New chat",
        )
        await self.conversations.add(row)
        row = await self.conversations.get_owned(user_id, row.id)
        assert row
        return self._to_conversation_out(row)

    async def update_conversation(
        self, user_id: str, conversation_id: str, data: ConversationUpdate
    ) -> ConversationOut:
        row = await self._conversation(user_id, conversation_id)
        payload = data.model_dump(exclude_unset=True)
        if "title" in payload and payload["title"]:
            payload["title"] = payload["title"].strip()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.conversations.session.flush()
        row = await self.conversations.get_owned(user_id, conversation_id)
        assert row
        return self._to_conversation_out(row)

    async def delete_conversation(self, user_id: str, conversation_id: str) -> None:
        soft_delete(await self._conversation(user_id, conversation_id))
        await self.conversations.session.flush()

    async def add_message(
        self, user_id: str, conversation_id: str, data: MessageCreate
    ) -> MessageOut:
        await self._conversation(user_id, conversation_id)
        row = AiMessage(
            id=str(uuid.uuid4()),
            user_id=user_id,
            conversation_id=conversation_id,
            role=MessageRole(data.role.value),
            content=data.content.strip(),
        )
        await self.messages.add(row)
        return self._to_message_out(row)

    async def list_messages(self, user_id: str, conversation_id: str) -> list[MessageOut]:
        await self._conversation(user_id, conversation_id)
        rows = await self.messages.list_for_conversation(user_id, conversation_id)
        return [self._to_message_out(m) for m in rows]

    # —— Chat (stub) ——

    async def chat(self, user_id: str, data: ChatRequest) -> ChatResponse:
        """
        Intended pipeline (future):
        1. Ensure conversation
        2. Persist user message
        3. Load history + memory
        4. Optional RAG via embeddings + vector store (personal data only)
        5. Call LLMProvider
        6. Persist assistant message + citations

        Current: persist user + scaffold assistant note. No OpenAI / RAG calls.
        """
        if data.conversation_id:
            conversation_id = data.conversation_id
            await self._conversation(user_id, conversation_id)
        else:
            created = await self.create_conversation(
                user_id, ConversationCreate(title=_title_from(data.message))
            )
            conversation_id = created.id

        await self.add_message(
            user_id,
            conversation_id,
            MessageCreate(content=data.message, role=MessageRoleSchema.USER),
        )

        # Architecture scaffold — do not call llm / embeddings / vector_store yet.
        _ = (data.use_memory, data.use_rag, data.modules, LLMMessage, ChatCompletionRequest)
        notice = (
            "AI logic is not implemented yet. Your message was saved to conversation history. "
            "OpenAI, memory injection, embeddings, and personal-data RAG ports are ready to wire next."
        )
        assistant = await self.add_message(
            user_id,
            conversation_id,
            MessageCreate(content=notice, role=MessageRoleSchema.ASSISTANT),
        )
        return ChatResponse(
            conversation_id=conversation_id,
            message=assistant,
            citations=[],
            status="not_implemented",
        )

    # —— Memory ——

    async def list_memory(self, user_id: str) -> list[MemoryOut]:
        return [MemoryOut.model_validate(r) for r in await self.memory.list_for_user(user_id)]

    async def create_memory(self, user_id: str, data: MemoryCreate) -> MemoryOut:
        row = MemoryItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            kind=MemoryKind(data.kind.value),
            content=data.content.strip(),
            source_module=data.source_module,
            importance=data.importance,
        )
        await self.memory.add(row)
        return MemoryOut.model_validate(row)

    async def update_memory(self, user_id: str, item_id: str, data: MemoryUpdate) -> MemoryOut:
        row = await self._memory(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "kind" in payload and payload["kind"] is not None:
            k = payload["kind"]
            payload["kind"] = MemoryKind(k.value if hasattr(k, "value") else k)
        if "content" in payload and payload["content"]:
            payload["content"] = payload["content"].strip()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.memory.session.flush()
        return MemoryOut.model_validate(row)

    async def delete_memory(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._memory(user_id, item_id))
        await self.memory.session.flush()

    async def memory_for_prompt(self, user_id: str, *, limit: int = 20) -> list[str]:
        rows = await self.memory.list_for_user(user_id, limit=limit)
        return [r.content for r in rows]

    # —— Embedding registry / index stub ——

    async def list_chunks(self, user_id: str) -> list[EmbeddingChunkOut]:
        rows = await self.chunks.list_for_user(user_id)
        return [self._to_chunk_out(r) for r in rows]

    async def register_chunk(self, user_id: str, data: EmbeddingChunkCreate) -> EmbeddingChunkOut:
        row = EmbeddingChunk(
            id=str(uuid.uuid4()),
            user_id=user_id,
            source=EmbeddingSource(data.source.value),
            source_id=data.source_id,
            title=data.title,
            content=data.content.strip(),
            indexed=0,
        )
        await self.chunks.add(row)
        return self._to_chunk_out(row)

    async def delete_chunk(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._chunk(user_id, item_id))
        await self.chunks.session.flush()

    async def reindex(self, user_id: str, data: IndexRequest) -> IndexStatus:
        """Collect personal snippets → register chunks → (future) embed + upsert vectors."""
        snippets = await self.personal_data.collect(
            user_id, modules=data.modules or list(self.settings.ai_allowed_modules)
        )
        registered = 0
        for snip in snippets:
            for piece in self.indexer.chunker.chunk(
                title=snip.title,
                body=snip.body,
                source=snip.module,
                source_id=snip.entity_id,
            ):
                source = (
                    EmbeddingSource(piece.source)
                    if piece.source in EmbeddingSource._value2member_map_
                    else EmbeddingSource.OTHER
                )
                await self.register_chunk(
                    user_id,
                    EmbeddingChunkCreate(
                        source=source,  # type: ignore[arg-type]
                        content=piece.content,
                        source_id=piece.source_id,
                        title=piece.title,
                    ),
                )
                registered += 1

        total, indexed = await self.chunks.counts(user_id)
        if registered == 0 and not snippets:
            raise NotImplementedAppError(
                "Personal-data RAG indexing is not implemented yet. "
                "Chunk registry and vector-store ports are ready.",
                details={
                    "modules": data.modules or self.settings.ai_allowed_modules,
                    "chunks_registered": total,
                    "chunks_indexed": indexed,
                    "force": data.force,
                },
            )
        return IndexStatus(
            status="registered_only",
            message="Chunks registered; embedding + vector upsert not implemented.",
            chunks_registered=total,
            chunks_indexed=indexed,
        )

    def _to_chunk_out(self, row: EmbeddingChunk) -> EmbeddingChunkOut:
        return EmbeddingChunkOut(
            id=row.id,
            source=row.source,  # type: ignore[arg-type]
            source_id=row.source_id,
            title=row.title,
            content=row.content,
            embedding_model=row.embedding_model,
            dimensions=row.dimensions,
            vector_ref=row.vector_ref,
            indexed=bool(row.indexed),
            created_at=row.created_at,
        )

    # —— ownership ——

    async def _conversation(self, user_id: str, conversation_id: str) -> Conversation:
        row = await self.conversations.get_owned(user_id, conversation_id)
        if not row:
            raise NotFoundError("Conversation not found")
        return row

    async def _memory(self, user_id: str, item_id: str) -> MemoryItem:
        row = await self.memory.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Memory item not found")
        return row

    async def _chunk(self, user_id: str, item_id: str) -> EmbeddingChunk:
        row = await self.chunks.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Embedding chunk not found")
        return row


def _title_from(message: str) -> str:
    text = " ".join(message.strip().split())
    return (text[:48] + "…") if len(text) > 48 else (text or "New chat")
