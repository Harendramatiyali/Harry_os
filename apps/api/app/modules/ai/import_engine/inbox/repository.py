"""Knowledge Inbox persistence."""

from __future__ import annotations

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.ai.import_models import AiImportCorrection, AiKnowledgeInboxItem


class KnowledgeInboxRepository(BaseRepository[AiKnowledgeInboxItem]):
    model = AiKnowledgeInboxItem

    async def list_for_user(
        self,
        user_id: str,
        *,
        status: str | None = None,
        limit: int = 50,
    ) -> list[AiKnowledgeInboxItem]:
        stmt = select(AiKnowledgeInboxItem).where(
            AiKnowledgeInboxItem.user_id == user_id,
            AiKnowledgeInboxItem.deleted_at.is_(None),
        )
        if status:
            stmt = stmt.where(AiKnowledgeInboxItem.status == status)
        stmt = stmt.order_by(AiKnowledgeInboxItem.created_at.desc()).limit(limit)
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> AiKnowledgeInboxItem | None:
        stmt = select(AiKnowledgeInboxItem).where(
            AiKnowledgeInboxItem.id == item_id,
            AiKnowledgeInboxItem.user_id == user_id,
            AiKnowledgeInboxItem.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)


class ImportCorrectionRepository(BaseRepository[AiImportCorrection]):
    model = AiImportCorrection
