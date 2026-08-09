"""Unit tests — parse stage + schemas."""

from __future__ import annotations

from datetime import date

from app.modules.ai.imports.pipeline.parse import parsed_to_draft, run_parse
from app.modules.ai.imports.pipeline.types import UnderstandingResult
from app.modules.ai.imports.schemas import ImportCommitRequest, ImportJobCreate, JournalDraft
from app.modules.trading.journal_parser import parse_trading_journal
from tests.helpers import SAMPLE_JOURNAL_MARKDOWN


def test_run_parse_extracts_trade_and_date() -> None:
    understanding = UnderstandingResult(
        markdown=SAMPLE_JOURNAL_MARKDOWN,
        engine="test",
        warnings=[],
    )
    result = run_parse(
        understanding,
        fallback_date=date(2026, 7, 15),
        title_hint="Notebook",
        page_ids=["p1"],
    )
    assert result.draft_partial.journal_date == date(2026, 7, 15)
    assert result.draft_partial.title
    assert len(result.draft_partial.trades) >= 1
    assert result.draft_partial.day_attachment_page_ids == ["p1"]


def test_run_parse_prefers_body_date_over_fallback() -> None:
    understanding = UnderstandingResult(
        markdown=SAMPLE_JOURNAL_MARKDOWN,
        engine="test",
        warnings=[],
    )
    result = run_parse(
        understanding,
        fallback_date=date(2026, 1, 1),
        title_hint=None,
        page_ids=["p1"],
    )
    assert result.draft_partial.journal_date == date(2026, 7, 15)


def test_parsed_to_draft_links_pages() -> None:
    parsed = parse_trading_journal(
        SAMPLE_JOURNAL_MARKDOWN,
        fallback_date=date(2026, 7, 15),
        title_hint="T",
    )
    draft = parsed_to_draft(
        parsed,
        fallback_date=date(2026, 7, 15),
        page_ids=["a", "b"],
        title_override="T",
    )
    assert draft.day_attachment_page_ids == ["a", "b"]
    assert isinstance(draft, JournalDraft)


def test_schema_import_job_create() -> None:
    body = ImportJobCreate(
        title="Monday",
        notebook_label="NB",
        detected_journal_date=date(2026, 7, 1),
    )
    assert body.title == "Monday"


def test_schema_commit_request_defaults() -> None:
    body = ImportCommitRequest()
    assert body.approve is True
    assert body.draft is None
