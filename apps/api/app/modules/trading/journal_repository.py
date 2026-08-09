"""Persistence for structured trading day journals."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.db.repository import BaseRepository
from app.modules.trading.journal_models import (
    TradingJournalAttachment,
    TradingJournalDay,
    TradingJournalDaySection,
    TradingJournalParseRun,
    TradingJournalTrade,
    TradingJournalTradeSection,
)

_DAY_LOAD_OPTIONS = (
    selectinload(TradingJournalDay.sections),
    selectinload(TradingJournalDay.trades).selectinload(TradingJournalTrade.sections),
    selectinload(TradingJournalDay.trades).selectinload(TradingJournalTrade.attachments),
    selectinload(TradingJournalDay.attachments),
)


class TradingJournalDayRepository(BaseRepository[TradingJournalDay]):
    model = TradingJournalDay

    async def get_owned(self, user_id: str, journal_id: str) -> TradingJournalDay | None:
        stmt = (
            select(TradingJournalDay)
            .where(
                TradingJournalDay.id == journal_id,
                TradingJournalDay.user_id == user_id,
                TradingJournalDay.deleted_at.is_(None),
            )
            .options(*_DAY_LOAD_OPTIONS)
        )
        return await self.session.scalar(stmt)

    async def get_by_date(
        self, user_id: str, journal_date: date, *, include_deleted: bool = False
    ) -> TradingJournalDay | None:
        stmt = (
            select(TradingJournalDay)
            .where(
                TradingJournalDay.user_id == user_id,
                TradingJournalDay.journal_date == journal_date,
            )
            .options(*_DAY_LOAD_OPTIONS)
        )
        if not include_deleted:
            stmt = stmt.where(TradingJournalDay.deleted_at.is_(None))
        return await self.session.scalar(stmt)

    async def get_by_knowledge_note(
        self, user_id: str, knowledge_note_id: str
    ) -> TradingJournalDay | None:
        stmt = (
            select(TradingJournalDay)
            .where(
                TradingJournalDay.user_id == user_id,
                TradingJournalDay.knowledge_note_id == knowledge_note_id,
                TradingJournalDay.deleted_at.is_(None),
            )
            .options(*_DAY_LOAD_OPTIONS)
        )
        return await self.session.scalar(stmt)

    async def list_for_user(
        self,
        user_id: str,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        parse_status: str | None = None,
        favorite_only: bool = False,
        q: str | None = None,
        limit: int = 100,
        offset: int = 0,
        with_relations: bool = False,
    ) -> list[TradingJournalDay]:
        stmt = (
            select(TradingJournalDay)
            .where(TradingJournalDay.user_id == user_id, TradingJournalDay.deleted_at.is_(None))
            .order_by(TradingJournalDay.journal_date.desc())
            .limit(limit)
            .offset(offset)
        )
        if date_from:
            stmt = stmt.where(TradingJournalDay.journal_date >= date_from)
        if date_to:
            stmt = stmt.where(TradingJournalDay.journal_date <= date_to)
        if parse_status:
            stmt = stmt.where(TradingJournalDay.parse_status == parse_status)
        if favorite_only:
            stmt = stmt.where(TradingJournalDay.is_favorite.is_(True))
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(
                    TradingJournalDay.title.ilike(like),
                    TradingJournalDay.primary_instrument.ilike(like),
                    TradingJournalDay.day_bias.ilike(like),
                    TradingJournalDay.overall_grade.ilike(like),
                    TradingJournalDay.tags_csv.ilike(like),
                    TradingJournalDay.vault_path.ilike(like),
                )
            )
        if with_relations:
            stmt = stmt.options(*_DAY_LOAD_OPTIONS)
        return list(await self.session.scalars(stmt))

    async def counts_for_days(self, day_ids: list[str]) -> dict[str, tuple[int, int, int]]:
        """Return day_id -> (trade_count, section_count, attachment_count)."""
        if not day_ids:
            return {}
        out: dict[str, tuple[int, int, int]] = {d: (0, 0, 0) for d in day_ids}

        trade_rows = await self.session.execute(
            select(TradingJournalTrade.journal_day_id, func.count())
            .where(
                TradingJournalTrade.journal_day_id.in_(day_ids),
                TradingJournalTrade.deleted_at.is_(None),
            )
            .group_by(TradingJournalTrade.journal_day_id)
        )
        section_rows = await self.session.execute(
            select(TradingJournalDaySection.journal_day_id, func.count())
            .where(
                TradingJournalDaySection.journal_day_id.in_(day_ids),
                TradingJournalDaySection.deleted_at.is_(None),
            )
            .group_by(TradingJournalDaySection.journal_day_id)
        )
        att_rows = await self.session.execute(
            select(TradingJournalAttachment.journal_day_id, func.count())
            .where(
                TradingJournalAttachment.journal_day_id.in_(day_ids),
                TradingJournalAttachment.deleted_at.is_(None),
            )
            .group_by(TradingJournalAttachment.journal_day_id)
        )

        trades = {str(d): int(c) for d, c in trade_rows.all()}
        sections = {str(d): int(c) for d, c in section_rows.all()}
        atts = {str(d): int(c) for d, c in att_rows.all()}
        for day_id in day_ids:
            out[day_id] = (
                trades.get(day_id, 0),
                sections.get(day_id, 0),
                atts.get(day_id, 0),
            )
        return out

    async def clear_children(self, day: TradingJournalDay) -> None:
        """Hard-delete child rows so a re-parse can rewrite structure."""
        for section in list(day.sections):
            await self.session.delete(section)
        for trade in list(day.trades):
            for section in list(trade.sections):
                await self.session.delete(section)
            for att in list(trade.attachments):
                await self.session.delete(att)
            await self.session.delete(trade)
        for att in list(day.attachments):
            await self.session.delete(att)
        await self.session.flush()
        day.sections.clear()
        day.trades.clear()
        day.attachments.clear()

    async def get_attachment_owned(
        self, user_id: str, attachment_id: str
    ) -> TradingJournalAttachment | None:
        stmt = select(TradingJournalAttachment).where(
            TradingJournalAttachment.id == attachment_id,
            TradingJournalAttachment.user_id == user_id,
            TradingJournalAttachment.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def list_attachments_for_user(
        self, user_id: str, *, limit: int = 500
    ) -> list[TradingJournalAttachment]:
        stmt = (
            select(TradingJournalAttachment)
            .where(
                TradingJournalAttachment.user_id == user_id,
                TradingJournalAttachment.deleted_at.is_(None),
            )
            .order_by(TradingJournalAttachment.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def list_trades_for_user(
        self,
        user_id: str,
        *,
        journal_day_id: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 2000,
    ) -> list[TradingJournalTrade]:
        stmt = (
            select(TradingJournalTrade)
            .where(
                TradingJournalTrade.user_id == user_id,
                TradingJournalTrade.deleted_at.is_(None),
            )
            .options(
                selectinload(TradingJournalTrade.sections),
                selectinload(TradingJournalTrade.journal_day),
            )
            .order_by(TradingJournalTrade.created_at.asc())
            .limit(limit)
        )
        if journal_day_id:
            stmt = stmt.where(TradingJournalTrade.journal_day_id == journal_day_id)
        if date_from is not None or date_to is not None:
            stmt = stmt.join(TradingJournalDay, TradingJournalTrade.journal_day_id == TradingJournalDay.id)
            if date_from is not None:
                stmt = stmt.where(TradingJournalDay.journal_date >= date_from)
            if date_to is not None:
                stmt = stmt.where(TradingJournalDay.journal_date <= date_to)
        return list(await self.session.scalars(stmt))

    async def get_trade_owned(
        self, user_id: str, trade_id: str
    ) -> TradingJournalTrade | None:
        stmt = (
            select(TradingJournalTrade)
            .where(
                TradingJournalTrade.id == trade_id,
                TradingJournalTrade.user_id == user_id,
                TradingJournalTrade.deleted_at.is_(None),
            )
            .options(
                selectinload(TradingJournalTrade.sections),
                selectinload(TradingJournalTrade.attachments),
                selectinload(TradingJournalTrade.journal_day),
            )
        )
        return await self.session.scalar(stmt)


class TradingJournalParseRunRepository(BaseRepository[TradingJournalParseRun]):
    model = TradingJournalParseRun


__all__ = [
    "TradingJournalDayRepository",
    "TradingJournalParseRunRepository",
    "TradingJournalDay",
    "TradingJournalDaySection",
    "TradingJournalTrade",
    "TradingJournalTradeSection",
    "TradingJournalAttachment",
    "TradingJournalParseRun",
]
