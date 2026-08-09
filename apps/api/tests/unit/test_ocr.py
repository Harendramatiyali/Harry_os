"""Unit tests — OCR engine helpers and LocalOcrEngine."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.modules.ai.imports.pipeline.ocr import (
    LocalOcrEngine,
    _looks_like_garbage,
    _score_transcript,
    run_ocr,
)
from app.modules.ai.imports.pipeline.types import PipelineImage
from tests.helpers import PNG_1X1


@pytest.mark.parametrize(
    ("text", "expected_min", "expected_max"),
    [
        ("", 0.0, 0.1),
        ("[filename] scan.png", 0.15, 0.25),
        ("short note text here", 0.3, 0.6),
        ("x" * 100, 0.7, 0.8),
        ("x" * 250, 0.8, 0.9),
    ],
)
def test_score_transcript_ranges(text: str, expected_min: float, expected_max: float) -> None:
    score = _score_transcript(text)
    assert expected_min <= score <= expected_max


@pytest.mark.parametrize(
    ("text", "is_garbage"),
    [
        ("", True),
        ("abc", True),
        ("a b c d e f g h i j", True),  # mostly single-char tokens
        ("NIFTY opened gap up with strong bullish continuation on the breakout.", False),
    ],
)
def test_looks_like_garbage(text: str, is_garbage: bool) -> None:
    assert _looks_like_garbage(text) is is_garbage


@pytest.mark.asyncio
async def test_ocr_prefers_sidecar(tmp_path: Path) -> None:
    img = tmp_path / "note.png"
    txt = tmp_path / "note.txt"
    img.write_bytes(PNG_1X1)
    txt.write_text("Market Context\nNIFTY bias bullish today for the session.", encoding="utf-8")

    result = await LocalOcrEngine().extract(
        PipelineImage(
            page_id="p1",
            page_index=0,
            file_name="note.png",
            mime_type="image/png",
            path=img,
        )
    )
    assert "NIFTY" in result.transcript
    assert result.engine.endswith("sidecar")
    assert result.confidence and result.confidence >= 0.9


@pytest.mark.asyncio
async def test_ocr_filename_fallback_with_date_hint() -> None:
    result = await LocalOcrEngine().extract(
        PipelineImage(
            page_id="p1",
            page_index=0,
            file_name="WhatsApp_2026-07-11_scan.jpg",
            mime_type="image/jpeg",
            data=PNG_1X1,
        )
    )
    assert result.engine.endswith("fallback")
    assert "2026-07-11" in result.transcript
    assert "[filename]" in result.transcript
    assert result.confidence == 0.2


@pytest.mark.asyncio
async def test_run_ocr_orders_by_page_index(tmp_path: Path) -> None:
    pages: list[PipelineImage] = []
    for idx, name in ((1, "b.png"), (0, "a.png")):
        path = tmp_path / name
        path.write_bytes(PNG_1X1)
        path.with_suffix(".txt").write_text(f"page-{idx}", encoding="utf-8")
        pages.append(
            PipelineImage(
                page_id=f"p{idx}",
                page_index=idx,
                file_name=name,
                mime_type="image/png",
                path=path,
            )
        )
    results = await run_ocr(pages, engine=LocalOcrEngine())
    assert [r.page_index for r in results] == [0, 1]
    assert results[0].transcript == "page-0"
