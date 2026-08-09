"""Commit AI import draft into existing trading_journal_* tables."""

from __future__ import annotations

import hashlib
import json
import shutil
import uuid
from pathlib import Path

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError
from app.modules.ai.import_models import AiImportJob, AiImportPage
from app.modules.ai.imports.schemas import JournalDraft
from app.modules.trading.journal_models import (
    AttachmentImportStatus,
    DaySectionKey,
    JournalParseStatus,
    JournalSource,
    TradeSectionKey,
    TradingJournalAttachment,
    TradingJournalDay,
    TradingJournalDaySection,
    TradingJournalTrade,
    TradingJournalTradeSection,
)
from app.modules.trading.journal_repository import TradingJournalDayRepository
from app.modules.trading.models import TradeDirection


def _day_section_key(raw: str) -> DaySectionKey:
    try:
        return DaySectionKey(raw)
    except ValueError:
        return DaySectionKey.UNCATEGORIZED


def _trade_section_key(raw: str) -> TradeSectionKey:
    try:
        return TradeSectionKey(raw)
    except ValueError:
        return TradeSectionKey.UNCATEGORIZED


def _direction(raw: str | None) -> TradeDirection | None:
    if not raw:
        return None
    try:
        return TradeDirection(raw.lower())
    except ValueError:
        return None


def _tags_csv(tags: list[str]) -> str | None:
    # Drop ingest-only labels so the day looks like any other trading journal
    skip = {"ai_import", "notebook", "handwritten"}
    cleaned = [t.strip() for t in tags if t and t.strip() and t.strip().lower() not in skip]
    return ",".join(cleaned)[:512] if cleaned else None


def _draft_raw_markdown(draft: JournalDraft) -> str:
    """Rebuild a day-journal markdown body so Raw view matches other journals."""
    lines: list[str] = []
    title = (draft.title or "").strip() or f"Trading Journal {draft.journal_date.isoformat()}"
    lines.extend([f"# {title}", "", f"📅 Date: {draft.journal_date.isoformat()}", ""])
    if draft.market:
        lines.append(f"**Market**: {draft.market}")
    if draft.primary_instrument:
        lines.append(f"**Instrument**: {draft.primary_instrument}")
    if draft.day_bias:
        lines.append(f"**Bias**: {draft.day_bias}")
    if draft.overall_grade:
        lines.append(f"**Grade**: {draft.overall_grade}")
    if draft.day_pnl is not None:
        lines.append(f"**Day PnL**: {draft.day_pnl}")
    if lines[-1] != "":
        lines.append("")

    for section in sorted(draft.sections, key=lambda s: s.sort_order):
        if not _keep_day_section(section):
            continue
        heading = (section.heading_original or section.section_key or "Section").strip()
        lines.extend([f"## {heading}", "", (section.body_markdown or "").strip(), ""])

    for trade in sorted(draft.trades, key=lambda t: t.trade_index):
        lines.extend([f"# Trade {trade.trade_index}", ""])
        if trade.instrument:
            lines.append(f"- **Instrument**: {trade.instrument}")
        if trade.direction:
            lines.append(f"- **Direction**: {trade.direction}")
        if trade.quantity is not None:
            lines.append(f"- **Quantity**: {trade.quantity}")
        if trade.entry_price is not None:
            lines.append(f"- **Entry**: {trade.entry_price}")
        if trade.exit_price is not None:
            lines.append(f"- **Exit**: {trade.exit_price}")
        if trade.result:
            lines.append(f"- **Result**: {trade.result}")
        if trade.pnl is not None:
            lines.append(f"- **PnL**: {trade.pnl}")
        if trade.grade:
            lines.append(f"- **Grade**: {trade.grade}")
        lines.append("")
        for section in sorted(trade.sections, key=lambda s: s.sort_order):
            heading = (section.heading_original or section.section_key or "Section").strip()
            lines.extend([f"## {heading}", "", (section.body_markdown or "").strip(), ""])
        if trade.raw_markdown.strip():
            lines.extend([trade.raw_markdown.strip(), ""])

    if draft.uncategorized_markdown and draft.uncategorized_markdown.strip():
        lines.extend(["## Uncategorized", "", draft.uncategorized_markdown.strip(), ""])

    return "\n".join(lines).strip() + "\n"


def _parse_status_for_reviewed_draft(draft: JournalDraft) -> JournalParseStatus:
    """Human already approved in Import Review — treat as a normal parsed day."""
    has_sections = any((s.body_markdown or "").strip() for s in draft.sections)
    has_trades = len(draft.trades) > 0
    if has_sections or has_trades:
        return JournalParseStatus.PARSED
    return JournalParseStatus.PARTIAL


def _keep_day_section(section) -> bool:
    heading = (section.heading_original or "").strip().lower()
    body = (section.body_markdown or "").strip()
    if heading in {"ocr transcript", "ocr pages", "notebook import"}:
        return False
    # Drop tiny date-only header leftovers from the import scaffold
    if body.startswith("📅 Date:") and len(body) < 40:
        return False
    return True


def _copy_page_to_journal_media(
    *,
    page: AiImportPage,
    media_root: Path,
    user_id: str,
    journal_day_id: str,
) -> tuple[str | None, AttachmentImportStatus]:
    src = Path(page.storage_path) if page.storage_path else None
    if src is None or not src.is_file():
        return None, AttachmentImportStatus.MISSING
    dest_dir = media_root / "trading_journals" / user_id / journal_day_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = Path(page.original_file_name or src.name).name
    dest = dest_dir / f"{page.id}_{safe}"
    shutil.copy2(src, dest)
    return str(dest), AttachmentImportStatus.COPIED


