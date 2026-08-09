"""AI Assistant schemas — history & memory CRUD live; chat/RAG are stubs."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class MemoryKind(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    GOAL = "goal"
    INSIGHT = "insight"
    OTHER = "other"


class EmbeddingSource(str, Enum):
    TRADING = "trading"
    BOOKS = "books"
    FINANCE = "finance"
    HEALTH = "health"
    PLANNER = "planner"
    GOALS = "goals"
    KNOWLEDGE = "knowledge"
    MEMORY = "memory"
    CONVERSATION = "conversation"
    OTHER = "other"


# —— Conversations ——


class ConversationCreate(BaseModel):
    title: str = Field(default="New chat", min_length=1, max_length=255)


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = None


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    summary: str | None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    """Persist a user message without invoking the LLM (architecture / offline)."""

    content: str = Field(min_length=1)
    role: MessageRole = MessageRole.USER


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: MessageRole
    content: str
    token_count: int | None
    model: str | None
    created_at: datetime


class ConversationDetail(ConversationOut):
    messages: list[MessageOut] = Field(default_factory=list)


# —— Chat (stub) ——


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str = Field(min_length=1)
    use_memory: bool = True
    use_rag: bool = True
    modules: list[str] | None = None  # subset of allowed personal-data modules


class ChatCitation(BaseModel):
    source: EmbeddingSource
    source_id: str | None = None
    title: str | None = None
    excerpt: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    message: MessageOut
    citations: list[ChatCitation] = Field(default_factory=list)
    status: str = "not_implemented"


# —— Memory ——


class MemoryCreate(BaseModel):
    kind: MemoryKind = MemoryKind.FACT
    content: str = Field(min_length=1)
    source_module: str | None = None
    importance: float = Field(default=0.5, ge=0, le=1)


class MemoryUpdate(BaseModel):
    kind: MemoryKind | None = None
    content: str | None = Field(default=None, min_length=1)
    source_module: str | None = None
    importance: float | None = Field(default=None, ge=0, le=1)


class MemoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: MemoryKind
    content: str
    source_module: str | None
    importance: float
    created_at: datetime
    updated_at: datetime


# —— Embeddings / RAG (registry only) ——


class EmbeddingChunkCreate(BaseModel):
    source: EmbeddingSource
    content: str = Field(min_length=1)
    source_id: str | None = None
    title: str | None = None


class EmbeddingChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: EmbeddingSource
    source_id: str | None
    title: str | None
    content: str
    embedding_model: str | None
    dimensions: int | None
    vector_ref: str | None
    indexed: bool
    created_at: datetime


class IndexRequest(BaseModel):
    """Trigger personal-data reindex — stub until RAG is implemented."""

    modules: list[str] | None = None
    force: bool = False


class IndexStatus(BaseModel):
    status: str
    message: str
    chunks_registered: int = 0
    chunks_indexed: int = 0


class AiCapabilities(BaseModel):
    ai_enabled: bool
    llm_ready: bool
    embeddings_ready: bool
    rag_ready: bool
    memory_ready: bool
    history_ready: bool
    imports_ready: bool = True
    writing_polish_ready: bool = False
    allowed_modules: list[str]
    llm_model: str
    embedding_model: str
    example_prompts: list[str]


class WritingPolishRequest(BaseModel):
    """Live Harry OS Writing Copilot — rewrite raw notes into polished journal prose."""

    text: str = Field(default="", max_length=20_000)
    field_id: str | None = Field(default=None, max_length=128)
    field_name: str | None = Field(default=None, max_length=128)
    field_description: str | None = Field(default=None, max_length=500)
    writing_style: str | None = Field(default=None, max_length=300)
    ai_instruction: str | None = Field(default=None, max_length=1000)


class WritingPolishResponse(BaseModel):
    polished: str
    model: str | None = None
    unchanged: bool = False


class WeeklyReviewInsightsRequest(BaseModel):
    """Harry AI mentor synthesis for one trading week (from journal digest)."""

    week_label: str = Field(default="", max_length=128)
    digest: str = Field(default="", max_length=20_000)


class WeeklyReviewInsightsResponse(BaseModel):
    insights: dict
    model: str | None = None
    fallback: bool = False
