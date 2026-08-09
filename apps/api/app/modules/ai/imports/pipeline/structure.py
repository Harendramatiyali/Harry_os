"""Stage 7 — Finalize structured JSON draft."""

from __future__ import annotations

from app.modules.ai.imports.pipeline.types import OcrPageResult, ValidationResult
from app.modules.ai.imports.schemas import ConfidenceMap, JournalDraft


def finalize_structure(
    draft: JournalDraft,
    *,
    page_ids: list[str],
    validation: ValidationResult,
) -> JournalDraft:
    """Ensure attachment linkage + stable ordering for review/commit."""
    data = draft.model_copy(deep=True)

    # Attach any unreferenced pages at day level
    referenced = set(data.day_attachment_page_ids)
    for trade in data.trades:
        referenced.update(trade.attachment_page_ids)
    for pid in page_ids:
        if pid not in referenced:
            data.day_attachment_page_ids.append(pid)

    # Stable sorts
    data.sections = sorted(data.sections, key=lambda s: s.sort_order)
    data.trades = sorted(data.trades, key=lambda t: t.trade_index)
    for trade in data.trades:
        trade.sections = sorted(trade.sections, key=lambda s: s.sort_order)

    if validation.errors and not data.uncategorized_markdown:
        data.uncategorized_markdown = "Validation issues:\n" + "\n".join(
            f"- {e}" for e in validation.errors
        )

    return data


def to_structured_json(draft: JournalDraft, confidence: ConfidenceMap) -> dict:
    return {
        "draft": draft.model_dump(mode="json"),
        "confidence": confidence.model_dump(mode="json"),
    }


def ocr_summary(pages: list[OcrPageResult]) -> list[dict]:
    return [
        {
            "page_id": p.page_id,
            "page_index": p.page_index,
            "engine": p.engine,
            "confidence": p.confidence,
            "transcript_chars": len(p.transcript or ""),
            "warnings": p.warnings,
        }
        for p in pages
    ]
