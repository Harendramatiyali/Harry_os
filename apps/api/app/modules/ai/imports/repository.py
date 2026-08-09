"""Persistence for AI Import Center jobs, pages, drafts, events."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db.repository import BaseRepository
from app.modules.ai.import_models import (
    AiImportDraftVersion,
    AiImportEvent,
    AiImportJob,
    AiImportPage,
)


def soft_delete(entity) -> None:
    entity.deleted_at = datetime.now(timezone.utc)


_JOB_LOAD = (
    selectinload(AiImportJob.pages),
    selectinload(AiImportJob.draft_versions),
)


class AiImportJobRepository(BaseRepository[AiImportJob]):
    model = AiImportJob

    async def get_owned(self, user_id: str, job_id: str, *, with_pages: bool = True) -> AiImportJob | None:
        stmt = select(AiImportJob).where(
            AiImportJob.id == job_id,
            AiImportJob.user_id == user_id,
            AiImportJob.deleted_at.is_(None),
        )
        if with_pages:
            stmt = stmt.options(*_JOB_LOAD)
        return await self.session.scalar(stmt)

    async def list_for_user(self, user_id: str, *, limit: int = 50) -> list[AiImportJob]:
        stmt = (
            select(AiImportJob)
            .where(AiImportJob.user_id == user_id, AiImportJob.deleted_at.is_(None))
            .order_by(AiImportJob.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))


class AiImportPageRepository(BaseRepository[AiImportPage]):
    model = AiImportPage

    async def list_for_job(self, user_id: str, job_id: str) -> list[AiImportPage]:
        stmt = (
            select(AiImportPage)
            .where(
                AiImportPage.user_id == user_id,
                AiImportPage.job_id == job_id,
                AiImportPage.deleted_at.is_(None),
            )
            .order_by(AiImportPage.page_index.asc())
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, page_id: str) -> AiImportPage | None:
        stmt = select(AiImportPage).where(
            AiImportPage.id == page_id,
            AiImportPage.user_id == user_id,
            AiImportPage.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def get_owned_for_job(
        self, user_id: str, job_id: str, page_id: str
    ) -> AiImportPage | None:
        stmt = select(AiImportPage).where(
            AiImportPage.id == page_id,
            AiImportPage.job_id == job_id,
            AiImportPage.user_id == user_id,
            AiImportPage.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def next_page_index(self, job_id: str) -> int:
        """First free non-negative index for this job (includes soft-deleted rows).

        Soft-deleted pages still occupy UNIQUE(job_id, page_index), so we must
        not reuse an index held by a tombstone row.
        """
        stmt = select(AiImportPage.page_index).where(AiImportPage.job_id == job_id)
        used = {int(i) for i in await self.session.scalars(stmt)}
        index = 0
        while index in used:
            index += 1
        return index

    async def free_soft_deleted_indexes(self, job_id: str) -> None:
        """Move soft-deleted pages off non-negative indexes so active pages can compact."""
        stmt = select(AiImportPage).where(
            AiImportPage.job_id == job_id,
            AiImportPage.deleted_at.is_not(None),
            AiImportPage.page_index >= 0,
        )
        rows = list(await self.session.scalars(stmt))
        for n, row in enumerate(rows):
            # Unique negative tombstone index (avoid colliding with other soft-deletes)
            base = abs(int(uuid.UUID(row.id).int % 1_000_000_000)) + 1
            row.page_index = -(base + n * 1_000_000_001)
        if rows:
            await self.session.flush()

    async def count_for_job(self, job_id: str) -> int:
        stmt = select(func.count()).select_from(AiImportPage).where(
            AiImportPage.job_id == job_id,
            AiImportPage.deleted_at.is_(None),
        )
        return int(await self.session.scalar(stmt) or 0)


class AiImportDraftVersionRepository(BaseRepository[AiImportDraftVersion]):
    model = AiImportDraftVersion

    async def next_version(self, job_id: str) -> int:
        stmt = select(func.coalesce(func.max(AiImportDraftVersion.version), 0)).where(
            AiImportDraftVersion.job_id == job_id,
            AiImportDraftVersion.deleted_at.is_(None),
        )
        current = await self.session.scalar(stmt)
        return int(current or 0) + 1


class AiImportEventRepository(BaseRepository[AiImportEvent]):
    model = AiImportEvent
