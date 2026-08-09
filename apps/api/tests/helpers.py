"""Shared helpers for AI Import Center tests."""

from __future__ import annotations

import base64
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

from app.modules.ai.imports.schemas import (
    ConfidenceMap,
    JournalDraft,
    JournalDraftSection,
    JournalDraftTrade,
    JournalDraftTradeSection,
)
from app.modules.auth.models import User, UserRole

# 1×1 PNG
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

SAMPLE_JOURNAL_MARKDOWN = """# Trading Day
📅 Date: 2026-07-15

## Market Context
NIFTY opened gap up. Bias bullish.

# Trade 1
- **Instrument**: NIFTY 24500 CE
- **Quantity**: 65
- **Entry**: 120
- **Exit**: 145
- **Result**: win

## Trade Setup
Breakout continuation.
"""


def make_user(
    *,
    user_id: str = "user-test-1",
    email: str = "tester@harryos.in",
    role: UserRole = UserRole.USER,
) -> User:
    """Build a detached User-like object for dependency overrides."""
    now = datetime.now(timezone.utc)
    return User(
        id=user_id,
        email=email,
        password_hash="unused",
        display_name="Test User",
        role=role,
        timezone="UTC",
        base_currency="INR",
        is_active=True,
        created_at=now,
        updated_at=now,
        deleted_at=None,
    )


def make_draft(
    *,
    journal_date: date = date(2026, 7, 15),
    title: str | None = "Notebook Jul 15",
    page_ids: list[str] | None = None,
    with_trade: bool = True,
    with_section: bool = True,
) -> JournalDraft:
    pages = page_ids or ["page-1"]
    sections = (
        [
            JournalDraftSection(
                section_key="market_context",
                heading_original="Market Context",
                body_markdown="NIFTY gap up.",
                sort_order=0,
                confidence=0.7,
            )
        ]
        if with_section
        else []
    )
    trades = (
        [
            JournalDraftTrade(
                trade_index=1,
                instrument="NIFTY 24500 CE",
                direction="long",
                quantity=Decimal("65"),
                entry_price=Decimal("120"),
                exit_price=Decimal("145"),
                result="win",
                pnl=Decimal("1625"),
                grade="A",
                sections=[
                    JournalDraftTradeSection(
                        section_key="setup",
                        heading_original="Trade Setup",
                        body_markdown="Breakout.",
                        sort_order=0,
                    )
                ],
                attachment_page_ids=[],
                confidence=0.65,
            )
        ]
        if with_trade
        else []
    )
    return JournalDraft(
        journal_date=journal_date,
        title=title,
        market="NSE",
        primary_instrument="NIFTY",
        day_bias="bullish",
        overall_grade="A",
        tags=["session"],
        sections=sections,
        trades=trades,
        day_attachment_page_ids=list(pages),
    )


def make_confidence(*, overall: float = 0.72) -> ConfidenceMap:
    return ConfidenceMap(
        overall=overall,
        journal_date=0.9,
        fields={
            "ocr": 0.8,
            "title": 0.7,
            "journal_date": 0.9,
            "sections": 0.6,
            "trades": 0.5,
            "instruments": 0.7,
            "attachments": 0.9,
            "parse_status": 0.85,
            "validation": 0.85,
        },
        notes="test confidence",
    )


def section_ns(*, heading: str = "Market Context", body: str = "Body") -> SimpleNamespace:
    return SimpleNamespace(heading_original=heading, body_markdown=body, section_key="market_context")
