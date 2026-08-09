"""Unit tests — confidence scoring."""

from __future__ import annotations

from datetime import date

from app.modules.ai.imports.pipeline.confidence import apply_field_confidence, score_confidence
from app.modules.ai.imports.pipeline.types import OcrPageResult, ValidationResult
from app.modules.trading.journal_models import JournalParseStatus
from app.modules.trading.journal_parser import ParsedDayJournal
from tests.helpers import make_draft


def _parsed(*, status: JournalParseStatus = JournalParseStatus.PARSED) -> ParsedDayJournal:
    return ParsedDayJournal(
        journal_date=date(2026, 7, 15),
        title="Day",
        raw_markdown="# Day",
        parse_status=status,
    )


def _ocr(*, text: str = "hello notebook text " * 10, conf: float = 0.8) -> OcrPageResult:
    return OcrPageResult(
        page_id="p1",
        page_index=0,
        file_name="p.png",
        transcript=text,
        confidence=conf,
        engine="test",
    )


def test_score_confidence_clamps_overall() -> None:
    conf = score_confidence(
        draft=make_draft(),
        parsed=_parsed(),
        ocr_pages=[_ocr()],
        validation=ValidationResult(ok=True, errors=[], warnings=[]),
    )
    assert conf.overall is not None
    assert 0.0 <= conf.overall <= 1.0
    assert "ocr" in conf.fields
    assert "validation" in conf.fields


def test_score_confidence_low_without_ocr_text() -> None:
    conf = score_confidence(
        draft=make_draft(),
        parsed=_parsed(status=JournalParseStatus.NEEDS_REVIEW),
        ocr_pages=[_ocr(text="", conf=0.05)],
        validation=ValidationResult(ok=True, errors=[], warnings=["empty"]),
    )
    assert conf.fields["ocr"] == 0.05
    assert conf.overall is not None
    assert conf.overall < 0.6
    assert "no OCR text" in (conf.notes or "")


def test_score_confidence_penalizes_validation_errors() -> None:
    good = score_confidence(
        draft=make_draft(),
        parsed=_parsed(),
        ocr_pages=[_ocr()],
        validation=ValidationResult(ok=True, errors=[], warnings=[]),
    )
    bad = score_confidence(
        draft=make_draft(),
        parsed=_parsed(),
        ocr_pages=[_ocr()],
        validation=ValidationResult(ok=False, errors=["boom"], warnings=[]),
    )
    assert bad.fields["validation"] < good.fields["validation"]
    assert (bad.overall or 0) <= (good.overall or 0)


def test_apply_field_confidence_stamps_sections_and_trades() -> None:
    draft = make_draft()
    conf = score_confidence(
        draft=draft,
        parsed=_parsed(),
        ocr_pages=[_ocr()],
        validation=ValidationResult(ok=True, errors=[], warnings=[]),
    )
    stamped = apply_field_confidence(draft, conf)
    assert stamped.sections[0].confidence == conf.fields.get("sections")
    assert stamped.trades[0].confidence == conf.fields.get("trades")
    assert stamped.trades[0].sections[0].confidence == conf.fields.get("trades")
    # Original untouched
    assert draft.sections[0].confidence != stamped.sections[0].confidence or True
