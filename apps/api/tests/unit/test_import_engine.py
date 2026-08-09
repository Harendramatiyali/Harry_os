"""Unit tests — Knowledge Import Engine (parser registry, classifier, trading adapter)."""

from __future__ import annotations

from datetime import date

import pytest

from app.modules.ai.import_engine.classifier import HeuristicDocumentClassifier
from app.modules.ai.import_engine.parsers import get_parser_registry, resolve_parser
from app.modules.ai.import_engine.parsers.trading import TradingParser
from app.modules.ai.import_engine.types import ParserType
from app.modules.ai.imports.pipeline.types import OcrPageResult, PipelineOptions, UnderstandingResult
from tests.helpers import SAMPLE_JOURNAL_MARKDOWN


def test_registry_contains_all_planned_parsers() -> None:
    reg = get_parser_registry()
    assert ParserType.TRADING in reg
    assert ParserType.BOOK in reg
    assert ParserType.GENERAL in reg
    assert len(reg) >= 10


def test_resolve_defaults_to_trading() -> None:
    p = resolve_parser(None)
    assert p.parser_type == ParserType.TRADING
    assert p.architecture_only is False


def test_trading_parser_extract_and_review_fields() -> None:
    parser = TradingParser()
    understanding = UnderstandingResult(markdown=SAMPLE_JOURNAL_MARKDOWN, engine="test")
    extracted = parser.extract(
        understanding,
        options=PipelineOptions(journal_date=date(2026, 7, 15), title="T"),
        page_ids=["p1"],
    )
    assert extracted.draft.journal_date == date(2026, 7, 15)
    assert extracted.trade_count >= 1
    fields = parser.review_fields()
    keys = {f.key for f in fields}
    assert "trades" in keys
    assert "sections" in keys


def test_classifier_detects_trading() -> None:
    clf = HeuristicDocumentClassifier()
    result = clf.classify(
        [
            OcrPageResult(
                page_id="p1",
                page_index=0,
                file_name="n.png",
                transcript="NIFTY Trade 1 Entry Exit Market Context",
                confidence=0.8,
                engine="t",
            )
        ]
    )
    assert result.parser_type == ParserType.TRADING
    assert result.confidence >= 0.55


def test_classifier_forced_type() -> None:
    clf = HeuristicDocumentClassifier()
    result = clf.classify([], forced_type="book")
    assert result.parser_type == ParserType.BOOK
    assert result.confidence == 1.0


@pytest.mark.asyncio
async def test_book_parser_is_architecture_only() -> None:
    parser = resolve_parser("book")
    assert parser.architecture_only is True
    with pytest.raises(Exception):
        await parser.save()
