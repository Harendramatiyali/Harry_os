"""Review-flow tests — draft ↔ review mapping contracts + review queue."""

from __future__ import annotations

from datetime import date

from app.modules.ai.imports.pipeline.review import enqueue_for_review
from app.modules.ai.imports.schemas import JournalDraft
from tests.helpers import make_confidence, make_draft


def test_review_queue_payload_ready_for_ui() -> None:
    draft = make_draft()
    conf = make_confidence(overall=0.81)
    item = enqueue_for_review(
        draft=draft,
        confidence=conf,
        job_id="job-review-1",
        warnings=["check instrument"],
    )
    assert item.requires_human_review is True
    assert item.draft is draft
    assert item.confidence is conf
    assert item.job_id == "job-review-1"
    assert item.overall_confidence == 0.81


def test_reviewed_draft_round_trip_fields() -> None:
    """Simulate Review edits then map back to API JournalDraft shape."""
    draft = make_draft()
    # Emulate user edits on review screen
    draft.title = "Edited Title"
    draft.day_bias = "neutral"
    draft.trades[0].instrument = "BANKNIFTY 52000 CE"
    draft.trades[0].result = "loss"
    draft.sections[0].body_markdown = "Updated market context"

    dumped = draft.model_dump(mode="json")
    restored = JournalDraft.model_validate(dumped)
    assert restored.title == "Edited Title"
    assert restored.day_bias == "neutral"
    assert restored.trades[0].instrument == "BANKNIFTY 52000 CE"
    assert restored.journal_date == date(2026, 7, 15)


def test_commit_payload_approve_gate_shape() -> None:
    from app.modules.ai.imports.schemas import ImportCommitRequest

    req = ImportCommitRequest(draft=make_draft(), approve=True)
    assert req.approve is True
    assert req.draft is not None
    assert req.draft.trades[0].trade_index == 1


def test_low_confidence_still_requires_review() -> None:
    item = enqueue_for_review(
        draft=make_draft(),
        confidence=make_confidence(overall=0.2),
        job_id="job-low",
        warnings=["weak OCR"],
    )
    assert item.requires_human_review is True
    assert item.status == "pending_review"
