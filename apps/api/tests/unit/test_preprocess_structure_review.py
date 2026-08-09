"""Unit tests — preprocess + structure + review stages."""

from __future__ import annotations

from datetime import date

from app.modules.ai.imports.pipeline.preprocess import preprocess_images, _quality_score
from app.modules.ai.imports.pipeline.review import enqueue_for_review
from app.modules.ai.imports.pipeline.structure import (
    finalize_structure,
    ocr_summary,
    to_structured_json,
)
from app.modules.ai.imports.pipeline.types import (
    OcrPageResult,
    PipelineImage,
    ValidationResult,
)
from tests.helpers import PNG_1X1, make_confidence, make_draft


def test_quality_score_png() -> None:
    score, warnings = _quality_score(PNG_1X1, "image/png", "tiny.png")
    assert score is not None
    assert 0.0 <= score <= 1.0


def test_preprocess_images_from_bytes() -> None:
    images = [
        PipelineImage(
            page_id="p1",
            page_index=0,
            file_name="a.png",
            mime_type="image/png",
            data=PNG_1X1,
        )
    ]
    results = preprocess_images(images)
    assert len(results) == 1
    assert results[0].page_id == "p1"
    assert results[0].byte_size == len(PNG_1X1)


def test_finalize_structure_links_unreferenced_pages() -> None:
    draft = make_draft(page_ids=["p1"])
    out = finalize_structure(
        draft,
        page_ids=["p1", "p2"],
        validation=ValidationResult(ok=True, errors=[], warnings=[]),
    )
    assert "p2" in out.day_attachment_page_ids
    assert out.day_attachment_page_ids[0] == "p1"


def test_finalize_structure_appends_validation_errors() -> None:
    draft = make_draft(page_ids=["p1"], with_section=False, with_trade=False)
    draft.uncategorized_markdown = None
    out = finalize_structure(
        draft,
        page_ids=["p1"],
        validation=ValidationResult(ok=False, errors=["bad date"], warnings=[]),
    )
    assert out.uncategorized_markdown
    assert "bad date" in out.uncategorized_markdown


def test_to_structured_json_shape() -> None:
    payload = to_structured_json(make_draft(), make_confidence())
    assert "draft" in payload
    assert "confidence" in payload
    assert payload["draft"]["journal_date"] == "2026-07-15"


def test_ocr_summary() -> None:
    summary = ocr_summary(
        [
            OcrPageResult(
                page_id="p1",
                page_index=0,
                file_name="a.png",
                transcript="hello",
                confidence=0.5,
                engine="test",
                warnings=["w"],
            )
        ]
    )
    assert summary[0]["transcript_chars"] == 5
    assert summary[0]["warnings"] == ["w"]


def test_enqueue_for_review_always_requires_human() -> None:
    item = enqueue_for_review(
        draft=make_draft(),
        confidence=make_confidence(overall=0.99),
        job_id="job-1",
        warnings=["note"],
        min_auto_approve_confidence=0.5,
    )
    assert item.status == "pending_review"
    assert item.requires_human_review is True
    assert item.journal_date == date(2026, 7, 15)
    assert item.warnings == ["note"]
