"""AI persistence — conversations, messages, memory, embedding chunk registry."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db.repository import BaseRepository
from app.modules.ai.models import AiMessage, Conversation, EmbeddingChunk, MemoryItem


def soft_delete(entity) -> None:
    entity.deleted_at = datetime.now(timezone.utc)


class ConversationRepository(BaseRepository[Conversation]):
    model = Conversation

    async def list_for_user(self, user_id: str, *, limit: int = 50) -> list[Conversation]:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.deleted_at.is_(None))
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, conversation_id: str) -> Conversation | None:
        stmt = (
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
                Conversation.deleted_at.is_(None),
            )
            .options(selectinload(Conversation.messages))
        )
        return await self.session.scalar(stmt)


class MessageRepository(BaseRepository[AiMessage]):
    model = AiMessage

    async def list_for_conversation(self, user_id: str, conversation_id: str) -> list[AiMessage]:
        stmt = (
            select(AiMessage)
            .where(
                AiMessage.user_id == user_id,
                AiMessage.conversation_id == conversation_id,
                AiMessage.deleted_at.is_(None),
            )
            .order_by(AiMessage.created_at.asc())
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> AiMessage | None:
        stmt = select(AiMessage).where(
            AiMessage.id == item_id,
            AiMessage.user_id == user_id,
            AiMessage.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)


class MemoryRepository(BaseRepository[MemoryItem]):
    model = MemoryItem

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[MemoryItem]:
        stmt = (
            select(MemoryItem)
            .where(MemoryItem.user_id == user_id, MemoryItem.deleted_at.is_(None))
            .order_by(MemoryItem.importance.desc(), MemoryItem.updated_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> MemoryItem | None:
        stmt = select(MemoryItem).where(
            MemoryItem.id == item_id,
            MemoryItem.user_id == user_id,
            MemoryItem.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)


class EmbeddingChunkRepository(BaseRepository[EmbeddingChunk]):
    model = EmbeddingChunk

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[EmbeddingChunk]:
        stmt = (
            select(EmbeddingChunk)
            .where(EmbeddingChunk.user_id == user_id, EmbeddingChunk.deleted_at.is_(None))
            .order_by(EmbeddingChunk.updated_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def counts(self, user_id: str) -> tuple[int, int]:
        total_stmt = select(func.count()).select_from(EmbeddingChunk).where(
            EmbeddingChunk.user_id == user_id,
            EmbeddingChunk.deleted_at.is_(None),
        )
        indexed_stmt = select(func.count()).select_from(EmbeddingChunk).where(
            EmbeddingChunk.user_id == user_id,
            EmbeddingChunk.deleted_at.is_(None),
            EmbeddingChunk.indexed == 1,
        )
        total = int(await self.session.scalar(total_stmt) or 0)
        indexed = int(await self.session.scalar(indexed_stmt) or 0)
        return total, indexed

    async def get_owned(self, user_id: str, item_id: str) -> EmbeddingChunk | None:
        stmt = select(EmbeddingChunk).where(
            EmbeddingChunk.id == item_id,
            EmbeddingChunk.user_id == user_id,
            EmbeddingChunk.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)
