"""Stage 4 — Trading Journal Parser adapter."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.modules.ai.imports.pipeline.types import UnderstandingResult
from app.modules.ai.imports.schemas import (
    JournalDraft,
    JournalDraftSection,
    JournalDraftTrade,
    JournalDraftTradeSection,
)
from app.modules.trading.journal_parser import ParsedDayJournal, parse_trading_journal


def _enum_val(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


@dataclass(slots=True)
class ParseStageResult:
    parsed: ParsedDayJournal
    draft_partial: JournalDraft
    warnings: list[str]


def _tags(tags_csv: str | None) -> list[str]:
    if not tags_csv:
        return []
    return [t.strip() for t in tags_csv.split(",") if t.strip()]


def _direction_str(direction) -> str | None:
    if direction is None:
        return None
    return _enum_val(direction)


def parsed_to_draft(
    parsed: ParsedDayJournal,
    *,
    fallback_date: date,
    page_ids: list[str],
    title_override: str | None = None,
) -> JournalDraft:
    """Map parser output → Import Center JournalDraft (structured JSON shape)."""
    journal_date = parsed.journal_date or fallback_date
    sections = [
        JournalDraftSection(
            section_key=s.section_key
            if isinstance(s.section_key, str)
            else getattr(s.section_key, "value", str(s.section_key)),
            heading_original=s.heading_original,
            body_markdown=s.body_markdown,
            sort_order=s.sort_order,
            confidence=None,
        )
        for s in parsed.sections
    ]
    trades: list[JournalDraftTrade] = []
    for t in parsed.trades:
        trades.append(
            JournalDraftTrade(
                trade_index=t.trade_index,
                title_suffix=t.title_suffix,
                instrument=t.instrument,
                direction=_direction_str(t.direction),
                quantity=t.quantity,
                entry_price=t.entry_price,
                exit_price=t.exit_price,
                stop_price=t.stop_price,
                result=t.result,
                pnl=t.pnl,
                setup=t.setup,
                grade=t.grade,
                dqs_score=t.dqs_score,
                dqs_max=t.dqs_max,
                raw_markdown=t.raw_markdown,
                sections=[
                    JournalDraftTradeSection(
                        section_key=s.section_key
                        if isinstance(s.section_key, str)
                        else getattr(s.section_key, "value", str(s.section_key)),
                        heading_original=s.heading_original,
                        body_markdown=s.body_markdown,
                        sort_order=s.sort_order,
                    )
                    for s in t.sections
                ],
                attachment_page_ids=[],
                confidence=None,
            )
        )

    tags = _tags(parsed.tags_csv)

    return JournalDraft(
        journal_date=journal_date,
        title=title_override or parsed.title,
        market=parsed.market,
        primary_instrument=parsed.primary_instrument,
        day_bias=parsed.day_bias,
        day_result=parsed.day_result,
        day_pnl=parsed.day_pnl,
        daily_rating=parsed.daily_rating,
        overall_grade=parsed.overall_grade,
        tags=tags,
        uncategorized_markdown=parsed.uncategorized_markdown,
        sections=sections,
        trades=trades,
        day_attachment_page_ids=list(page_ids),
    )


def run_parse(
    understanding: UnderstandingResult,
    *,
    fallback_date: date,
    title_hint: str | None,
    page_ids: list[str],
) -> ParseStageResult:
    parsed = parse_trading_journal(
        understanding.markdown,
        fallback_date=fallback_date,
        title_hint=title_hint,
    )
    warnings = list(parsed.warnings) + list(understanding.warnings)

    # For notebook imports, prefer the date written in OCR/markdown over filename hints
    from app.modules.trading.journal_parser import _extract_date

    body_date = _extract_date(understanding.markdown or "")
    if body_date is not None and body_date != parsed.journal_date:
        warnings.append(
            f"Using notebook date {body_date.isoformat()} "
            f"(over filename/fallback {parsed.journal_date})"
        )
        parsed.journal_date = body_date
        # Drop the "using fallback" mismatch warning if present
        warnings = [
            w
            for w in warnings
            if "Date mismatch" not in w or "using fallback" not in w
        ]

    draft = parsed_to_draft(
        parsed,
        fallback_date=body_date or fallback_date,
        page_ids=page_ids,
        title_override=title_hint,
    )
    return ParseStageResult(parsed=parsed, draft_partial=draft, warnings=warnings)
