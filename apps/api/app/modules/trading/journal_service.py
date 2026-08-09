"""Read use-cases for structured trading day journals (M3+) and media sync (M5).

M6: journal-native analytics + promote journal trades into the Trade Log ledger.
"""

from __future__ import annotations

import re
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError, NotFoundError
from app.modules.trading.journal_bridge import (
    classify_outcome,
    clean_instrument,
    compute_journal_rupee_pnl,
    ledger_grade,
    promote_ready,
    quantity_or_default,
    resolve_exit_price,
)
from app.modules.trading.journal_media import (
    build_vault_index,
    copy_attachment_from_vault,
)
from app.modules.trading.journal_models import (
    AttachmentImportStatus,
    DaySectionKey,
    JournalParseStatus,
    JournalPublishStatus,
    JournalSource,
    TradeSectionKey,
    TradingJournalAttachment,
    TradingJournalDay,
    TradingJournalDaySection,
    TradingJournalTrade,
    TradingJournalTradeSection,
)
from app.modules.trading.journal_repository import TradingJournalDayRepository
from app.modules.trading.models import Trade, TradeDirection, TradeStatus
from app.modules.trading.repository import TradeRepository, soft_delete
from app.modules.trading.schemas import (
    JournalAnalyticsOut,
    JournalAttachmentOut,
    JournalCountStat,
    JournalDayCreate,
    JournalDayOut,
    JournalDayRatingPoint,
    JournalDaySectionOut,
    JournalDaySummaryOut,
    JournalDayUpdate,
    JournalMediaSyncReport,
    JournalPromoteItem,
    JournalPromoteReport,
    JournalPromoteRequest,
    JournalSetupStat,
    JournalTradeOut,
    JournalTradeSectionOut,
)
from app.modules.trading.service import compute_pnl


def _csv_to_tags(tags_csv: str | None) -> list[str]:
    if not tags_csv:
        return []
    return [t for t in tags_csv.split(",") if t]