async def commit_draft_to_journal(
    *,
    user_id: str,
    job: AiImportJob,
    draft: JournalDraft,
    pages_by_id: dict[str, AiImportPage],
    journals: TradingJournalDayRepository,
    settings: Settings,
) -> TradingJournalDay:
    """Create a native TradingJournalDay from a reviewed draft. Rejects date conflicts."""
    existing = await journals.get_by_date(user_id, draft.journal_date)
    if existing is not None:
        raise ConflictError(
            f"A trading journal already exists for {draft.journal_date.isoformat()}. "
            "Open the existing day, change the draft date, or merge later.",
            details={
                "journal_date": draft.journal_date.isoformat(),
                "existing_journal_day_id": existing.id,
            },
        )

    if not draft.journal_date:
        raise DomainError("Draft journal_date is required")

    day_id = str(uuid.uuid4())
    media_root = Path(settings.media_root)
    content_hash = hashlib.sha256(
        json.dumps(draft.model_dump(mode="json"), sort_keys=True).encode("utf-8")
    ).hexdigest()
    raw_markdown = _draft_raw_markdown(draft)
    title = (
        (draft.title or "").strip()
        or f"Trading Journal {draft.journal_date.isoformat()}"
    )[:255]

    day = TradingJournalDay(
        id=day_id,
        user_id=user_id,
        journal_date=draft.journal_date,
        title=title,
        source=JournalSource.NATIVE,
        content_hash=content_hash,
        raw_markdown=raw_markdown,
        market=draft.market,
        primary_instrument=draft.primary_instrument,
        day_bias=draft.day_bias,
        day_result=draft.day_result,
        day_pnl=draft.day_pnl,
        daily_rating=draft.daily_rating,
        overall_grade=draft.overall_grade,
        tags_csv=_tags_csv(draft.tags),
        parse_status=_parse_status_for_reviewed_draft(draft),
        uncategorized_markdown=draft.uncategorized_markdown,
        ai_import_job_id=job.id,
        sections=[],
        trades=[],
        attachments=[],
    )

    day.sections = [
        TradingJournalDaySection(
            id=str(uuid.uuid4()),
            user_id=user_id,
            journal_day_id=day_id,
            section_key=_day_section_key(section.section_key),
            heading_original=section.heading_original,
            body_markdown=section.body_markdown or "",
            sort_order=section.sort_order if section.sort_order is not None else i,
        )
        for i, section in enumerate(s for s in draft.sections if _keep_day_section(s))
    ]

    used_page_ids: set[str] = set()
    trade_rows: list[TradingJournalTrade] = []
    for trade in draft.trades:
        trade_id = str(uuid.uuid4())
        trade_atts: list[TradingJournalAttachment] = []
        for i, page_id in enumerate(trade.attachment_page_ids):
            page = pages_by_id.get(page_id)
            if page is None:
                continue
            used_page_ids.add(page_id)
            storage_path, import_status = _copy_page_to_journal_media(
                page=page,
                media_root=media_root,
                user_id=user_id,
                journal_day_id=day_id,
            )
            trade_atts.append(
                TradingJournalAttachment(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    journal_day_id=day_id,
                    journal_trade_id=trade_id,
                    obsidian_ref=f"attachment:{page.id}",
                    file_name=page.original_file_name or f"page_{page.page_index + 1}.png",
                    storage_path=storage_path,
                    mime_type=page.mime_type,
                    caption=page.original_file_name,
                    sort_order=i,
                    import_status=import_status,
                    ai_import_page_id=page.id,
                )
            )

        trade_rows.append(
            TradingJournalTrade(
                id=trade_id,
                user_id=user_id,
                journal_day_id=day_id,
                trade_index=trade.trade_index,
                title_suffix=trade.title_suffix,
                instrument=trade.instrument,
                direction=_direction(trade.direction),
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
                raw_markdown=trade.raw_markdown or "",
                sections=[
                    TradingJournalTradeSection(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        journal_trade_id=trade_id,
                        section_key=_trade_section_key(section.section_key),
                        heading_original=section.heading_original,
                        body_markdown=section.body_markdown or "",
                        sort_order=section.sort_order if section.sort_order is not None else j,
                    )
                    for j, section in enumerate(trade.sections)
                ],
                attachments=trade_atts,
            )
        )
    day.trades = trade_rows

    day_atts: list[TradingJournalAttachment] = []
    day_page_ids = list(draft.day_attachment_page_ids)
    # Any unused uploaded pages default to day-level attachments
    for page in sorted(pages_by_id.values(), key=lambda p: p.page_index):
        if page.id not in used_page_ids and page.id not in day_page_ids:
            day_page_ids.append(page.id)

    for i, page_id in enumerate(day_page_ids):
        if page_id in used_page_ids:
            continue
        page = pages_by_id.get(page_id)
        if page is None:
            continue
        used_page_ids.add(page_id)
        storage_path, import_status = _copy_page_to_journal_media(
            page=page,
            media_root=media_root,
            user_id=user_id,
            journal_day_id=day_id,
        )
        day_atts.append(
            TradingJournalAttachment(
                id=str(uuid.uuid4()),
                user_id=user_id,
                journal_day_id=day_id,
                journal_trade_id=None,
                obsidian_ref=f"attachment:{page.id}",
                file_name=page.original_file_name or f"page_{page.page_index + 1}.png",
                storage_path=storage_path,
                mime_type=page.mime_type,
                caption=page.original_file_name,
                sort_order=i,
                import_status=import_status,
                ai_import_page_id=page.id,
            )
        )
    day.attachments = day_atts

    await journals.add(day)
    return day
