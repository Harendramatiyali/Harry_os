"""Stage 6 — Confidence scoring."""

from __future__ import annotations

from app.modules.ai.imports.pipeline.types import OcrPageResult, ValidationResult
from app.modules.ai.imports.schemas import ConfidenceMap, JournalDraft
from app.modules.trading.journal_models import JournalParseStatus
from app.modules.trading.journal_parser import ParsedDayJournal


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, round(value, 3)))


def score_confidence(
    *,
    draft: JournalDraft,
    parsed: ParsedDayJournal,
    ocr_pages: list[OcrPageResult],
    validation: ValidationResult,
) -> ConfidenceMap:
    ocr_scores = [p.confidence for p in ocr_pages if p.confidence is not None]
    ocr_avg = sum(ocr_scores) / len(ocr_scores) if ocr_scores else 0.1
    has_text = any((p.transcript or "").strip() for p in ocr_pages)

    parse_status = parsed.parse_status
    status_val = parse_status.value if hasattr(parse_status, "value") else str(parse_status)
    parse_score = {
        JournalParseStatus.PARSED.value: 0.85,
        JournalParseStatus.PARTIAL.value: 0.6,
        JournalParseStatus.NEEDS_REVIEW.value: 0.35,
    }.get(status_val, 0.4)

    field_scores: dict[str, float] = {
        "ocr": _clamp(ocr_avg),
        "title": 0.7 if draft.title else 0.2,
        "journal_date": 0.9 if parsed.journal_date else 0.45,
        "sections": _clamp(0.2 + 0.15 * min(len(draft.sections), 5)),
        "trades": _clamp(0.15 * min(len(draft.trades), 5)) if draft.trades else 0.05,
        "instruments": 0.7
        if any(t.instrument for t in draft.trades) or draft.primary_instrument
        else 0.2,
        "attachments": 0.9 if draft.day_attachment_page_ids else 0.3,
        "parse_status": parse_score,
    }

    if not has_text:
        field_scores["ocr"] = 0.05
        field_scores["sections"] = min(field_scores["sections"], 0.2)

    if validation.errors:
        field_scores["validation"] = 0.1
    elif validation.warnings:
        field_scores["validation"] = 0.55
    else:
        field_scores["validation"] = 0.85

    # Weighted overall
    weights = {
        "ocr": 0.25,
        "journal_date": 0.15,
        "sections": 0.15,
        "trades": 0.15,
        "instruments": 0.1,
        "parse_status": 0.1,
        "validation": 0.1,
    }
    overall = sum(field_scores.get(k, 0.0) * w for k, w in weights.items())
    overall = _clamp(overall)

    notes = (
        f"parse_status={status_val}; ocr_pages={len(ocr_pages)}; "
        f"trades={len(draft.trades)}; sections={len(draft.sections)}"
    )
    if not has_text:
        notes += "; low confidence — no OCR text"

    return ConfidenceMap(
        overall=overall,
        journal_date=field_scores["journal_date"],
        fields=field_scores,
        notes=notes,
    )


def apply_field_confidence(draft: JournalDraft, confidence: ConfidenceMap) -> JournalDraft:
    """Stamp section/trade confidence from aggregate field scores (mutates copy via model)."""
    section_c = confidence.fields.get("sections")
    trade_c = confidence.fields.get("trades")
    data = draft.model_copy(deep=True)
    for section in data.sections:
        section.confidence = section_c
    for trade in data.trades:
        trade.confidence = trade_c
        for ts in trade.sections:
            ts.confidence = trade_c
    return data
