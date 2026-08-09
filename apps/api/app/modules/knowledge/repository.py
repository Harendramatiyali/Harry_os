"""Knowledge persistence."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, or_, select

from app.db.repository import BaseRepository
from app.modules.knowledge.models import ImportRun, KnowledgeNote, KnowledgePromotion


def soft_delete(entity) -> None:
    entity.deleted_at = datetime.now(timezone.utc)


class KnowledgeNoteRepository(BaseRepository[KnowledgeNote]):
    model = KnowledgeNote

    async def list_for_user(
        self,
        user_id: str,
        *,
        area: str | None = None,
        kind: str | None = None,
        source: str | None = None,
        q: str | None = None,
        limit: int = 200,
    ) -> list[KnowledgeNote]:
        stmt = (
            select(KnowledgeNote)
            .where(KnowledgeNote.user_id == user_id, KnowledgeNote.deleted_at.is_(None))
            .order_by(KnowledgeNote.updated_at.desc())
            .limit(limit)
        )
        if area:
            stmt = stmt.where(KnowledgeNote.area == area)
        if kind:
            stmt = stmt.where(KnowledgeNote.kind == kind)
        if source:
            stmt = stmt.where(KnowledgeNote.source == source)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(
                    KnowledgeNote.title.ilike(like),
                    KnowledgeNote.body.ilike(like),
                    KnowledgeNote.vault_path.ilike(like),
                    KnowledgeNote.tags_csv.ilike(like),
                )
            )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> KnowledgeNote | None:
        stmt = select(KnowledgeNote).where(
            KnowledgeNote.id == item_id,
            KnowledgeNote.user_id == user_id,
            KnowledgeNote.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def get_by_vault_path(self, user_id: str, vault_path: str) -> KnowledgeNote | None:
        stmt = select(KnowledgeNote).where(
            KnowledgeNote.user_id == user_id,
            KnowledgeNote.vault_path == vault_path,
            KnowledgeNote.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def counts_by_area(self, user_id: str) -> list[tuple[str, int]]:
        stmt = (
            select(KnowledgeNote.area, func.count())
            .where(KnowledgeNote.user_id == user_id, KnowledgeNote.deleted_at.is_(None))
            .group_by(KnowledgeNote.area)
        )
        rows = await self.session.execute(stmt)
        return [(str(a.value if hasattr(a, "value") else a), int(c)) for a, c in rows.all()]

    async def count_source(self, user_id: str, source: str) -> int:
        stmt = select(func.count()).select_from(KnowledgeNote).where(
            KnowledgeNote.user_id == user_id,
            KnowledgeNote.deleted_at.is_(None),
            KnowledgeNote.source == source,
        )
        return int(await self.session.scalar(stmt) or 0)

    async def count_empty(self, user_id: str) -> int:
        stmt = select(func.count()).select_from(KnowledgeNote).where(
            KnowledgeNote.user_id == user_id,
            KnowledgeNote.deleted_at.is_(None),
            KnowledgeNote.is_empty == 1,
        )
        return int(await self.session.scalar(stmt) or 0)

    async def count_all(self, user_id: str) -> int:
        stmt = select(func.count()).select_from(KnowledgeNote).where(
            KnowledgeNote.user_id == user_id,
            KnowledgeNote.deleted_at.is_(None),
        )
        return int(await self.session.scalar(stmt) or 0)


class ImportRunRepository(BaseRepository[ImportRun]):
    model = ImportRun

    async def list_for_user(self, user_id: str, *, limit: int = 20) -> list[ImportRun]:
        stmt = (
            select(ImportRun)
            .where(ImportRun.user_id == user_id, ImportRun.deleted_at.is_(None))
            .order_by(ImportRun.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))


class PromotionRepository(BaseRepository[KnowledgePromotion]):
    model = KnowledgePromotion

    async def get_for_note(
        self, user_id: str, note_id: str, target_module: str
    ) -> KnowledgePromotion | None:
        stmt = select(KnowledgePromotion).where(
            KnowledgePromotion.user_id == user_id,
            KnowledgePromotion.note_id == note_id,
            KnowledgePromotion.target_module == target_module,
            KnowledgePromotion.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def list_for_user(self, user_id: str, *, limit: int = 200) -> list[KnowledgePromotion]:
        stmt = (
            select(KnowledgePromotion)
            .where(KnowledgePromotion.user_id == user_id, KnowledgePromotion.deleted_at.is_(None))
            .order_by(KnowledgePromotion.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))
