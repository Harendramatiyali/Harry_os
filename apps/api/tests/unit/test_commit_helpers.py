"""Unit tests — commit helpers (no DB)."""

from __future__ import annotations

from app.modules.ai.imports.commit import (
    _day_section_key,
    _direction,
    _draft_raw_markdown,
    _keep_day_section,
    _parse_status_for_reviewed_draft,
    _tags_csv,
    _trade_section_key,
)
from app.modules.trading.journal_models import DaySectionKey, JournalParseStatus, TradeSectionKey
from app.modules.trading.models import TradeDirection
from tests.helpers import make_draft, section_ns


def test_tags_csv_strips_ingest_labels() -> None:
    assert _tags_csv(["ai_import", "notebook", "handwritten", "session"]) == "session"
    assert _tags_csv(["ai_import", "notebook"]) is None
    assert _tags_csv([]) is None


def test_direction_parsing() -> None:
    assert _direction("LONG") == TradeDirection.LONG
    assert _direction("short") == TradeDirection.SHORT
    assert _direction("sideways") is None
    assert _direction(None) is None


def test_section_key_fallbacks() -> None:
    assert _day_section_key("market_context") == DaySectionKey.MARKET_CONTEXT
    assert _day_section_key("not_a_real_key") == DaySectionKey.UNCATEGORIZED
    assert _trade_section_key("trade_setup") == TradeSectionKey.TRADE_SETUP
    assert _trade_section_key("???") == TradeSectionKey.UNCATEGORIZED


def test_keep_day_section_filters_ocr_scaffold() -> None:
    assert _keep_day_section(section_ns(heading="OCR Transcript", body="lots of text")) is False
    assert _keep_day_section(section_ns(heading="Notebook Import", body="x")) is False
    assert _keep_day_section(section_ns(heading="Date", body="📅 Date: 2026-07-15")) is False
    assert _keep_day_section(section_ns(heading="Market Context", body="Bias bullish")) is True


def test_parse_status_for_reviewed_draft() -> None:
    assert _parse_status_for_reviewed_draft(make_draft()) == JournalParseStatus.PARSED
    empty = make_draft(with_section=False, with_trade=False)
    empty.sections = []
    empty.trades = []
    assert _parse_status_for_reviewed_draft(empty) == JournalParseStatus.PARTIAL


def test_draft_raw_markdown_builds_native_journal_body() -> None:
    md = _draft_raw_markdown(make_draft())
    assert md.startswith("# Notebook Jul 15")
    assert "📅 Date: 2026-07-15" in md
    assert "## Market Context" in md
    assert "# Trade 1" in md
    assert "NIFTY 24500 CE" in md
    assert "OCR Transcript" not in md
