"""Structured Trading Day Journal models (M1 schema).

Narrative Obsidian journals migrate here in M2+.
Existing `trades` ledger remains separate; optional `ledger_trade_id` links later.
"""

from __future__ import annotations

import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin
from app.modules.trading.models import TradeDirection


def _enum_values(enum_cls: type) -> list[str]:
    return [m.value for m in enum_cls]  # type: ignore[attr-defined]


class JournalSource(str, enum.Enum):
    OBSIDIAN = "obsidian"
    NATIVE = "native"


class JournalParseStatus(str, enum.Enum):
    PARSED = "parsed"
    PARTIAL = "partial"
    NEEDS_REVIEW = "needs_review"


class JournalPublishStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class DaySectionKey(str, enum.Enum):
    MARKET_CONTEXT = "market_context"
    MARKET_OBSERVATION = "market_observation"
    PRE_MARKET = "pre_market"
    TRADING_PLAN = "trading_plan"
    INTRADAY_OBSERVATION = "intraday_observation"
    DAILY_LEARNING = "daily_learning"
    WHAT_WENT_WELL = "what_went_well"
    PSYCHOLOGY = "psychology"
    MISTAKES = "mistakes"
    LESSONS = "lessons"
    RULES_REINFORCED = "rules_reinforced"
    ACTION_ITEMS = "action_items"
    MENTOR_FEEDBACK = "mentor_feedback"
    IQ200_EVALUATION = "iq200_evaluation"
    CLOSING_NOTE = "closing_note"
    UNCATEGORIZED = "uncategorized"
    OTHER = "other"


class TradeSectionKey(str, enum.Enum):
    TRADE_SETUP = "trade_setup"
    ENTRY_LOGIC = "entry_logic"
    TRADE_MANAGEMENT = "trade_management"
    EXIT = "exit"
    ANALYSIS = "analysis"
    WHAT_WENT_WELL = "what_went_well"
    MISTAKES = "mistakes"
    ROOT_CAUSE = "root_cause"
    NEXT_TIME = "next_time"
    UNCATEGORIZED = "uncategorized"
    OTHER = "other"


class AttachmentImportStatus(str, enum.Enum):
    LINKED = "linked"
    COPIED = "copied"
    MISSING = "missing"


