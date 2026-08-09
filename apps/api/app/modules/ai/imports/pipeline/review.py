"""Stage 8 — Review queue item (in-memory; no persistence)."""

from __future__ import annotations

from app.modules.ai.imports.pipeline.types import ReviewQueueItem
from app.modules.ai.imports.schemas import ConfidenceMap, JournalDraft


def enqueue_for_review(
    *,
    draft: JournalDraft,
    confidence: ConfidenceMap,
    job_id: str | None,
    warnings: list[str],
    min_auto_approve_confidence: float = 0.92,
) -> ReviewQueueItem:
    """Always queues for human review in v1; threshold reserved for future auto-approve."""
    overall = confidence.overall or 0.0
    # v1 always requires human review before Save Journal
    requires_human = True
    return ReviewQueueItem(
        status="pending_review",
        job_id=job_id,
        journal_date=draft.journal_date,
        title=draft.title,
        overall_confidence=overall,
        draft=draft,
        confidence=confidence,
        warnings=list(warnings),
        requires_human_review=requires_human,
    )
