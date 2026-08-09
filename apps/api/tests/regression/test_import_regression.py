"""Regression suite — locks known AI Import behaviors that previously broke."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from app.modules.ai.imports.commit import _draft_raw_markdown, _keep_day_section, _tags_csv
from app.modules.ai.imports.pipeline import PipelineImage, PipelineOptions, run_pipeline
from app.modules.ai.imports.pipeline.ocr import LocalOcrEngine
from app.modules.ai.imports.pipeline.validate import validate_draft
from app.modules.ai.imports.schemas import JournalDraftSection
from tests.helpers import PNG_1X1, SAMPLE_JOURNAL_MARKDOWN, make_draft, section_ns


@pytest.mark.asyncio
async def test_regression_notebook_body_date_wins_without_override(
    tmp_path: Path,
) -> None:
    """When no filename/session date override is forced, notebook OCR date is used."""
    img = tmp_path / "WhatsApp_Image_2026-01-01.jpeg"
    txt = tmp_path / "WhatsApp_Image_2026-01-01.txt"
    img.write_bytes(PNG_1X1)
    txt.write_text(SAMPLE_JOURNAL_MARKDOWN, encoding="utf-8")  # body date 2026-07-15

    result = await run_pipeline(
        [
            PipelineImage(
                page_id="p1",
                page_index=0,
                file_name=img.name,
                mime_type="image/jpeg",
                path=img,
            )
        ],
        options=PipelineOptions(
            journal_date=date(2026, 7, 15),
            title="WA import",
            job_id="reg-date",
        ),
        ocr_engine=LocalOcrEngine(),
    )
    assert result.draft.journal_date == date(2026, 7, 15)
    assert "2026-07-15" in (result.ocr_pages[0].transcript or "")


def test_regression_parse_prefers_body_date_over_fallback() -> None:
    """Parse stage: date inside notebook markdown beats session fallback."""
    from app.modules.ai.imports.pipeline.parse import run_parse
    from app.modules.ai.imports.pipeline.types import UnderstandingResult

    result = run_parse(
        UnderstandingResult(markdown=SAMPLE_JOURNAL_MARKDOWN, engine="test"),
        fallback_date=date(2026, 1, 1),
        title_hint="WA",
        page_ids=["p1"],
    )
    assert result.draft_partial.journal_date == date(2026, 7, 15)


def test_regression_commit_markdown_strips_ocr_scaffold() -> None:
    draft = make_draft()
    draft.sections.append(
        JournalDraftSection(
            section_key="uncategorized",
            heading_original="OCR Transcript",
            body_markdown="raw dump should not land in journal",
            sort_order=99,
        )
    )
    draft.tags = ["ai_import", "notebook", "session"]
    md = _draft_raw_markdown(draft)
    assert "OCR Transcript" not in md
    assert "raw dump" not in md
    assert _tags_csv(draft.tags) == "session"
    assert _keep_day_section(section_ns(heading="OCR Pages", body="x")) is False


def test_regression_soft_delete_index_collision_validation() -> None:
    """Unknown attachment ids must hard-fail validation (do not silently commit)."""
    draft = make_draft(page_ids=["alive"])
    draft.day_attachment_page_ids = ["alive", "soft-deleted-ghost"]
    result = validate_draft(draft, page_ids=["alive"], today=date(2026, 7, 20))
    assert result.ok is False
    assert any("unknown day attachment" in e for e in result.errors)


@pytest.mark.asyncio
async def test_regression_empty_ocr_still_produces_reviewable_draft() -> None:
    result = await run_pipeline(
        [
            PipelineImage(
                page_id="p1",
                page_index=0,
                file_name="blank.png",
                mime_type="image/png",
                data=PNG_1X1,
            )
        ],
        options=PipelineOptions(journal_date=date(2026, 8, 1), title="Blank"),
    )
    assert result.review_item.requires_human_review is True
    assert result.draft.journal_date == date(2026, 8, 1)
    assert result.confidence.overall is not None


def test_regression_native_source_markdown_has_date_header() -> None:
    md = _draft_raw_markdown(make_draft())
    assert "📅 Date: 2026-07-15" in md
    assert md.strip().startswith("#")
