"""AI Import Center ORM — notebook image import sessions (DB only).

Reuses existing trading_journal_* tables for committed journals.
These tables track sessions, pages/images, confidence, and review state.
"""

from __future__ import annotations

import enum
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


def _enum_values(enum_cls: type) -> list[str]:
    return [m.value for m in enum_cls]  # type: ignore[attr-defined]


class AiImportJobStatus(str, enum.Enum):
    """Pipeline lifecycle for a notebook import session."""

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


class AiImportReviewStatus(str, enum.Enum):
    """Human review state (orthogonal to pipeline status)."""

    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMMITTED = "committed"


class AiImportPageStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PREPROCESSED = "preprocessed"
    OCR_DONE = "ocr_done"
    FAILED = "failed"


class AiImportDraftSource(str, enum.Enum):
    MODEL = "model"
    USER_EDIT = "user_edit"
    SYSTEM = "system"


class AiImportEventLevel(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class AiImportJob(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """One import session for a handwritten notebook (batch of pages)."""

    __tablename__ = "ai_import_jobs"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "content_fingerprint",
            name="uk_ai_import_jobs_user_fingerprint",
        ),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notebook_label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[AiImportJobStatus] = mapped_column(
        Enum(
            AiImportJobStatus,
            name="ai_import_job_status",
            native_enum=False,
            length=32,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AiImportJobStatus.QUEUED,
        server_default=AiImportJobStatus.QUEUED.value,
        index=True,
    )
    review_status: Mapped[AiImportReviewStatus] = mapped_column(
        Enum(
            AiImportReviewStatus,
            name="ai_import_review_status",
            native_enum=False,
            length=32,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AiImportReviewStatus.PENDING,
        server_default=AiImportReviewStatus.PENDING.value,
        index=True,
    )
    current_stage: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # Aggregate confidence 0.0–1.0 (from latest validated/edited draft)
    overall_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Latest draft snapshot (full JournalDraft JSON); versions table keeps history
    draft_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    draft_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # Detected / user-confirmed target journal date (helps conflict checks)
    detected_journal_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # Set after successful commit into existing trading_journal_days (no FK — avoids cycle
    # with trading_journal_days.ai_import_job_id). Application keeps both sides in sync.
    committed_journal_day_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )

    # Knowledge Import Engine — parser / destination (defaults preserve Trading UX)
    parser_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="trading", server_default="trading", index=True
    )
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    destination_module: Mapped[str] = mapped_column(
        String(32), nullable=False, default="trading", server_default="trading", index=True
    )
    # User must explicitly confirm destination on Understanding screen before Review/Save.
    destination_confirmed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    review_schema_version: Mapped[str | None] = mapped_column(String(32), nullable=True)

    model_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    pages: Mapped[list[AiImportPage]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="AiImportPage.page_index",
    )
    draft_versions: Mapped[list[AiImportDraftVersion]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="AiImportDraftVersion.version",
    )
    events: Mapped[list[AiImportEvent]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="AiImportEvent.created_at",
    )


class AiImportPage(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """One notebook page image belonging to an import session."""

    __tablename__ = "ai_import_pages"
    __table_args__ = (
        UniqueConstraint("job_id", "page_index", name="uk_ai_import_pages_job_index"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_import_jobs.id", ondelete="CASCADE"), index=True
    )
    page_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # Image storage (under media_root/ai_imports/...)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    byte_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    status: Mapped[AiImportPageStatus] = mapped_column(
        Enum(
            AiImportPageStatus,
            name="ai_import_page_status",
            native_enum=False,
            length=32,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AiImportPageStatus.UPLOADED,
        server_default=AiImportPageStatus.UPLOADED.value,
        index=True,
    )
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ocr_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    job: Mapped[AiImportJob] = relationship(back_populates="pages")


class AiImportDraftVersion(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Versioned structured draft + confidence before/while reviewing."""

    __tablename__ = "ai_import_draft_versions"
    __table_args__ = (
        UniqueConstraint("job_id", "version", name="uk_ai_import_draft_versions_job_ver"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_import_jobs.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[AiImportDraftSource] = mapped_column(
        Enum(
            AiImportDraftSource,
            name="ai_import_draft_source",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AiImportDraftSource.MODEL,
        server_default=AiImportDraftSource.MODEL.value,
    )
    draft_json: Mapped[str] = mapped_column(Text, nullable=False)
    # Field/section-level confidence map (JSON string)
    confidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    overall_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    job: Mapped[AiImportJob] = relationship(back_populates="draft_versions")


class AiImportEvent(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Audit / pipeline event log for an import session."""

    __tablename__ = "ai_import_events"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_import_jobs.id", ondelete="CASCADE"), index=True
    )
    stage: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    level: Mapped[AiImportEventLevel] = mapped_column(
        Enum(
            AiImportEventLevel,
            name="ai_import_event_level",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AiImportEventLevel.INFO,
        server_default=AiImportEventLevel.INFO.value,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    job: Mapped[AiImportJob] = relationship(back_populates="events")


class AiKnowledgeInboxStatus(str, enum.Enum):
    QUEUED = "queued"
    ASSIGNED = "assigned"
    ROUTED = "routed"
    DISMISSED = "dismissed"


class AiKnowledgeInboxItem(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Unmatched / low-confidence imports awaiting a destination module."""

    __tablename__ = "ai_knowledge_inbox_items"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ai_import_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    parser_type: Mapped[str] = mapped_column(String(32), nullable=False, default="general")
    suggested_destination: Mapped[str | None] = mapped_column(String(32), nullable=True)
    chosen_destination: Mapped[str | None] = mapped_column(String(32), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    draft_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=AiKnowledgeInboxStatus.QUEUED.value, index=True
    )
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    routed_journal_day_id: Mapped[str | None] = mapped_column(String(36), nullable=True)


class AiImportCorrection(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """User destination corrections — feed for future classifier learning."""

    __tablename__ = "ai_import_corrections"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    inbox_item_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    predicted_parser_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    predicted_destination: Mapped[str | None] = mapped_column(String(32), nullable=True)
    chosen_parser_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    chosen_destination: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
