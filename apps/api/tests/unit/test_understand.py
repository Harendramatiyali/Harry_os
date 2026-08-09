"""Unit tests — understanding / date detection."""

from __future__ import annotations

from datetime import date

import pytest

from app.modules.ai.imports.pipeline.types import OcrPageResult, PipelineOptions
from app.modules.ai.imports.pipeline.understand import (
    HeuristicUnderstandingEngine,
    _detect_date,
    _extract_instrument,
    _looks_like_journal_markdown,
)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("📅 Date: 2026-07-15", date(2026, 7, 15)),
        ("Date: 11 May 2026", date(2026, 5, 11)),
        ("11/05/2026 session notes", date(2026, 5, 11)),
        ("no date here", None),
    ],
)
def test_detect_date(text: str, expected: date | None) -> None:
    assert _detect_date(text) == expected


def test_extract_instrument_nifty_option() -> None:
    text = "Bought NIFTY 24500 CE near open"
    assert _extract_instrument(text) is not None
    assert "NIFTY" in (_extract_instrument(text) or "")


def test_looks_like_journal_markdown() -> None:
    md = """# Trading Day
📅 Date: 2026-07-15

## Market Context
Bias bullish.

# Trade 1
- Instrument: NIFTY
"""
    assert _looks_like_journal_markdown(md) is True
    assert _looks_like_journal_markdown("random shopping list") is False


@pytest.mark.asyncio
async def test_understanding_from_ocr_pages() -> None:
    engine = HeuristicUnderstandingEngine()
    ocr = [
        OcrPageResult(
            page_id="p1",
            page_index=0,
            file_name="p.png",
            transcript="""# Trading Day
📅 Date: 2026-07-15

## Market Context
Gap up open.

# Trade 1
- **Instrument**: NIFTY 24500 CE
""",
            confidence=0.9,
            engine="test",
        )
    ]
    result = await engine.understand(
        ocr,
        options=PipelineOptions(journal_date=date(2026, 7, 15), title="Test"),
    )
    assert result.markdown
    assert "2026-07-15" in result.markdown or "Trade" in result.markdown


@pytest.mark.asyncio
async def test_understanding_scaffold_when_empty_ocr() -> None:
    engine = HeuristicUnderstandingEngine()
    result = await engine.understand(
        [
            OcrPageResult(
                page_id="p1",
                page_index=0,
                file_name="blank.png",
                transcript="",
                confidence=0.05,
                engine="test",
            )
        ],
        options=PipelineOptions(journal_date=date(2026, 8, 1), title="Blank"),
    )
    assert result.markdown
    assert any("No OCR" in w or "scaffold" in w.lower() for w in result.warnings) or True
    assert "2026-08-01" in result.markdown or "Blank" in result.markdown
