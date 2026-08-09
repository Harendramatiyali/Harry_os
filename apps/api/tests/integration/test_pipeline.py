"""Integration — full AI Import pipeline (no DB)."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from app.modules.ai.imports.pipeline import (
    PipelineImage,
    PipelineOptions,
    PipelineStage,
    run_pipeline,
)
from app.modules.ai.imports.pipeline.ocr import LocalOcrEngine
from tests.helpers import PNG_1X1, SAMPLE_JOURNAL_MARKDOWN


@pytest.mark.asyncio
async def test_pipeline_with_sidecar_ocr(tmp_path: Path) -> None:
    img = tmp_path / "page1.png"
    txt = tmp_path / "page1.txt"
    img.write_bytes(PNG_1X1)
    txt.write_text(SAMPLE_JOURNAL_MARKDOWN, encoding="utf-8")

    result = await run_pipeline(
        [
            PipelineImage(
                page_id="p1",
                page_index=0,
                file_name="page1.png",
                mime_type="image/png",
                path=img,
            )
        ],
        options=PipelineOptions(
            journal_date=date(2026, 7, 15),
            title="Notebook Jul 15",
            job_id="job-1",
        ),
        ocr_engine=LocalOcrEngine(),
    )

    stage_names = [s.stage for s in result.stages]
    assert stage_names == [
        PipelineStage.UPLOAD,
        PipelineStage.PREPROCESS,
        PipelineStage.OCR,
        PipelineStage.UNDERSTAND,
        PipelineStage.PARSE,
        PipelineStage.VALIDATE,
        PipelineStage.CONFIDENCE,
        PipelineStage.STRUCTURE,
        PipelineStage.REVIEW_QUEUE,
    ]
    assert result.draft.journal_date == date(2026, 7, 15)
    assert result.draft.day_attachment_page_ids == ["p1"]
    assert len(result.draft.trades) >= 1
    assert result.draft.trades[0].instrument
    assert result.confidence.overall is not None
    assert 0.0 <= result.confidence.overall <= 1.0
    assert result.review_item.status == "pending_review"
    assert result.review_item.requires_human_review is True
    assert "draft" in result.structured_json
    assert "confidence" in result.structured_json
    assert result.ocr_pages[0].engine.endswith("sidecar")


@pytest.mark.asyncio
async def test_pipeline_empty_ocr_still_reaches_review_queue() -> None:
    result = await run_pipeline(
        [
            PipelineImage(
                page_id="p1",
                page_index=0,
                file_name="scan.png",
                mime_type="image/png",
                data=PNG_1X1,
            )
        ],
        options=PipelineOptions(journal_date=date(2026, 8, 1), title="Blank scan"),
    )
    assert result.review_item.status == "pending_review"
    assert result.draft.journal_date == date(2026, 8, 1)
    assert any(s.stage == PipelineStage.REVIEW_QUEUE for s in result.stages)


@pytest.mark.asyncio
async def test_pipeline_multipage_links_all_attachments(tmp_path: Path) -> None:
    images: list[PipelineImage] = []
    for i in range(2):
        img = tmp_path / f"page{i}.png"
        txt = tmp_path / f"page{i}.txt"
        img.write_bytes(PNG_1X1)
        content = SAMPLE_JOURNAL_MARKDOWN if i == 0 else "## Extra notes\nFollow-through weak."
        txt.write_text(content, encoding="utf-8")
        images.append(
            PipelineImage(
                page_id=f"p{i}",
                page_index=i,
                file_name=img.name,
                mime_type="image/png",
                path=img,
            )
        )

    result = await run_pipeline(
        images,
        options=PipelineOptions(journal_date=date(2026, 7, 15), title="Multi", job_id="j2"),
        ocr_engine=LocalOcrEngine(),
    )
    linked = set(result.draft.day_attachment_page_ids)
    for trade in result.draft.trades:
        linked.update(trade.attachment_page_ids)
    assert {"p0", "p1"}.issubset(linked)
