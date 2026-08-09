"""Trading OS ORM models."""

from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


class TradeDirection(str, enum.Enum):
    LONG = "long"
    SHORT = "short"


class TradeStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class ReviewPeriod(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Trade(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trades"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    instrument: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    direction: Mapped[TradeDirection] = mapped_column(
        Enum(TradeDirection, name="trade_direction", native_enum=False, length=8),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    exit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    fees: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0, server_default="0")
    stop_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    risk_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    r_multiple: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    pnl_gross: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    pnl_net: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    setup: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    thesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TradeStatus] = mapped_column(
        Enum(TradeStatus, name="trade_status", native_enum=False, length=16),
        nullable=False,
        default=TradeStatus.OPEN,
        server_default=TradeStatus.OPEN.value,
        index=True,
    )
    grade: Mapped[str | None] = mapped_column(String(1), nullable=True)
    followed_plan: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    emotion_before: Mapped[str | None] = mapped_column(String(64), nullable=True)
    emotion_after: Mapped[str | None] = mapped_column(String(64), nullable=True)
    psychology_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags_csv: Mapped[str | None] = mapped_column(String(512), nullable=True)

    mistakes: Mapped[list[TradeMistake]] = relationship(back_populates="trade", cascade="all, delete-orphan")
    screenshots: Mapped[list[TradeScreenshot]] = relationship(
        back_populates="trade", cascade="all, delete-orphan"
    )


class TradeMistake(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trade_mistakes"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    trade_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trades.id", ondelete="CASCADE"), nullable=True, index=True
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=2, server_default="2")
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    trade: Mapped[Trade | None] = relationship(back_populates="mistakes")


class PsychologyEntry(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "psychology_entries"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    trade_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trades.id", ondelete="SET NULL"), nullable=True, index=True
    )
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    mood: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    stress: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    discipline: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class TradeScreenshot(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trade_screenshots"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    trade_id: Mapped[str] = mapped_column(String(36), ForeignKey("trades.id", ondelete="CASCADE"), index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(255), nullable=True)

    trade: Mapped[Trade] = relationship(back_populates="screenshots")


class PeriodReview(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "period_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "period_type", "period_start", name="uk_period_reviews"),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    period_type: Mapped[ReviewPeriod] = mapped_column(
        Enum(ReviewPeriod, name="review_period", native_enum=False, length=16),
        nullable=False,
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    what_went_well: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_to_improve: Mapped[str | None] = mapped_column(Text, nullable=True)
    focus_next: Mapped[str | None] = mapped_column(Text, nullable=True)
    grade: Mapped[str | None] = mapped_column(String(1), nullable=True)
    trades_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    win_rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    net_pnl: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    avg_r: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)


# Structured day-journal schema (M1) — registered on Base.metadata via import
from app.modules.trading import journal_models as _journal_models  # noqa: E402, F401
