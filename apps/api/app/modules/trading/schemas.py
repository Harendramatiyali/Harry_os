"""Trading OS schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TradeDirection(str, Enum):
    LONG = "long"
    SHORT = "short"


class TradeStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class ReviewPeriod(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class TradeCreate(BaseModel):
    instrument: str = Field(min_length=1, max_length=64)
    direction: TradeDirection
    quantity: Decimal = Field(gt=0)
    entry_price: Decimal = Field(gt=0)
    exit_price: Decimal | None = Field(default=None, gt=0)
    opened_at: datetime
    closed_at: datetime | None = None
    fees: Decimal = Field(default=Decimal("0"), ge=0)
    stop_price: Decimal | None = None
    risk_amount: Decimal | None = Field(default=None, ge=0)
    setup: str | None = Field(default=None, max_length=64)
    thesis: str | None = None
    status: TradeStatus = TradeStatus.OPEN
    grade: str | None = Field(default=None, pattern="^[A-F]$")
    followed_plan: bool | None = None
    emotion_before: str | None = None
    emotion_after: str | None = None
    psychology_notes: str | None = None
    review_notes: str | None = None
    tags: list[str] = Field(default_factory=list)
    mistakes: list[str] = Field(default_factory=list)


class TradeUpdate(BaseModel):
    instrument: str | None = Field(default=None, min_length=1, max_length=64)
    direction: TradeDirection | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    entry_price: Decimal | None = Field(default=None, gt=0)
    exit_price: Decimal | None = None
    opened_at: datetime | None = None
    closed_at: datetime | None = None
    fees: Decimal | None = Field(default=None, ge=0)
    stop_price: Decimal | None = None
    risk_amount: Decimal | None = None
    setup: str | None = None
    thesis: str | None = None
    status: TradeStatus | None = None
    grade: str | None = Field(default=None, pattern="^[A-F]$")
    followed_plan: bool | None = None
    emotion_before: str | None = None
    emotion_after: str | None = None
    psychology_notes: str | None = None
    review_notes: str | None = None
    tags: list[str] | None = None
    mistakes: list[str] | None = None


class ScreenshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_name: str
    content_type: str
    byte_size: int
    caption: str | None
    created_at: datetime


class MistakeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trade_id: str | None
    category: str
    description: str
    severity: int
    occurred_on: date


class TradeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    instrument: str
    direction: TradeDirection
    quantity: Decimal
    entry_price: Decimal
    exit_price: Decimal | None
    opened_at: datetime
    closed_at: datetime | None
    fees: Decimal
    stop_price: Decimal | None
    risk_amount: Decimal | None
    r_multiple: Decimal | None
    pnl_gross: Decimal | None
    pnl_net: Decimal | None
    setup: str | None
    thesis: str | None
    status: TradeStatus
    grade: str | None
    followed_plan: bool | None
    emotion_before: str | None
    emotion_after: str | None
    psychology_notes: str | None
    review_notes: str | None
    tags: list[str] = Field(default_factory=list)
    mistakes: list[MistakeOut] = Field(default_factory=list)
    screenshots: list[ScreenshotOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class MistakeCreate(BaseModel):
    category: str = Field(min_length=1, max_length=64)
    description: str = Field(min_length=1)
    severity: int = Field(default=2, ge=1, le=5)
    occurred_on: date
    trade_id: str | None = None


class MistakeUpdate(BaseModel):
    category: str | None = None
    description: str | None = None
    severity: int | None = Field(default=None, ge=1, le=5)
    occurred_on: date | None = None


class PsychologyCreate(BaseModel):
    entry_date: date
    mood: str = Field(min_length=1, max_length=64)
    confidence: int = Field(default=3, ge=1, le=5)
    stress: int = Field(default=3, ge=1, le=5)
    discipline: int = Field(default=3, ge=1, le=5)
    notes: str | None = None
    trade_id: str | None = None


class PsychologyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trade_id: str | None
    entry_date: date
    mood: str
    confidence: int
    stress: int
    discipline: int
    notes: str | None
    created_at: datetime


class PeriodReviewCreate(BaseModel):
    period_type: ReviewPeriod
    period_start: date
    period_end: date
    title: str = Field(min_length=1, max_length=255)
    what_went_well: str | None = None
    what_to_improve: str | None = None
    focus_next: str | None = None
    grade: str | None = Field(default=None, pattern="^[A-F]$")


class PeriodReviewUpdate(BaseModel):
    title: str | None = None
    what_went_well: str | None = None
    what_to_improve: str | None = None
    focus_next: str | None = None
    grade: str | None = Field(default=None, pattern="^[A-F]$")


class PeriodReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    period_type: ReviewPeriod
    period_start: date
    period_end: date
    title: str
    what_went_well: str | None
    what_to_improve: str | None
    focus_next: str | None
    grade: str | None
    trades_count: int
    win_rate: Decimal | None
    net_pnl: Decimal | None
    avg_r: Decimal | None
    created_at: datetime


class EquityPoint(BaseModel):
    date: date
    equity: Decimal
    pnl: Decimal


class MistakeStat(BaseModel):
    category: str
    count: int


class MoodStat(BaseModel):
    mood: str
    count: int
    avg_pnl: Decimal | None = None


class TradingAnalytics(BaseModel):
    trades_count: int
    closed_count: int
    open_count: int
    winners: int
    losers: int
    # Closed trades with ~₹0 P&L (cost-to-cost / scratch) — not counted as win or loss
    breakevens: int = 0
    win_rate: float
    avg_r: float | None
    expectancy_r: float | None
    net_pnl: Decimal
    gross_pnl: Decimal
    fees_total: Decimal
    profit_factor: float | None
    best_trade: Decimal | None
    worst_trade: Decimal | None
    by_setup: list[dict]
    by_tag: list[dict]
    equity_curve: list[EquityPoint]
    mistake_stats: list[MistakeStat]
    psychology_stats: list[MoodStat]


class JournalMigrateRequest(BaseModel):
    """Migrate Knowledge trading_journal notes into structured day journals."""

    dry_run: bool = False
    note_ids: list[str] | None = None


class JournalMigrateItem(BaseModel):
    note_id: str
    title: str
    vault_path: str | None
    journal_date: date | None
    action: str  # create | update | skip | needs_review
    detail: str
    journal_day_id: str | None = None
    parse_status: str | None = None
    trade_count: int = 0
    section_count: int = 0
    attachment_count: int = 0
    warnings: list[str] = Field(default_factory=list)


class JournalMigrateReport(BaseModel):
    dry_run: bool
    scanned: int
    created: int
    updated: int
    skipped: int
    needs_review: int
    items: list[JournalMigrateItem] = Field(default_factory=list)


class JournalDaySectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    section_key: str
    heading_original: str | None
    body_markdown: str
    sort_order: int


class JournalTradeSectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    section_key: str
    heading_original: str | None
    body_markdown: str
    sort_order: int


class JournalAttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    journal_trade_id: str | None
    obsidian_ref: str
    file_name: str
    storage_path: str | None
    mime_type: str | None
    caption: str | None
    sort_order: int
    import_status: str


class JournalTradeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trade_index: int
    title_suffix: str | None
    instrument: str | None
    direction: TradeDirection | None
    quantity: Decimal | None
    entry_price: Decimal | None
    exit_price: Decimal | None
    stop_price: Decimal | None
    result: str | None
    pnl: Decimal | None
    setup: str | None
    grade: str | None
    dqs_score: int | None
    dqs_max: int | None
    ledger_trade_id: str | None
    raw_markdown: str
    sections: list[JournalTradeSectionOut] = Field(default_factory=list)
    attachments: list[JournalAttachmentOut] = Field(default_factory=list)


class JournalDaySummaryOut(BaseModel):
    """List-card fields for Day Journals (no full markdown bodies)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    journal_date: date
    title: str | None
    source: str
    parse_status: str
    publish_status: str = "published"
    market: str | None
    primary_instrument: str | None
    day_bias: str | None
    day_result: str | None
    day_pnl: Decimal | None
    daily_rating: Decimal | None
    overall_grade: str | None
    is_favorite: bool
    tags: list[str] = Field(default_factory=list)
    vault_path: str | None
    knowledge_note_id: str | None
    trade_count: int = 0
    section_count: int = 0
    attachment_count: int = 0
    created_at: datetime
    updated_at: datetime


