"""AI Assistant ORM — conversations, memory, embedding index (vectors later)."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


class MessageRole(str, enum.Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class MemoryKind(str, enum.Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    GOAL = "goal"
    INSIGHT = "insight"
    OTHER = "other"


class EmbeddingSource(str, enum.Enum):
    """Domain source for future RAG chunks — personal data only."""

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


class Conversation(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "ai_conversations"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New chat", server_default="New chat")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    messages: Mapped[list[AiMessage]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AiMessage.created_at",
    )


class AiMessage(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "ai_messages"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, name="ai_message_role", native_enum=False, length=16),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # JSON-ish metadata for tool calls / citations (string for SQLite simplicity)
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class MemoryItem(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Long-term personal memory (facts / preferences) — not LLM-extracted yet."""

    __tablename__ = "ai_memory_items"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[MemoryKind] = mapped_column(
        Enum(MemoryKind, name="ai_memory_kind", native_enum=False, length=16),
        nullable=False,
        default=MemoryKind.FACT,
        server_default=MemoryKind.FACT.value,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_module: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    importance: Mapped[float] = mapped_column(Float, nullable=False, default=0.5, server_default="0.5")


class EmbeddingChunk(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    RAG chunk registry. Vector payload is intentionally deferred:
    - Store text + source refs now
    - `vector_ref` reserved for external vector DB id / blob key later
    """

    __tablename__ = "ai_embedding_chunks"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source: Mapped[EmbeddingSource] = mapped_column(
        Enum(EmbeddingSource, name="ai_embedding_source", native_enum=False, length=24),
        nullable=False,
        index=True,
    )
    source_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dimensions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vector_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # When embeddings are generated, mark ready; until then indexing is a no-op seam
    indexed: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


# Register AI Import Center models on Base.metadata (via this module import).
from app.modules.ai import import_models as _import_models  # noqa: E402, F401
from app.modules.ai.import_models import (  # noqa: E402, F401
    AiImportCorrection,
    AiImportDraftSource,
    AiImportDraftVersion,
    AiImportEvent,
    AiImportEventLevel,
    AiImportJob,
    AiImportJobStatus,
    AiImportPage,
    AiImportPageStatus,
    AiImportReviewStatus,
    AiKnowledgeInboxItem,
    AiKnowledgeInboxStatus,
)
