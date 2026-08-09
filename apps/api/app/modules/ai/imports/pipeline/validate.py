"""Stage 5 — Validation of structured draft before review."""

from __future__ import annotations

from datetime import date, timedelta

from app.modules.ai.imports.pipeline.types import ValidationResult
from app.modules.ai.imports.schemas import JournalDraft


def validate_draft(
    draft: JournalDraft,
    *,
    page_ids: list[str],
    today: date | None = None,
) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []
    today = today or date.today()

    if draft.journal_date is None:
        errors.append("journal_date is required")
    else:
        if draft.journal_date > today + timedelta(days=2):
            warnings.append("journal_date is in the future")
        if draft.journal_date < date(2018, 1, 1):
            warnings.append("journal_date looks unusually old")

    if not (draft.title or "").strip():
        warnings.append("title is empty")

    known = set(page_ids)
    for pid in draft.day_attachment_page_ids:
        if pid not in known:
            errors.append(f"unknown day attachment page_id: {pid}")

    for trade in draft.trades:
        if trade.trade_index < 1:
            errors.append(f"invalid trade_index: {trade.trade_index}")
        if not trade.instrument:
            warnings.append(f"Trade {trade.trade_index}: missing instrument")
        for pid in trade.attachment_page_ids:
            if pid not in known:
                errors.append(f"Trade {trade.trade_index}: unknown page_id {pid}")

    if not draft.sections and not draft.trades and not (draft.uncategorized_markdown or "").strip():
        warnings.append("draft has no sections, trades, or uncategorized content")

    # Ensure every uploaded page is referenced somewhere
    referenced = set(draft.day_attachment_page_ids)
    for trade in draft.trades:
        referenced.update(trade.attachment_page_ids)
    missing = [pid for pid in page_ids if pid not in referenced]
    if missing:
        # Auto-fixable later; warn for review
        warnings.append(f"{len(missing)} page(s) not linked in draft attachments")

    return ValidationResult(ok=not errors, errors=errors, warnings=warnings)