class JournalDayOut(BaseModel):
    """Full structured day journal for the Day Journals reader."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    journal_date: date
    title: str | None
    source: str
    parse_status: str
    publish_status: str = "published"
    market: str | None
    primary_instrument: str | None
    day_bias: str | None
    day_result: str | None
    day_pnl: Decimal | None
    daily_rating: Decimal | None
    overall_grade: str | None
    is_favorite: bool
    tags: list[str] = Field(default_factory=list)
    vault_path: str | None
    knowledge_note_id: str | None
    content_hash: str | None
    raw_markdown: str
    uncategorized_markdown: str | None
    workspace_meta_json: str | None = None
    trade_count: int = 0
    section_count: int = 0
    attachment_count: int = 0
    sections: list[JournalDaySectionOut] = Field(default_factory=list)
    trades: list[JournalTradeOut] = Field(default_factory=list)
    attachments: list[JournalAttachmentOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class JournalSectionUpdate(BaseModel):
    id: str | None = None
    section_key: str | None = None
    body_markdown: str | None = None
    heading_original: str | None = None


class JournalTradeUpdateIn(BaseModel):
    id: str
    instrument: str | None = Field(default=None, max_length=64)
    direction: TradeDirection | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    entry_price: Decimal | None = Field(default=None, gt=0)
    exit_price: Decimal | None = None
    stop_price: Decimal | None = None
    result: str | None = Field(default=None, max_length=128)
    pnl: Decimal | None = None
    setup: str | None = Field(default=None, max_length=128)
    grade: str | None = Field(default=None, max_length=4)
    sections: list[JournalSectionUpdate] | None = None


class JournalDayCreate(BaseModel):
    """Create a native in-app trading journal day (draft by default)."""

    journal_date: date
    title: str | None = Field(default=None, max_length=255)
    market: str | None = Field(default=None, max_length=64)
    primary_instrument: str | None = Field(default=None, max_length=64)
    day_bias: str | None = Field(default=None, max_length=64)
    day_result: str | None = Field(default=None, max_length=64)
    day_pnl: Decimal | None = None
    overall_grade: str | None = Field(default=None, max_length=4)
    tags: list[str] = Field(default_factory=list)
    publish_status: str = "draft"
    workspace_meta_json: str | None = None
    allow_duplicate: bool = False


class JournalDayUpdate(BaseModel):
    """Partial update for an in-app journal edit session."""

    title: str | None = Field(default=None, max_length=255)
    market: str | None = Field(default=None, max_length=64)
    primary_instrument: str | None = Field(default=None, max_length=64)
    day_bias: str | None = Field(default=None, max_length=64)
    day_result: str | None = Field(default=None, max_length=64)
    day_pnl: Decimal | None = None
    daily_rating: Decimal | None = None
    overall_grade: str | None = Field(default=None, max_length=4)
    is_favorite: bool | None = None
    tags: list[str] | None = None
    uncategorized_markdown: str | None = None
    publish_status: str | None = None
    workspace_meta_json: str | None = None
    sections: list[JournalSectionUpdate] | None = None
    trades: list[JournalTradeUpdateIn] | None = None


class JournalMediaSyncReport(BaseModel):
    scanned: int
    copied: int
    missing: int
    already_copied: int
    vault_configured: bool


class JournalCountStat(BaseModel):
    key: str
    count: int


class JournalSetupStat(BaseModel):
    setup: str
    count: int
    wins: int
    losses: int
    unknowns: int


class JournalDayRatingPoint(BaseModel):
    date: date
    rating: Decimal | None
    overall_grade: str | None
    trade_count: int


class JournalAnalyticsOut(BaseModel):
    days_count: int
    trades_count: int
    wins: int
    losses: int
    scratches: int
    unknowns: int
    classified_win_rate: float | None
    avg_dqs: float | None
    promote_ready: int
    already_linked: int
    by_grade: list[JournalCountStat] = Field(default_factory=list)
    by_day_grade: list[JournalCountStat] = Field(default_factory=list)
    by_direction: list[JournalCountStat] = Field(default_factory=list)
    by_setup: list[JournalSetupStat] = Field(default_factory=list)
    by_instrument: list[JournalCountStat] = Field(default_factory=list)
    mistake_sections: int
    day_ratings: list[JournalDayRatingPoint] = Field(default_factory=list)


class JournalPromoteRequest(BaseModel):
    dry_run: bool = False
    journal_day_id: str | None = None
    journal_trade_ids: list[str] | None = None


class JournalPromoteItem(BaseModel):
    journal_trade_id: str
    journal_date: date | None = None
    instrument: str | None = None
    action: str
    detail: str | None = None
    ledger_trade_id: str | None = None


class JournalPromoteReport(BaseModel):
    dry_run: bool
    scanned: int
    created: int
    skipped: int
    failed: int
    items: list[JournalPromoteItem] = Field(default_factory=list)
