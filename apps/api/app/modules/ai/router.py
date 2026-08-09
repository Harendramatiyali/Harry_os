"""AI Assistant HTTP routes — history/memory live; chat/RAG return 501."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.modules.ai.deps import AiServiceDep
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
    WritingPolishRequest,
    WritingPolishResponse,
)
from app.modules.ai.imports.router import router as imports_router
from app.modules.ai.import_engine.inbox.router import router as inbox_router
from app.modules.auth.deps import CurrentUserDep

router = APIRouter(prefix="/ai", tags=["ai"])
router.include_router(imports_router)
router.include_router(inbox_router)


@router.get("/capabilities", response_model=AiCapabilities)
async def capabilities(user: CurrentUserDep, service: AiServiceDep) -> AiCapabilities:
    _ = user
    return service.capabilities()


@router.post("/writing/polish", response_model=WritingPolishResponse)
async def polish_writing(
    body: WritingPolishRequest,
    user: CurrentUserDep,
    service: AiServiceDep,
) -> WritingPolishResponse:
    """Live Writing Copilot — rewrite raw notes into polished journal English."""
    return await service.polish_writing(user.id, body)


# —— Conversations / history ——


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(user: CurrentUserDep, service: AiServiceDep) -> list[ConversationOut]:
    return await service.list_conversations(user.id)


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate, user: CurrentUserDep, service: AiServiceDep
) -> ConversationOut:
    return await service.create_conversation(user.id, body)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str, user: CurrentUserDep, service: AiServiceDep
) -> ConversationDetail:
    return await service.get_conversation(user.id, conversation_id)


@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user: CurrentUserDep,
    service: AiServiceDep,
) -> ConversationOut:
    return await service.update_conversation(user.id, conversation_id, body)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str, user: CurrentUserDep, service: AiServiceDep
) -> None:
    await service.delete_conversation(user.id, conversation_id)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: str, user: CurrentUserDep, service: AiServiceDep
) -> list[MessageOut]:
    return await service.list_messages(user.id, conversation_id)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_message(
    conversation_id: str,
    body: MessageCreate,
    user: CurrentUserDep,
    service: AiServiceDep,
) -> MessageOut:
    return await service.add_message(user.id, conversation_id, body)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, user: CurrentUserDep, service: AiServiceDep) -> ChatResponse:
    """Persists history; LLM/RAG pipeline returns status=not_implemented until wired."""
    return await service.chat(user.id, body)


# —— Memory ——


@router.get("/memory", response_model=list[MemoryOut])
async def list_memory(user: CurrentUserDep, service: AiServiceDep) -> list[MemoryOut]:
    return await service.list_memory(user.id)


@router.post("/memory", response_model=MemoryOut, status_code=status.HTTP_201_CREATED)
async def create_memory(
    body: MemoryCreate, user: CurrentUserDep, service: AiServiceDep
) -> MemoryOut:
    return await service.create_memory(user.id, body)


@router.patch("/memory/{item_id}", response_model=MemoryOut)
async def update_memory(
    item_id: str, body: MemoryUpdate, user: CurrentUserDep, service: AiServiceDep
) -> MemoryOut:
    return await service.update_memory(user.id, item_id, body)


@router.delete("/memory/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(item_id: str, user: CurrentUserDep, service: AiServiceDep) -> None:
    await service.delete_memory(user.id, item_id)


# —— Embeddings / RAG registry ——


@router.get("/embeddings/chunks", response_model=list[EmbeddingChunkOut])
async def list_chunks(user: CurrentUserDep, service: AiServiceDep) -> list[EmbeddingChunkOut]:
    return await service.list_chunks(user.id)


@router.post(
    "/embeddings/chunks",
    response_model=EmbeddingChunkOut,
    status_code=status.HTTP_201_CREATED,
)
async def register_chunk(
    body: EmbeddingChunkCreate, user: CurrentUserDep, service: AiServiceDep
) -> EmbeddingChunkOut:
    return await service.register_chunk(user.id, body)


@router.delete("/embeddings/chunks/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chunk(item_id: str, user: CurrentUserDep, service: AiServiceDep) -> None:
    await service.delete_chunk(user.id, item_id)


@router.post("/embeddings/reindex", response_model=IndexStatus)
async def reindex(
    body: IndexRequest, user: CurrentUserDep, service: AiServiceDep
) -> IndexStatus:
    """Personal-data reindex — 501 until RAG adapters are implemented."""
    return await service.reindex(user.id, body)
