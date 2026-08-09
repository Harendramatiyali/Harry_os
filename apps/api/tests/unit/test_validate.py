"""Unit tests — draft validation stage."""

from __future__ import annotations

from datetime import date, timedelta

from app.modules.ai.imports.pipeline.validate import validate_draft
from app.modules.ai.imports.schemas import JournalDraftTrade
from tests.helpers import make_draft


def test_validate_ok_with_linked_pages() -> None:
    draft = make_draft(page_ids=["p1", "p2"])
    result = validate_draft(draft, page_ids=["p1", "p2"], today=date(2026, 7, 20))
    assert result.ok is True
    assert result.errors == []


def test_validate_requires_journal_date() -> None:
    draft = make_draft()
    # Pydantic requires date — simulate missing via model_construct
    draft = draft.model_copy()
    object.__setattr__(draft, "journal_date", None)  # type: ignore[arg-type]
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert result.ok is False
    assert any("journal_date is required" in e for e in result.errors)


def test_validate_future_date_warns() -> None:
    today = date(2026, 7, 20)
    draft = make_draft(journal_date=today + timedelta(days=10))
    result = validate_draft(draft, page_ids=["page-1"], today=today)
    assert result.ok is True
    assert any("future" in w for w in result.warnings)


def test_validate_old_date_warns() -> None:
    draft = make_draft(journal_date=date(2010, 1, 1))
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert any("unusually old" in w for w in result.warnings)


def test_validate_empty_title_warns() -> None:
    draft = make_draft(title="   ")
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert any("title is empty" in w for w in result.warnings)


def test_validate_unknown_day_attachment_errors() -> None:
    draft = make_draft(page_ids=["ghost"])
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert result.ok is False
    assert any("unknown day attachment" in e for e in result.errors)


def test_validate_unknown_trade_attachment_errors() -> None:
    draft = make_draft(page_ids=["page-1"])
    draft.trades[0].attachment_page_ids = ["missing-page"]
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert result.ok is False
    assert any("unknown page_id" in e for e in result.errors)


def test_validate_invalid_trade_index() -> None:
    draft = make_draft(with_trade=False, page_ids=["page-1"])
    draft.trades.append(
        JournalDraftTrade(trade_index=1, instrument="NIFTY")  # valid for construct
    )
    # Force invalid index after construction
    draft.trades[0].trade_index = 0
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert result.ok is False
    assert any("invalid trade_index" in e for e in result.errors)


def test_validate_missing_instrument_warns() -> None:
    draft = make_draft(page_ids=["page-1"])
    draft.trades[0].instrument = None
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert any("missing instrument" in w for w in result.warnings)


def test_validate_empty_draft_warns() -> None:
    draft = make_draft(with_section=False, with_trade=False, page_ids=["page-1"])
    draft.uncategorized_markdown = None
    result = validate_draft(draft, page_ids=["page-1"], today=date(2026, 7, 20))
    assert any("no sections, trades" in w for w in result.warnings)


def test_validate_unlinked_pages_warn() -> None:
    draft = make_draft(page_ids=["page-1"])
    result = validate_draft(draft, page_ids=["page-1", "page-2"], today=date(2026, 7, 20))
    assert any("not linked" in w for w in result.warnings)