def _tags_to_csv(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    cleaned = [t.strip() for t in tags if t and t.strip()]
    return ",".join(cleaned[:40]) if cleaned else None


_DEFAULT_DAY_SECTIONS: list[tuple[DaySectionKey, str]] = [
    (DaySectionKey.MARKET_CONTEXT, "Market Context"),
    (DaySectionKey.PRE_MARKET, "Pre-Market Plan"),
    (DaySectionKey.TRADING_PLAN, "Trading Plan"),
    (DaySectionKey.PSYCHOLOGY, "Psychology"),
    (DaySectionKey.MISTAKES, "Mistakes"),
    (DaySectionKey.LESSONS, "Lessons Learned"),
    (DaySectionKey.ACTION_ITEMS, "Action Items for Tomorrow"),
]


def _enum_str(value: object) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _alive(rows: list) -> list:
    return [r for r in rows if getattr(r, "deleted_at", None) is None]


# Soft-deleted rows still occupy UNIQUE(journal_day_id, trade_index).
# Park them far above the live sequence so alive trades can be 1..n.
_DELETED_INDEX_BASE = 10_000_000


class JournalService:
    def __init__(
        self,
        *,
        journals: TradingJournalDayRepository,
        trades: TradeRepository,
        settings: Settings,
    ) -> None:
        self.journals = journals
        self.trades = trades
        self.settings = settings

    async def _compact_trade_indices(self, day: TradingJournalDay) -> None:
        """Renumber alive trades to 1..n; park soft-deleted indices out of the way."""
        all_trades = list(day.trades or [])
        if not all_trades:
            return
        alive = sorted(_alive(all_trades), key=lambda t: t.trade_index)
        deleted = [t for t in all_trades if getattr(t, "deleted_at", None) is not None]

        # Desired layout already matches — skip.
        if (
            [t.trade_index for t in alive] == list(range(1, len(alive) + 1))
            and all(t.trade_index >= _DELETED_INDEX_BASE for t in deleted)
        ):
            return

        # Two-phase update avoids UNIQUE(journal_day_id, trade_index) collisions.
        temp_base = _DELETED_INDEX_BASE + 500_000
        for i, t in enumerate(all_trades):
            t.trade_index = temp_base + i
        await self.journals.session.flush()

        for i, t in enumerate(alive, start=1):
            t.trade_index = i
        for i, t in enumerate(deleted):
            t.trade_index = _DELETED_INDEX_BASE + i
        await self.journals.session.flush()

    async def list_days(
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
    ) -> list[JournalDaySummaryOut]:
        days = await self.journals.list_for_user(
            user_id,
            date_from=date_from,
            date_to=date_to,
            parse_status=parse_status,
            favorite_only=favorite_only,
            q=q,
            limit=limit,
            offset=offset,
            with_relations=False,
        )
        counts = await self.journals.counts_for_days([d.id for d in days])
        return [self._to_summary(day, counts.get(day.id, (0, 0, 0))) for day in days]

    async def get_day(self, user_id: str, journal_id: str) -> JournalDayOut:
        day = await self.journals.get_owned(user_id, journal_id)
        if day is None:
            raise NotFoundError("Journal day not found")
        return self._to_detail(day)

    async def get_day_by_date(self, user_id: str, journal_date: date) -> JournalDayOut:
        day = await self.journals.get_by_date(user_id, journal_date)
        if day is None:
            raise NotFoundError("Journal day not found")
        return self._to_detail(day)

    async def create_day(self, user_id: str, body: JournalDayCreate) -> JournalDayOut:
        existing = await self.journals.get_by_date(user_id, body.journal_date, include_deleted=True)
        if existing is not None and existing.deleted_at is None:
            raise ConflictError(
                f"A journal already exists for {body.journal_date.isoformat()}",
                details={"existing_id": existing.id, "journal_date": body.journal_date.isoformat()},
            )

        publish = (
            JournalPublishStatus.PUBLISHED
            if (body.publish_status or "").lower() == "published"
            else JournalPublishStatus.DRAFT
        )
        title = (body.title or f"Trading Journal {body.journal_date.isoformat()}").strip()[:255]

        if existing is not None and existing.deleted_at is not None:
            day = existing
            day.deleted_at = None
            day.title = title
            day.source = JournalSource.NATIVE
            day.market = body.market
            day.primary_instrument = body.primary_instrument
            day.day_bias = body.day_bias
            day.day_result = body.day_result
            day.day_pnl = body.day_pnl
            day.overall_grade = body.overall_grade
            day.tags_csv = _tags_to_csv(body.tags)
            day.parse_status = JournalParseStatus.PARTIAL
            day.publish_status = publish
            day.workspace_meta_json = body.workspace_meta_json
            day.raw_markdown = day.raw_markdown or ""
            await self.journals.clear_children(day)
            day_id = day.id
        else:
            day_id = str(uuid.uuid4())
            day = TradingJournalDay(
                id=day_id,
                user_id=user_id,
                journal_date=body.journal_date,
                title=title,
                source=JournalSource.NATIVE,
                market=body.market,
                primary_instrument=body.primary_instrument,
                day_bias=body.day_bias,
                day_result=body.day_result,
                day_pnl=body.day_pnl,
                overall_grade=body.overall_grade,
                tags_csv=_tags_to_csv(body.tags),
                parse_status=JournalParseStatus.PARTIAL,
                publish_status=publish,
                workspace_meta_json=body.workspace_meta_json,
                raw_markdown="",
                sections=[],
                trades=[],
                attachments=[],
            )
            await self.journals.add(day)

        day.sections = [
            TradingJournalDaySection(
                id=str(uuid.uuid4()),
                user_id=user_id,
                journal_day_id=day_id,
                section_key=key,
                heading_original=heading,
                body_markdown="",
                sort_order=i,
            )
            for i, (key, heading) in enumerate(_DEFAULT_DAY_SECTIONS)
        ]
        await self.journals.session.flush()
        refreshed = await self.journals.get_owned(user_id, day_id)
        assert refreshed is not None
        return self._to_detail(refreshed)

    async def update_day(self, user_id: str, journal_id: str, body: JournalDayUpdate) -> JournalDayOut:
        day = await self.journals.get_owned(user_id, journal_id)
        if day is None:
            raise NotFoundError("Journal day not found")

        data = body.model_dump(exclude_unset=True)
        sections_payload = data.pop("sections", None)
        trades_payload = data.pop("trades", None)
        tags_payload = data.pop("tags", None)
        publish_raw = data.pop("publish_status", None)

        for key, value in data.items():
            setattr(day, key, value)

        if tags_payload is not None:
            day.tags_csv = _tags_to_csv(tags_payload)

        if publish_raw is not None:
            day.publish_status = (
                JournalPublishStatus.PUBLISHED
                if str(publish_raw).lower() == "published"
                else JournalPublishStatus.DRAFT
            )

        if sections_payload is not None:
            alive_sections = _alive(list(day.sections or []))
            by_id = {s.id: s for s in alive_sections}
            by_key: dict[str, TradingJournalDaySection] = {}
            for s in alive_sections:
                key = _enum_str(s.section_key)
                by_key.setdefault(key, s)

            next_sort = max((s.sort_order for s in alive_sections), default=-1) + 1
            for item in sections_payload:
                row = None
                sid = item.get("id")
                skey = item.get("section_key")
                if sid and sid in by_id:
                    row = by_id[sid]
                elif skey and skey in by_key:
                    row = by_key[skey]
                elif skey:
                    try:
                        enum_key = DaySectionKey(skey)
                    except ValueError:
                        enum_key = DaySectionKey.UNCATEGORIZED
                    row = TradingJournalDaySection(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        journal_day_id=day.id,
                        section_key=enum_key,
                        heading_original=item.get("heading_original") or skey.replace("_", " ").title(),
                        body_markdown="",
                        sort_order=next_sort,
                    )
                    next_sort += 1
                    day.sections.append(row)
                    by_key[skey] = row
                if row is None:
                    continue
                if "body_markdown" in item and item["body_markdown"] is not None:
                    row.body_markdown = item["body_markdown"]
                if "heading_original" in item and item["heading_original"] is not None:
                    row.heading_original = item["heading_original"]

        if trades_payload is not None:
            all_trades = list(day.trades or [])
            trade_by_id = {t.id: t for t in _alive(all_trades)}
            trade_by_id_including_deleted = {t.id: t for t in all_trades}
            # Prefer next index from alive trades; soft-deleted rows may still hold old indices.
            alive_max = max((t.trade_index for t in _alive(all_trades)), default=0)
            next_index = alive_max + 1
            occupied = {t.trade_index for t in all_trades}

            def _claim_next_index() -> int:
                nonlocal next_index, occupied
                while next_index in occupied:
                    blocker = next(
                        (t for t in all_trades if t.trade_index == next_index),
                        None,
                    )
                    if blocker is not None and getattr(blocker, "deleted_at", None) is not None:
                        # Move soft-deleted occupant out of the live sequence
                        free = max(occupied) + 1
                        blocker.trade_index = free
                        occupied.add(free)
                        occupied.discard(next_index)
                        break
                    next_index += 1
                claimed = next_index
                occupied.add(claimed)
                next_index = claimed + 1
                return claimed

            for item in trades_payload:
                trade_id = item.get("id")
                trade = trade_by_id.get(trade_id) if trade_id else None
                trade_sections = item.pop("sections", None)
                # Clients may send display order; apply only after create/update via compact.
                item.pop("trade_index", None)
                if trade is None and trade_id and trade_id in trade_by_id_including_deleted:
                    # Revive a previously soft-deleted trade instead of inserting a duplicate index
                    trade = trade_by_id_including_deleted[trade_id]
                    trade.deleted_at = None
                    for section in list(trade.sections or []):
                        if getattr(section, "deleted_at", None) is not None:
                            section.deleted_at = None
                    trade_by_id[trade.id] = trade
                if trade is None and trade_id:
                    existing = await self.journals.session.get(TradingJournalTrade, trade_id)
                    if (
                        existing is not None
                        and existing.journal_day_id == day.id
                        and existing.user_id == user_id
                    ):
                        trade = existing
                        trade.deleted_at = None
                        for section in list(trade.sections or []):
                            if getattr(section, "deleted_at", None) is not None:
                                section.deleted_at = None
                        trade_by_id[trade.id] = trade
                        trade_by_id_including_deleted[trade.id] = trade
                        if trade not in all_trades:
                            day.trades.append(trade)
                if trade is None:
                    # Native Create Journal / editor: create trade when id is new
                    trade = TradingJournalTrade(
                        id=trade_id or str(uuid.uuid4()),
                        user_id=user_id,
                        journal_day_id=day.id,
                        trade_index=_claim_next_index(),
                        instrument=item.get("instrument"),
                        quantity=item.get("quantity"),
                        entry_price=item.get("entry_price"),
                        exit_price=item.get("exit_price"),
                        stop_price=item.get("stop_price"),
                        result=item.get("result"),
                        pnl=item.get("pnl"),
                        setup=item.get("setup"),
                        grade=item.get("grade"),
                        raw_markdown="",
                    )
                    direction_val = item.get("direction")
                    if direction_val is not None:
                        raw = getattr(direction_val, "value", direction_val)
                        trade.direction = TradeDirection(str(raw).lower())
                    day.trades.append(trade)
                    all_trades.append(trade)
                    trade_by_id[trade.id] = trade
                    trade_by_id_including_deleted[trade.id] = trade
                else:
                    for key, value in item.items():
                        if key == "id":
                            continue
                        if key == "direction":
                            if value is None:
                                trade.direction = None
                            else:
                                # schemas.TradeDirection ≠ models.TradeDirection — normalize via .value
                                raw = getattr(value, "value", value)
                                trade.direction = TradeDirection(str(raw).lower())
                            continue
                        setattr(trade, key, value)

                # Auto-fill P&L when prices exist and client left pnl empty
                if trade.pnl is None and trade.entry_price is not None and trade.exit_price is not None and trade.quantity is not None:
                    direction = trade.direction or TradeDirection.LONG
                    gross, net, _ = compute_pnl(
                        direction=direction,
                        quantity=trade.quantity,
                        entry=trade.entry_price,
                        exit_price=trade.exit_price,
                        fees=Decimal("0"),
                        risk_amount=None,
                    )
                    trade.pnl = net

                if trade_sections is not None:
                    alive_secs = _alive(list(trade.sections or []))
                    sec_by_id = {s.id: s for s in alive_secs}
                    sec_by_key: dict[str, TradingJournalTradeSection] = {}
                    for s in alive_secs:
                        sec_by_key.setdefault(_enum_str(s.section_key), s)
                    next_sec_sort = max((s.sort_order for s in alive_secs), default=-1) + 1
                    for sec in trade_sections:
                        row = None
                        sid = sec.get("id")
                        skey = sec.get("section_key")
                        if sid and sid in sec_by_id:
                            row = sec_by_id[sid]
                        elif skey and skey in sec_by_key:
                            row = sec_by_key[skey]
                        elif skey:
                            try:
                                enum_key = TradeSectionKey(skey)
                            except ValueError:
                                enum_key = TradeSectionKey.UNCATEGORIZED
                            row = TradingJournalTradeSection(
                                id=str(uuid.uuid4()),
                                user_id=user_id,
                                journal_trade_id=trade.id,
                                section_key=enum_key,
                                heading_original=sec.get("heading_original")
                                or skey.replace("_", " ").title(),
                                body_markdown="",
                                sort_order=next_sec_sort,
                            )
                            next_sec_sort += 1
                            if trade.sections is None:
                                trade.sections = []
                            trade.sections.append(row)
                            sec_by_key[skey] = row
                            sec_by_id[row.id] = row
                        if row is None:
                            continue
                        if "body_markdown" in sec and sec["body_markdown"] is not None:
                            row.body_markdown = sec["body_markdown"]
                        if "heading_original" in sec and sec["heading_original"] is not None:
                            row.heading_original = sec["heading_original"]

            if trades_payload is not None:
                await self._compact_trade_indices(day)
                # Always keep day_pnl in sync with alive trade P&Ls (client netPnl can be stale/empty)
                pnls = [
                    t.pnl
                    for t in _alive(list(day.trades or []))
                    if t.pnl is not None
                ]
                day.day_pnl = sum(pnls, Decimal("0")) if pnls else Decimal("0")
            elif data.get("day_pnl") is None:
                pnls = [
                    t.pnl
                    for t in _alive(list(day.trades or []))
                    if t.pnl is not None
                ]
                if pnls:
                    day.day_pnl = sum(pnls, Decimal("0"))

        await self.journals.session.flush()
        refreshed = await self.journals.get_owned(user_id, journal_id)
        assert refreshed is not None
        return self._to_detail(refreshed)

    async def delete_journal_trade(self, user_id: str, trade_id: str) -> JournalDayOut:
        """Soft-delete a journal trade (and its linked ledger row, if any)."""
        trade = await self.journals.get_trade_owned(user_id, trade_id)
        if trade is None:
            raise NotFoundError("Journal trade not found")

        day_id = trade.journal_day_id
        ledger_id = trade.ledger_trade_id

        soft_delete(trade)
        for section in _alive(list(trade.sections or [])):
            soft_delete(section)
        for att in _alive(list(trade.attachments or [])):
            soft_delete(att)

        if ledger_id:
            ledger = await self.trades.get_by_id(ledger_id)
            if ledger is not None and ledger.user_id == user_id and ledger.deleted_at is None:
                soft_delete(ledger)

        await self.journals.session.flush()

        day = await self.journals.get_owned(user_id, day_id)
        if day is None:
            raise NotFoundError("Journal day not found")

        # Keep Trade #1..n contiguous after deletes (soft-deleted rows keep UNIQUE slots).
        await self._compact_trade_indices(day)

        # Recalculate day P&L from remaining trades
        pnls = [t.pnl for t in _alive(list(day.trades or [])) if t.pnl is not None]
        day.day_pnl = sum(pnls, Decimal("0")) if pnls else None
        await self.journals.session.flush()

        refreshed = await self.journals.get_owned(user_id, day_id)
        assert refreshed is not None
        return self._to_detail(refreshed)

    async def delete_day(self, user_id: str, journal_id: str) -> None:
        """Soft-delete a journal day and all nested trades/sections/attachments."""
        day = await self.journals.get_owned(user_id, journal_id)
        if day is None:
            raise NotFoundError("Journal day not found")

        for section in _alive(list(day.sections or [])):
            soft_delete(section)

        for trade in _alive(list(day.trades or [])):
            soft_delete(trade)
            for section in _alive(list(trade.sections or [])):
                soft_delete(section)
            for att in _alive(list(trade.attachments or [])):
                soft_delete(att)
            ledger_id = trade.ledger_trade_id
            if ledger_id:
                ledger = await self.trades.get_by_id(ledger_id)
                if ledger is not None and ledger.user_id == user_id and ledger.deleted_at is None:
                    soft_delete(ledger)

        for att in _alive(list(day.attachments or [])):
            soft_delete(att)

        soft_delete(day)
        await self.journals.session.flush()

    async def upload_attachment(
        self,
        user_id: str,
        journal_id: str,
        *,
        file_name: str,
        content_type: str,
        data: bytes,
        caption: str | None = None,
        journal_trade_id: str | None = None,
    ) -> JournalAttachmentOut:
        """Store an uploaded screenshot for a native Create Journal day/trade."""
        day = await self.journals.get_owned(user_id, journal_id)
        if day is None:
            raise NotFoundError("Journal day not found")

        if journal_trade_id:
            trade = await self.journals.get_trade_owned(user_id, journal_trade_id)
            if trade is None or trade.journal_day_id != journal_id:
                raise NotFoundError("Journal trade not found")

        media_root = Path(self.settings.media_root)
        dest_dir = media_root / "trading_journals" / user_id / journal_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        safe_name = Path(file_name).name or "screenshot.png"
        dest = dest_dir / f"{uuid.uuid4().hex}_{safe_name}"
        dest.write_bytes(data)

        day_atts = _alive(list(day.attachments or []))
        trade_atts = [
            a
            for t in _alive(list(day.trades or []))
            for a in _alive(list(t.attachments or []))
        ]
        next_sort = max((a.sort_order for a in [*day_atts, *trade_atts]), default=-1) + 1

        att = TradingJournalAttachment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            journal_day_id=journal_id,
            journal_trade_id=journal_trade_id,
            obsidian_ref=safe_name,
            file_name=safe_name,
            storage_path=str(dest),
            mime_type=content_type or "application/octet-stream",
            caption=(caption or "")[:255] or None,
            sort_order=next_sort,
            import_status=AttachmentImportStatus.COPIED,
        )
        if day.attachments is None:
            day.attachments = []
        day.attachments.append(att)
        await self.journals.session.flush()
        return self._to_attachment(att)

    async def get_attachment_file(
        self, user_id: str, attachment_id: str
    ) -> TradingJournalAttachment:
        row = await self.journals.get_attachment_owned(user_id, attachment_id)
        if row is None:
            raise NotFoundError("Attachment not found")
        if _enum_str(row.import_status) != "copied" or not row.storage_path:
            raise NotFoundError("Attachment file not available — sync media first")
        path = Path(row.storage_path)
        if not path.is_file():
            media_root = Path(self.settings.media_root)
            candidates = (
                Path.cwd() / path,
                media_root / path,
                media_root / path.name,
                Path.cwd() / "data" / "media" / path.name,
            )
            if not any(c.is_file() for c in candidates):
                raise NotFoundError("Attachment file missing on disk")
        return row

    async def sync_media(self, user_id: str) -> JournalMediaSyncReport:
        vault_raw = (self.settings.obsidian_vault_path or "").strip()
        vault_root = Path(vault_raw).expanduser() if vault_raw else None
        configured = bool(vault_root and vault_root.is_dir())
        if not configured:
            raise DomainError("OBSIDIAN_VAULT_PATH is not configured or missing")

        assert vault_root is not None
        index = build_vault_index(vault_root)
        media_root = Path(self.settings.media_root)
        rows = await self.journals.list_attachments_for_user(user_id)
        copied = missing = already = 0
        for att in rows:
            before = att.import_status
            had_file = bool(att.storage_path and Path(att.storage_path).is_file())
            status = copy_attachment_from_vault(
                att,
                vault_root=vault_root,
                media_root=media_root,
                user_id=user_id,
                index=index,
            )
            if status == AttachmentImportStatus.COPIED:
                if before == AttachmentImportStatus.COPIED and had_file:
                    already += 1
                else:
                    copied += 1
            elif status == AttachmentImportStatus.MISSING:
                missing += 1
        await self.journals.session.flush()
        return JournalMediaSyncReport(
            scanned=len(rows),
            copied=copied,
            missing=missing,
            already_copied=already,
            vault_configured=True,
        )

    async def analytics(
        self,
        user_id: str,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> JournalAnalyticsOut:
        days = await self.journals.list_for_user(
            user_id,
            date_from=date_from,
            date_to=date_to,
            limit=500,
            with_relations=False,
        )
        trades = await self.journals.list_trades_for_user(
            user_id,
            date_from=date_from,
            date_to=date_to,
        )
        counts = await self.journals.counts_for_days([d.id for d in days])

        outcomes = Counter(classify_outcome(t) for t in trades)
        wins = outcomes.get("win", 0)
        losses = outcomes.get("loss", 0)
        scratches = outcomes.get("scratch", 0)
        unknowns = outcomes.get("unknown", 0)
        classified = wins + losses
        win_rate = round((wins / classified) * 100, 1) if classified else None

        dqs_vals = [t.dqs_score for t in trades if t.dqs_score is not None]
        avg_dqs = round(sum(dqs_vals) / len(dqs_vals), 2) if dqs_vals else None

        promote_n = sum(1 for t in trades if promote_ready(t)[0])
        linked_n = sum(1 for t in trades if t.ledger_trade_id)

        grade_c = Counter((t.grade or "").strip() for t in trades if t.grade)
        day_grade_c = Counter((d.overall_grade or "").strip() for d in days if d.overall_grade)
        dir_c = Counter(_enum_str(t.direction) for t in trades if t.direction is not None)

        setup_bucket: dict[str, dict[str, int]] = defaultdict(
            lambda: {"count": 0, "wins": 0, "losses": 0, "unknowns": 0}
        )
        for t in trades:
            setup = (t.setup or "Unspecified").strip() or "Unspecified"
            setup_bucket[setup]["count"] += 1
            outcome = classify_outcome(t)
            if outcome == "win":
                setup_bucket[setup]["wins"] += 1
            elif outcome == "loss":
                setup_bucket[setup]["losses"] += 1
            else:
                setup_bucket[setup]["unknowns"] += 1

        inst_c: Counter[str] = Counter()
        for t in trades:
            cleaned = clean_instrument(t.instrument)
            if cleaned:
                inst_c[cleaned] += 1

        mistake_sections = 0
        for t in trades:
            for s in _alive(list(t.sections or [])):
                key = _enum_str(s.section_key)
                if key == "mistakes" and (s.body_markdown or "").strip():
                    mistake_sections += 1
                    break

        day_ratings = [
            JournalDayRatingPoint(
                date=d.journal_date,
                rating=d.daily_rating,
                overall_grade=d.overall_grade,
                trade_count=counts.get(d.id, (0, 0, 0))[0],
            )
            for d in sorted(days, key=lambda x: x.journal_date)
        ]

        return JournalAnalyticsOut(
            days_count=len(days),
            trades_count=len(trades),
            wins=wins,
            losses=losses,
            scratches=scratches,
            unknowns=unknowns,
            classified_win_rate=win_rate,
            avg_dqs=avg_dqs,
            promote_ready=promote_n,
            already_linked=linked_n,
            by_grade=[
                JournalCountStat(key=k, count=v)
                for k, v in sorted(grade_c.items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            by_day_grade=[
                JournalCountStat(key=k, count=v)
                for k, v in sorted(day_grade_c.items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            by_direction=[
                JournalCountStat(key=k, count=v)
                for k, v in sorted(dir_c.items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            by_setup=[
                JournalSetupStat(
                    setup=k,
                    count=v["count"],
                    wins=v["wins"],
                    losses=v["losses"],
                    unknowns=v["unknowns"],
                )
                for k, v in sorted(setup_bucket.items(), key=lambda kv: (-kv[1]["count"], kv[0]))
            ],
            by_instrument=[
                JournalCountStat(key=k, count=v)
                for k, v in sorted(inst_c.items(), key=lambda kv: (-kv[1], kv[0]))[:12]
            ],
            mistake_sections=mistake_sections,
            day_ratings=day_ratings,
        )

    async def promote_to_ledger(
        self, user_id: str, body: JournalPromoteRequest
    ) -> JournalPromoteReport:
        if body.journal_trade_ids:
            trades: list[TradingJournalTrade] = []
            for tid in body.journal_trade_ids:
                row = await self.journals.get_trade_owned(user_id, tid)
                if row is not None:
                    trades.append(row)
        else:
            trades = await self.journals.list_trades_for_user(
                user_id, journal_day_id=body.journal_day_id
            )

        items: list[JournalPromoteItem] = []
        created = skipped = failed = 0

        for trade in trades:
            day = trade.journal_day
            journal_date = day.journal_date if day is not None else None
            instrument = clean_instrument(trade.instrument)
            ok, reason = promote_ready(trade)
            if not ok:
                skipped += 1
                items.append(
                    JournalPromoteItem(
                        journal_trade_id=trade.id,
                        journal_date=journal_date,
                        instrument=instrument,
                        action="skipped",
                        detail=reason,
                        ledger_trade_id=trade.ledger_trade_id,
                    )
                )
                continue

            assert trade.direction is not None
            assert trade.entry_price is not None
            assert instrument is not None

            if body.dry_run:
                created += 1
                items.append(
                    JournalPromoteItem(
                        journal_trade_id=trade.id,
                        journal_date=journal_date,
                        instrument=instrument,
                        action="would_create",
                        detail="Ready to promote",
                    )
                )
                continue

            try:
                ledger_id = await self._create_ledger_trade(user_id, trade, instrument)
                trade.ledger_trade_id = ledger_id
                created += 1
                items.append(
                    JournalPromoteItem(
                        journal_trade_id=trade.id,
                        journal_date=journal_date,
                        instrument=instrument,
                        action="created",
                        detail="Linked to Trade Log",
                        ledger_trade_id=ledger_id,
                    )
                )
            except Exception as exc:  # noqa: BLE001 — report per-row failures
                failed += 1
                items.append(
                    JournalPromoteItem(
                        journal_trade_id=trade.id,
                        journal_date=journal_date,
                        instrument=instrument,
                        action="failed",
                        detail=str(exc)[:240],
                    )
                )

        if not body.dry_run:
            await self.journals.session.flush()

        return JournalPromoteReport(
            dry_run=body.dry_run,
            scanned=len(trades),
            created=created,
            skipped=skipped,
            failed=failed,
            items=items,
        )

    async def _create_ledger_trade(
        self, user_id: str, trade: TradingJournalTrade, instrument: str
    ) -> str:
        day = trade.journal_day
        journal_date = day.journal_date if day is not None else date.today()
        opened_at = datetime.combine(journal_date, time(9, 15), tzinfo=timezone.utc)

        direction = (
            trade.direction
            if isinstance(trade.direction, TradeDirection)
            else TradeDirection(_enum_str(trade.direction))
        )
        qty = quantity_or_default(trade)
        # Bought CE/PE premiums: always use LONG math for (exit−entry)×qty
        instrument_u = instrument.upper()
        is_option_buy = bool(re.search(r"\b(CE|PE)\b", instrument_u))
        if is_option_buy and direction == TradeDirection.SHORT:
            direction = TradeDirection.LONG

        exit_price = resolve_exit_price(trade)
        status = TradeStatus.CLOSED if exit_price is not None or trade.result else TradeStatus.OPEN
        closed_at = (
            datetime.combine(journal_date, time(15, 30), tzinfo=timezone.utc)
            if status == TradeStatus.CLOSED
            else None
        )

        thesis = None
        review_bits = [
            f"Promoted from Day Journal {journal_date.isoformat()} trade #{trade.trade_index}",
            f"journal_trade_id={trade.id}",
        ]
        if trade.result:
            review_bits.append(f"Result: {trade.result}")
        if trade.grade:
            review_bits.append(f"Journal grade: {trade.grade}")
        for s in sorted(_alive(list(trade.sections or [])), key=lambda x: x.sort_order):
            key = _enum_str(s.section_key)
            body = (s.body_markdown or "").strip()
            if not body:
                continue
            if key in {"entry_logic", "trade_setup"} and thesis is None:
                thesis = body[:2000]
            if key == "mistakes":
                review_bits.append(f"Mistakes:\n{body[:1500]}")

        gross = net = r_mult = None
        entry = trade.entry_price
        # Guard: concatenated parse bugs like 163167 from "Above 163 (Executed around 167)"
        entry_insane = entry is not None and entry > Decimal("5000")
        if exit_price is not None and entry is not None and not entry_insane:
            gross, net, r_mult = compute_pnl(
                direction=direction,
                quantity=qty,
                entry=entry,
                exit_price=exit_price,
                fees=Decimal("0"),
                risk_amount=None,
            )

        rupee = compute_journal_rupee_pnl(trade)
        if rupee is not None and (
            entry_insane
            or net is None
            or (net is not None and abs(net) > abs(rupee) * Decimal("50") and abs(net) > Decimal("10000"))
        ):
            net = rupee
            gross = rupee
        elif trade.pnl is not None and net is None:
            net = trade.pnl
            gross = trade.pnl
        setup = (trade.setup or "")[:64] or None
        ledger = Trade(
            id=str(uuid.uuid4()),
            user_id=user_id,
            instrument=instrument.upper(),
            direction=direction,
            quantity=qty,
            entry_price=entry if not entry_insane else None,
            exit_price=exit_price,
            opened_at=opened_at,
            closed_at=closed_at,
            fees=Decimal("0"),
            stop_price=trade.stop_price,
            risk_amount=None,
            r_multiple=r_mult,
            pnl_gross=gross,
            pnl_net=net if net is not None else trade.pnl,
            setup=setup,
            thesis=thesis,
            status=status,
            grade=ledger_grade(trade.grade),
            followed_plan=None,
            emotion_before=None,
            emotion_after=None,
            psychology_notes=None,
            review_notes="\n".join(review_bits),
            tags_csv="journal,obsidian",
        )
        await self.trades.add(ledger)
        return ledger.id

    def _to_summary(
        self, day: TradingJournalDay, counts: tuple[int, int, int]
    ) -> JournalDaySummaryOut:
        trades, sections, attachments = counts
        return JournalDaySummaryOut(
            id=day.id,
            journal_date=day.journal_date,
            title=day.title,
            source=_enum_str(day.source),
            parse_status=_enum_str(day.parse_status),
            publish_status=_enum_str(getattr(day, "publish_status", None) or "published"),
            market=day.market,
            primary_instrument=day.primary_instrument,
            day_bias=day.day_bias,
            day_result=day.day_result,
            day_pnl=day.day_pnl,
            daily_rating=day.daily_rating,
            overall_grade=day.overall_grade,
            is_favorite=bool(day.is_favorite),
            tags=_csv_to_tags(day.tags_csv),
            vault_path=day.vault_path,
            knowledge_note_id=day.knowledge_note_id,
            trade_count=trades,
            section_count=sections,
            attachment_count=attachments,
            created_at=day.created_at,
            updated_at=day.updated_at,
        )

    def _to_detail(self, day: TradingJournalDay) -> JournalDayOut:
        sections = sorted(_alive(list(day.sections or [])), key=lambda s: s.sort_order)
        trades = sorted(_alive(list(day.trades or [])), key=lambda t: t.trade_index)
        day_atts = sorted(
            [
                a
                for a in _alive(list(day.attachments or []))
                if a.journal_trade_id is None
            ],
            key=lambda a: a.sort_order,
        )
        trade_outs = [self._to_trade(t) for t in trades]
        nested_att_count = sum(len(t.attachments) for t in trade_outs)
        return JournalDayOut(
            id=day.id,
            journal_date=day.journal_date,
            title=day.title,
            source=_enum_str(day.source),
            parse_status=_enum_str(day.parse_status),
            publish_status=_enum_str(getattr(day, "publish_status", None) or "published"),
            market=day.market,
            primary_instrument=day.primary_instrument,
            day_bias=day.day_bias,
            day_result=day.day_result,
            day_pnl=day.day_pnl,
            daily_rating=day.daily_rating,
            overall_grade=day.overall_grade,
            is_favorite=bool(day.is_favorite),
            tags=_csv_to_tags(day.tags_csv),
            vault_path=day.vault_path,
            knowledge_note_id=day.knowledge_note_id,
            content_hash=day.content_hash,
            raw_markdown=day.raw_markdown or "",
            uncategorized_markdown=day.uncategorized_markdown,
            workspace_meta_json=getattr(day, "workspace_meta_json", None),
            trade_count=len(trade_outs),
            section_count=len(sections),
            attachment_count=len(day_atts) + nested_att_count,
            sections=[self._to_day_section(s) for s in sections],
            trades=trade_outs,
            attachments=[self._to_attachment(a) for a in day_atts],
            created_at=day.created_at,
            updated_at=day.updated_at,
        )

    def _to_day_section(self, section: TradingJournalDaySection) -> JournalDaySectionOut:
        return JournalDaySectionOut(
            id=section.id,
            section_key=_enum_str(section.section_key),
            heading_original=section.heading_original,
            body_markdown=section.body_markdown or "",
            sort_order=section.sort_order,
        )

    def _to_trade(self, trade: TradingJournalTrade) -> JournalTradeOut:
        sections = sorted(_alive(list(trade.sections or [])), key=lambda s: s.sort_order)
        attachments = sorted(_alive(list(trade.attachments or [])), key=lambda a: a.sort_order)
        return JournalTradeOut(
            id=trade.id,
            trade_index=trade.trade_index,
            title_suffix=trade.title_suffix,
            instrument=trade.instrument,
            direction=trade.direction,
            quantity=trade.quantity,
            entry_price=trade.entry_price,
            exit_price=trade.exit_price,
            stop_price=trade.stop_price,
            result=trade.result,
            pnl=trade.pnl,
            setup=trade.setup,
            grade=trade.grade,
            dqs_score=trade.dqs_score,
            dqs_max=trade.dqs_max,
            ledger_trade_id=trade.ledger_trade_id,
            raw_markdown=trade.raw_markdown or "",
            sections=[self._to_trade_section(s) for s in sections],
            attachments=[self._to_attachment(a) for a in attachments],
        )

    def _to_trade_section(self, section: TradingJournalTradeSection) -> JournalTradeSectionOut:
        return JournalTradeSectionOut(
            id=section.id,
            section_key=_enum_str(section.section_key),
            heading_original=section.heading_original,
            body_markdown=section.body_markdown or "",
            sort_order=section.sort_order,
        )

    def _to_attachment(self, att: TradingJournalAttachment) -> JournalAttachmentOut:
        return JournalAttachmentOut(
            id=att.id,
            journal_trade_id=att.journal_trade_id,
            obsidian_ref=att.obsidian_ref,
            file_name=att.file_name,
            storage_path=att.storage_path,
            mime_type=att.mime_type,
            caption=att.caption,
            sort_order=att.sort_order,
            import_status=_enum_str(att.import_status),
        )
