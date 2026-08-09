"""Trading persistence."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.repository import BaseRepository
from app.modules.trading.models import (
    PeriodReview,
    PsychologyEntry,
    Trade,
    TradeMistake,
    TradeScreenshot,
    TradeStatus,
)


class TradeRepository(BaseRepository[Trade]):
    model = Trade

    async def get_with_relations(self, trade_id: str) -> Trade | None:
        stmt = (
            select(Trade)
            .where(Trade.id == trade_id, Trade.deleted_at.is_(None))
            .options(selectinload(Trade.mistakes), selectinload(Trade.screenshots))
        )
        return await self.session.scalar(stmt)

    async def search(
        self,
        user_id: str,
        *,
        q: str | None = None,
        status: str | None = None,
        instrument: str | None = None,
        setup: str | None = None,
        tag: str | None = None,
        grade: str | None = None,
        direction: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Trade]:
        stmt = (
            select(Trade)
            .where(Trade.user_id == user_id, Trade.deleted_at.is_(None))
            .options(selectinload(Trade.mistakes), selectinload(Trade.screenshots))
            .order_by(Trade.opened_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status:
            stmt = stmt.where(Trade.status == status)
        if instrument:
            stmt = stmt.where(Trade.instrument.ilike(f"%{instrument}%"))
        if setup:
            stmt = stmt.where(Trade.setup == setup)
        if grade:
            stmt = stmt.where(Trade.grade == grade)
        if direction:
            stmt = stmt.where(Trade.direction == direction)
        if tag:
            stmt = stmt.where(Trade.tags_csv.ilike(f"%{tag}%"))
        if date_from:
            stmt = stmt.where(Trade.opened_at >= date_from)
        if date_to:
            stmt = stmt.where(Trade.opened_at <= date_to)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Trade.instrument.ilike(like),
                    Trade.setup.ilike(like),
                    Trade.thesis.ilike(like),
                    Trade.tags_csv.ilike(like),
                    Trade.review_notes.ilike(like),
                )
            )
        return list(await self.session.scalars(stmt))

    async def list_closed_between(
        self, user_id: str, start: datetime, end: datetime
    ) -> list[Trade]:
        stmt = (
            select(Trade)
            .where(
                Trade.user_id == user_id,
                Trade.deleted_at.is_(None),
                Trade.status == TradeStatus.CLOSED,
                Trade.closed_at.is_not(None),
                Trade.closed_at >= start,
                Trade.closed_at <= end,
            )
            .order_by(Trade.closed_at.asc())
        )
        return list(await self.session.scalars(stmt))


class MistakeRepository(BaseRepository[TradeMistake]):
    model = TradeMistake

    async def list_for_user(
        self, user_id: str, *, date_from: date | None = None, date_to: date | None = None
    ) -> list[TradeMistake]:
        stmt = (
            select(TradeMistake)
            .where(TradeMistake.user_id == user_id, TradeMistake.deleted_at.is_(None))
            .order_by(TradeMistake.occurred_on.desc())
        )
        if date_from:
            stmt = stmt.where(TradeMistake.occurred_on >= date_from)
        if date_to:
            stmt = stmt.where(TradeMistake.occurred_on <= date_to)
        return list(await self.session.scalars(stmt))

    async def stats(self, user_id: str) -> list[tuple[str, int]]:
        stmt = (
            select(TradeMistake.category, func.count())
            .where(TradeMistake.user_id == user_id, TradeMistake.deleted_at.is_(None))
            .group_by(TradeMistake.category)
            .order_by(func.count().desc())
        )
        rows = await self.session.execute(stmt)
        return [(r[0], int(r[1])) for r in rows.all()]


class PsychologyRepository(BaseRepository[PsychologyEntry]):
    model = PsychologyEntry

    async def list_for_user(self, user_id: str, limit: int = 100) -> list[PsychologyEntry]:
        stmt = (
            select(PsychologyEntry)
            .where(PsychologyEntry.user_id == user_id, PsychologyEntry.deleted_at.is_(None))
            .order_by(PsychologyEntry.entry_date.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_by_date_mood(
        self, user_id: str, entry_date, mood: str
    ) -> PsychologyEntry | None:
        stmt = select(PsychologyEntry).where(
            PsychologyEntry.user_id == user_id,
            PsychologyEntry.entry_date == entry_date,
            PsychologyEntry.mood == mood,
            PsychologyEntry.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)


class ScreenshotRepository(BaseRepository[TradeScreenshot]):
    model = TradeScreenshot


class PeriodReviewRepository(BaseRepository[PeriodReview]):
    model = PeriodReview

    async def list_for_user(
        self, user_id: str, period_type: str | None = None
    ) -> list[PeriodReview]:
        stmt = (
            select(PeriodReview)
            .where(PeriodReview.user_id == user_id, PeriodReview.deleted_at.is_(None))
            .order_by(PeriodReview.period_start.desc())
        )
        if period_type:
            stmt = stmt.where(PeriodReview.period_type == period_type)
        return list(await self.session.scalars(stmt))

    async def get_unique(
        self, user_id: str, period_type: str, period_start: date
    ) -> PeriodReview | None:
        stmt = select(PeriodReview).where(
            PeriodReview.user_id == user_id,
            PeriodReview.period_type == period_type,
            PeriodReview.period_start == period_start,
            PeriodReview.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)


def soft_delete(entity) -> None:
    from datetime import timezone

    entity.deleted_at = datetime.now(timezone.utc)
