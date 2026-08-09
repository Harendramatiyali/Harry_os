"""Migrate Knowledge trading_journal notes into structured day journals (M2)."""

from __future__ import annotations

import json
import uuid
from datetime import date
from pathlib import Path

from app.core.config import Settings
from app.modules.knowledge.models import KnowledgeNote, NoteKind
from app.modules.knowledge.repository import KnowledgeNoteRepository
from app.modules.trading.journal_media import (
    build_vault_index,
    collect_day_attachments,
    copy_attachment_from_vault,
)
from app.modules.trading.journal_models import (
    AttachmentImportStatus,
    DaySectionKey,
    JournalParseStatus,
    JournalSource,
    TradeSectionKey,
    TradingJournalAttachment,
    TradingJournalDay,
    TradingJournalDaySection,
    TradingJournalParseRun,
    TradingJournalTrade,
    TradingJournalTradeSection,
)
from app.modules.trading.journal_parser import is_weekly_review_note, parse_trading_journal
from app.modules.trading.journal_repository import (
    TradingJournalDayRepository,
    TradingJournalParseRunRepository,
)
from app.modules.trading.schemas import (
    JournalMigrateItem,
    JournalMigrateReport,
    JournalMigrateRequest,
)


class JournalMigrateService:
    def __init__(
        self,
        *,
        notes: KnowledgeNoteRepository,
        journals: TradingJournalDayRepository,
        parse_runs: TradingJournalParseRunRepository,
        settings: Settings,
    ) -> None:
        self.notes = notes
        self.journals = journals
        self.parse_runs = parse_runs
        self.settings = settings
        self._vault_index: dict[str, Path] | None = None

    def _vault_root(self) -> Path | None:
        raw = (self.settings.obsidian_vault_path or "").strip()
        if not raw:
            return None
        path = Path(raw).expanduser()
        return path if path.is_dir() else None

    def _get_vault_index(self) -> dict[str, Path] | None:
        root = self._vault_root()
        if root is None:
            return None
        if self._vault_index is None:
            self._vault_index = build_vault_index(root)
        return self._vault_index

    def _copy_day_media(self, user_id: str, day: TradingJournalDay) -> tuple[int, int]:
        """Copy vault files for all attachments on a day. Returns (copied, missing)."""
        root = self._vault_root()
        if root is None:
            return 0, 0
        index = self._get_vault_index() or {}
        media_root = Path(self.settings.media_root)
        copied = missing = 0
        for att in collect_day_attachments(day):
            before = att.import_status
            had_file = bool(att.storage_path and Path(att.storage_path).is_file())
            status = copy_attachment_from_vault(
                att,
                vault_root=root,
                media_root=media_root,
                user_id=user_id,
                index=index,
            )
            if status == AttachmentImportStatus.COPIED:
                if before == AttachmentImportStatus.COPIED and had_file:
                    continue
                copied += 1
            elif status == AttachmentImportStatus.MISSING:
                missing += 1
        return copied, missing

    async def migrate(self, user_id: str, data: JournalMigrateRequest) -> JournalMigrateReport:
        self._vault_index = None
        notes = await self.notes.list_for_user(
            user_id, kind=NoteKind.TRADING_JOURNAL.value, limit=500
        )
        if data.note_ids:
            wanted = set(data.note_ids)
            notes = [n for n in notes if n.id in wanted]

        items: list[JournalMigrateItem] = []
        created = updated = skipped = needs_review = 0

        for note in notes:
            item = await self._migrate_note(user_id, note, dry_run=data.dry_run)
            items.append(item)
            if item.action == "create":
                created += 1
            elif item.action == "update":
                updated += 1
            elif item.action == "skip":
                skipped += 1
            elif item.action == "needs_review":
                needs_review += 1

        items.sort(key=lambda i: (i.journal_date or date.min, i.title.lower()))

        report = JournalMigrateReport(
            dry_run=data.dry_run,
            scanned=len(notes),
            created=created,
            updated=updated,
            skipped=skipped,
            needs_review=needs_review,
            items=items,
        )

        run = TradingJournalParseRun(
            id=str(uuid.uuid4()),
            user_id=user_id,
            dry_run=1 if data.dry_run else 0,
            scanned=report.scanned,
            created_count=created,
            updated_count=updated,
            skipped_count=skipped,
            needs_review_count=needs_review,
            report_json=json.dumps(
                report.model_dump(mode="json")
                if not data.dry_run
                else {
                    "dry_run": True,
                    "scanned": report.scanned,
                    "created": created,
                    "updated": updated,
                    "skipped": skipped,
                    "needs_review": needs_review,
                }
            ),
        )
        await self.parse_runs.add(run)
        await self.notes.session.flush()
        return report

    async def _migrate_note(
        self, user_id: str, note: KnowledgeNote, *, dry_run: bool
    ) -> JournalMigrateItem:
        title = note.title or note.vault_path or note.id
        if is_weekly_review_note(title=note.title, body=note.body or "", vault_path=note.vault_path):
            return JournalMigrateItem(
                note_id=note.id,
                title=title,
                vault_path=note.vault_path,
                journal_date=note.journal_date,
                action="skip",
                detail="Weekly review — excluded from day-journal migrate",
                parse_status=None,
                trade_count=0,
                section_count=0,
                attachment_count=0,
            )

        parsed = parse_trading_journal(
            note.body or "",
            fallback_date=note.journal_date,
            title_hint=note.title,
        )
        journal_date = parsed.journal_date or note.journal_date
        content_hash = note.content_hash

        if journal_date is None:
            return JournalMigrateItem(
                note_id=note.id,
                title=title,
                vault_path=note.vault_path,
                journal_date=None,
                action="needs_review",
                detail="No journal date (filename or body)",
                parse_status=JournalParseStatus.NEEDS_REVIEW.value,
                trade_count=0,
                section_count=0,
                attachment_count=0,
                warnings=parsed.warnings,
            )

        existing = await self.journals.get_by_date(user_id, journal_date, include_deleted=True)
        if existing is None and note.id:
            existing = await self.journals.get_by_knowledge_note(user_id, note.id)

        if (
            existing
            and existing.deleted_at is None
            and content_hash
            and existing.content_hash == content_hash
            and existing.knowledge_note_id == note.id
        ):
            media_note = ""
            if not dry_run:
                c, m = self._copy_day_media(user_id, existing)
                await self.journals.session.flush()
                if c or m:
                    media_note = f"; media +{c} copied, {m} missing"
            return JournalMigrateItem(
                note_id=note.id,
                title=title,
                vault_path=note.vault_path,
                journal_date=journal_date,
                action="skip",
                detail=f"Already migrated — content unchanged{media_note}",
                journal_day_id=existing.id,
                parse_status=existing.parse_status.value
                if hasattr(existing.parse_status, "value")
                else str(existing.parse_status),
                trade_count=len(existing.trades) if existing.trades is not None else 0,
                section_count=len(existing.sections) if existing.sections is not None else 0,
                attachment_count=len(collect_day_attachments(existing)),
            )

        action = "update" if existing else "create"
        att_count = len(parsed.attachments) + sum(len(t.attachments) for t in parsed.trades)
        detail = (
            f"{parsed.parse_status.value}: {len(parsed.trades)} trades, "
            f"{len(parsed.sections)} day sections"
        )
        if parsed.warnings:
            detail += f"; {len(parsed.warnings)} warnings"

        if dry_run:
            return JournalMigrateItem(
                note_id=note.id,
                title=title,
                vault_path=note.vault_path,
                journal_date=journal_date,
                action=action,
                detail=detail,
                journal_day_id=existing.id if existing else None,
                parse_status=parsed.parse_status.value,
                trade_count=len(parsed.trades),
                section_count=len(parsed.sections),
                attachment_count=att_count,
                warnings=parsed.warnings[:20],
            )

        if existing:
            day = existing
            day.deleted_at = None
            await self.journals.clear_children(day)
            day_id = day.id
        else:
            day_id = str(uuid.uuid4())
            day = TradingJournalDay(
                id=day_id,
                user_id=user_id,
                journal_date=journal_date,
                sections=[],
                trades=[],
                attachments=[],
            )

        day.title = (parsed.title or title)[:255]
        day.source = JournalSource.OBSIDIAN
        day.knowledge_note_id = note.id
        day.vault_path = note.vault_path
        day.content_hash = content_hash
        day.raw_markdown = parsed.raw_markdown
        day.market = parsed.market
        day.primary_instrument = parsed.primary_instrument
        day.day_bias = parsed.day_bias
        day.day_result = parsed.day_result
        day.day_pnl = parsed.day_pnl
        day.daily_rating = parsed.daily_rating
        day.overall_grade = parsed.overall_grade
        day.tags_csv = note.tags_csv or parsed.tags_csv
        day.parse_status = parsed.parse_status
        day.uncategorized_markdown = parsed.uncategorized_markdown

        day_sections = [
            TradingJournalDaySection(
                id=str(uuid.uuid4()),
                user_id=user_id,
                journal_day_id=day_id,
                section_key=DaySectionKey(section.section_key),
                heading_original=section.heading_original,
                body_markdown=section.body_markdown,
                sort_order=section.sort_order,
            )
            for section in parsed.sections
        ]

        trade_rows: list[TradingJournalTrade] = []
        for trade in parsed.trades:
            trade_id = str(uuid.uuid4())
            row = TradingJournalTrade(
                id=trade_id,
                user_id=user_id,
                journal_day_id=day_id,
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
                raw_markdown=trade.raw_markdown,
                sections=[
                    TradingJournalTradeSection(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        journal_trade_id=trade_id,
                        section_key=TradeSectionKey(section.section_key),
                        heading_original=section.heading_original,
                        body_markdown=section.body_markdown,
                        sort_order=section.sort_order,
                    )
                    for section in trade.sections
                ],
                attachments=[
                    TradingJournalAttachment(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        journal_day_id=day_id,
                        journal_trade_id=trade_id,
                        obsidian_ref=att.obsidian_ref,
                        file_name=att.file_name,
                        caption=att.caption,
                        sort_order=i,
                        import_status=AttachmentImportStatus.LINKED,
                    )
                    for i, att in enumerate(trade.attachments)
                ],
            )
            trade_rows.append(row)

        day_attachments = [
            TradingJournalAttachment(
                id=str(uuid.uuid4()),
                user_id=user_id,
                journal_day_id=day_id,
                journal_trade_id=None,
                obsidian_ref=att.obsidian_ref,
                file_name=att.file_name,
                caption=att.caption,
                sort_order=i,
                import_status=AttachmentImportStatus.LINKED,
            )
            for i, att in enumerate(parsed.attachments)
        ]

        day.sections = day_sections
        day.trades = trade_rows
        day.attachments = day_attachments

        if not existing:
            await self.journals.add(day)
        else:
            await self.journals.session.flush()

        c, m = self._copy_day_media(user_id, day)
        await self.journals.session.flush()
        if c or m:
            detail += f"; media +{c} copied, {m} missing"

        return JournalMigrateItem(
            note_id=note.id,
            title=title,
            vault_path=note.vault_path,
            journal_date=journal_date,
            action=action,
            detail=detail,
            journal_day_id=day.id,
            parse_status=parsed.parse_status.value,
            trade_count=len(parsed.trades),
            section_count=len(parsed.sections),
            attachment_count=att_count,
            warnings=parsed.warnings[:20],
        )
