"""AI Import Center request/response schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ImportJobStatus(str, Enum):
    QUEUED = "queued"
    PREPROCESSING = "preprocessing"
    OCR = "ocr"
    STRUCTURING = "structuring"
    VALIDATION = "validation"
    AWAITING_REVIEW = "awaiting_review"
    COMMITTING = "committing"
    COMMITTED = "committed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ImportReviewStatus(str, Enum):
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMMITTED = "committed"


class ImportPageStatus(str, Enum):
    UPLOADED = "uploaded"
    PREPROCESSED = "preprocessed"
    OCR_DONE = "ocr_done"
    FAILED = "failed"


# —— Draft (preview / commit payload) ——


class JournalDraftSection(BaseModel):
    section_key: str = "uncategorized"
    heading_original: str | None = None
    body_markdown: str = ""
    sort_order: int = 0
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class JournalDraftTradeSection(BaseModel):
    section_key: str = "uncategorized"
    heading_original: str | None = None
    body_markdown: str = ""
    sort_order: int = 0
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class JournalDraftTrade(BaseModel):
    trade_index: int = Field(ge=1)
    title_suffix: str | None = None
    instrument: str | None = None
    direction: str | None = None
    quantity: Decimal | None = None
    entry_price: Decimal | None = None
    exit_price: Decimal | None = None
    stop_price: Decimal | None = None
    result: str | None = None
    pnl: Decimal | None = None
    setup: str | None = None
    grade: str | None = None
    dqs_score: int | None = None
    dqs_max: int | None = None
    raw_markdown: str = ""
    sections: list[JournalDraftTradeSection] = Field(default_factory=list)
    attachment_page_ids: list[str] = Field(default_factory=list)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class JournalDraft(BaseModel):
    """Structured draft mirroring trading_journal_* before commit."""

    journal_date: date
    title: str | None = None
    market: str | None = None
    primary_instrument: str | None = None
    day_bias: str | None = None
    day_result: str | None = None
    day_pnl: Decimal | None = None
    daily_rating: Decimal | None = None
    overall_grade: str | None = None
    tags: list[str] = Field(default_factory=list)
    uncategorized_markdown: str | None = None
    sections: list[JournalDraftSection] = Field(default_factory=list)
    trades: list[JournalDraftTrade] = Field(default_factory=list)
    day_attachment_page_ids: list[str] = Field(default_factory=list)


class ConfidenceMap(BaseModel):
    overall: float | None = Field(default=None, ge=0.0, le=1.0)
    journal_date: float | None = Field(default=None, ge=0.0, le=1.0)
    fields: dict[str, float] = Field(default_factory=dict)
    notes: str | None = None


# —— Session ——


class ImportJobCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    notebook_label: str | None = Field(default=None, max_length=255)
    detected_journal_date: date | None = None


class ImportPageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    page_index: int
    original_file_name: str | None
    mime_type: str | None
    byte_size: int | None
    checksum: str | None
    status: str
    quality_score: float | None
    ocr_confidence: float | None
    has_ocr_transcript: bool = False
    created_at: datetime
    updated_at: datetime


class ImportJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str | None
    notebook_label: str | None
    status: str
    review_status: str
    current_stage: str | None
    page_count: int
    overall_confidence: float | None
    draft_version: int
    detected_journal_date: date | None
    committed_journal_day_id: str | None
    parser_type: str = "trading"
    classification_confidence: float | None = None
    destination_module: str = "trading"
    destination_confirmed: bool = False
    review_schema_version: str | None = None
    model_id: str | None
    prompt_version: str | None
    error_code: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class ReviewFieldOut(BaseModel):
    key: str
    label: str
    field_type: str
    required: bool = False
    group: str = "main"
    description: str | None = None
    options: list[str] = Field(default_factory=list)


class ClassificationOut(BaseModel):
    parser_type: str
    confidence: float
    destination: str
    reasons: list[str] = Field(default_factory=list)


class ImportJobStatusOut(ImportJobOut):
    """Status poll payload — includes draft presence + confidence map."""

    has_draft: bool = False
    confidence: ConfidenceMap | None = None
    pages: list[ImportPageOut] = Field(default_factory=list)
    draft: JournalDraft | None = None
    review_fields: list[ReviewFieldOut] = Field(default_factory=list)


class ImportPreviewRequest(BaseModel):
    """Optional overrides when generating a preview draft."""

    journal_date: date | None = None
    title: str | None = Field(default=None, max_length=255)
    parser_type: str | None = Field(
        default=None,
        max_length=32,
        description="Force a parser (default: auto-classify with Trading bias).",
    )


class ImportPreviewOut(BaseModel):
    job: ImportJobOut
    draft: JournalDraft
    confidence: ConfidenceMap
    draft_version: int
    warnings: list[str] = Field(default_factory=list)
    parser_type: str = "trading"
    classification: ClassificationOut | None = None
    review_fields: list[ReviewFieldOut] = Field(default_factory=list)


class ImportCommitRequest(BaseModel):
    """Save Journal — optional draft override; otherwise uses stored preview draft."""

    draft: JournalDraft | None = None
    approve: bool = True
    # Internal / Classify Later only — not exposed on Review happy path.
    save_to_inbox: bool = False
    destination_module: str | None = Field(
        default=None,
        description="Optional destination override: trading | inbox | …",
    )


class ImportCommitOut(BaseModel):
    job_id: str
    journal_day_id: str | None = None
    journal_date: date | None = None
    status: str
    review_status: str
    trade_count: int = 0
    section_count: int = 0
    attachment_count: int = 0
    destination: str = "trading"
    inbox_item_id: str | None = None
    message: str | None = None


class ConfirmDestinationRequest(BaseModel):
    """User confirms AI suggestion or picks an alternative before Review."""

    destination_module: str = Field(
        ...,
        max_length=32,
        description="trading | books | finance | health | planner | knowledge | inbox",
    )
    parser_type: str | None = Field(
        default=None,
        max_length=32,
        description="Optional parser override; derived from destination when omitted.",
    )
    classify_later: bool = False


class ConfirmDestinationOut(BaseModel):
    job: ImportJobOut
    preview: ImportPreviewOut | None = None
    inbox_item_id: str | None = None
    message: str