class TradingJournalDay(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """One structured trading journal day (aggregate root)."""

    __tablename__ = "trading_journal_days"
    __table_args__ = (
        UniqueConstraint("user_id", "journal_date", name="uk_trading_journal_days_user_date"),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    journal_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[JournalSource] = mapped_column(
        Enum(
            JournalSource,
            name="trading_journal_source",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=JournalSource.NATIVE,
        server_default=JournalSource.NATIVE.value,
        index=True,
    )
    knowledge_note_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("knowledge_notes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vault_path: Mapped[str | None] = mapped_column(String(1024), nullable=True, index=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    raw_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")

    market: Mapped[str | None] = mapped_column(String(64), nullable=True)
    primary_instrument: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    day_bias: Mapped[str | None] = mapped_column(String(64), nullable=True)
    day_result: Mapped[str | None] = mapped_column(String(64), nullable=True)
    day_pnl: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    daily_rating: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    overall_grade: Mapped[str | None] = mapped_column(String(4), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    tags_csv: Mapped[str | None] = mapped_column(String(512), nullable=True)
    parse_status: Mapped[JournalParseStatus] = mapped_column(
        Enum(
            JournalParseStatus,
            name="trading_journal_parse_status",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=JournalParseStatus.NEEDS_REVIEW,
        server_default=JournalParseStatus.NEEDS_REVIEW.value,
        index=True,
    )
    uncategorized_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    publish_status: Mapped[JournalPublishStatus] = mapped_column(
        Enum(
            JournalPublishStatus,
            name="trading_journal_publish_status",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=JournalPublishStatus.DRAFT,
        server_default=JournalPublishStatus.DRAFT.value,
        index=True,
    )
    # Freeform workspace extras (session type, mistake checklist, progress snapshot, etc.)
    workspace_meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional link when this day was committed from AI Import Center
    ai_import_job_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("ai_import_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    sections: Mapped[list[TradingJournalDaySection]] = relationship(
        back_populates="journal_day",
        cascade="all, delete-orphan",
        order_by="TradingJournalDaySection.sort_order",
    )
    trades: Mapped[list[TradingJournalTrade]] = relationship(
        back_populates="journal_day",
        cascade="all, delete-orphan",
        order_by="TradingJournalTrade.trade_index",
    )
    attachments: Mapped[list[TradingJournalAttachment]] = relationship(
        back_populates="journal_day",
        cascade="all, delete-orphan",
        order_by="TradingJournalAttachment.sort_order",
        foreign_keys="TradingJournalAttachment.journal_day_id",
    )


class TradingJournalDaySection(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trading_journal_day_sections"
    __table_args__ = (
        UniqueConstraint(
            "journal_day_id",
            "section_key",
            "sort_order",
            name="uk_trading_journal_day_sections_key_order",
        ),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    journal_day_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trading_journal_days.id", ondelete="CASCADE"), index=True
    )
    section_key: Mapped[DaySectionKey] = mapped_column(
        Enum(
            DaySectionKey,
            name="trading_journal_day_section_key",
            native_enum=False,
            length=32,
            values_callable=_enum_values,
        ),
        nullable=False,
        index=True,
    )
    heading_original: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    journal_day: Mapped[TradingJournalDay] = relationship(back_populates="sections")


class TradingJournalTrade(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """One trade block inside a journal day (Obsidian `# Trade N`)."""

    __tablename__ = "trading_journal_trades"
    __table_args__ = (
        UniqueConstraint("journal_day_id", "trade_index", name="uk_trading_journal_trades_day_index"),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    journal_day_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trading_journal_days.id", ondelete="CASCADE"), index=True
    )
    trade_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title_suffix: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instrument: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    direction: Mapped[TradeDirection | None] = mapped_column(
        Enum(
            TradeDirection,
            name="trade_direction",
            native_enum=False,
            length=8,
            values_callable=_enum_values,
        ),
        nullable=True,
    )
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    entry_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    exit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    stop_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    result: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pnl: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    setup: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    grade: Mapped[str | None] = mapped_column(String(4), nullable=True)
    dqs_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dqs_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ledger_trade_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trades.id", ondelete="SET NULL"), nullable=True, index=True
    )
    raw_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")

    journal_day: Mapped[TradingJournalDay] = relationship(back_populates="trades")
    sections: Mapped[list[TradingJournalTradeSection]] = relationship(
        back_populates="journal_trade",
        cascade="all, delete-orphan",
        order_by="TradingJournalTradeSection.sort_order",
    )
    attachments: Mapped[list[TradingJournalAttachment]] = relationship(
        back_populates="journal_trade",
        cascade="all, delete-orphan",
        order_by="TradingJournalAttachment.sort_order",
        foreign_keys="TradingJournalAttachment.journal_trade_id",
    )


class TradingJournalTradeSection(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trading_journal_trade_sections"
    __table_args__ = (
        UniqueConstraint(
            "journal_trade_id",
            "section_key",
            "sort_order",
            name="uk_trading_journal_trade_sections_key_order",
        ),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    journal_trade_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trading_journal_trades.id", ondelete="CASCADE"), index=True
    )
    section_key: Mapped[TradeSectionKey] = mapped_column(
        Enum(
            TradeSectionKey,
            name="trading_journal_trade_section_key",
            native_enum=False,
            length=32,
            values_callable=_enum_values,
        ),
        nullable=False,
        index=True,
    )
    heading_original: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    journal_trade: Mapped[TradingJournalTrade] = relationship(back_populates="sections")


class TradingJournalAttachment(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trading_journal_attachments"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    journal_day_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trading_journal_days.id", ondelete="CASCADE"), index=True
    )
    journal_trade_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trading_journal_trades.id", ondelete="SET NULL"), nullable=True, index=True
    )
    obsidian_ref: Mapped[str] = mapped_column(String(512), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    caption: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    import_status: Mapped[AttachmentImportStatus] = mapped_column(
        Enum(
            AttachmentImportStatus,
            name="trading_journal_attachment_status",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AttachmentImportStatus.LINKED,
        server_default=AttachmentImportStatus.LINKED.value,
    )
    # Optional provenance when attachment originates from an AI import page image
    ai_import_page_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("ai_import_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    journal_day: Mapped[TradingJournalDay] = relationship(
        back_populates="attachments",
        foreign_keys=[journal_day_id],
    )
    journal_trade: Mapped[TradingJournalTrade | None] = relationship(
        back_populates="attachments",
        foreign_keys=[journal_trade_id],
    )


class TradingJournalParseRun(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Audit trail for Obsidian → structured journal migration (M2)."""

    __tablename__ = "trading_journal_parse_runs"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dry_run: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    scanned: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    skipped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    needs_review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
