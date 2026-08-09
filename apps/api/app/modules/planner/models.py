"""Daily Planner ORM models."""

from __future__ import annotations

import enum
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


class TaskPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"
    CANCELLED = "cancelled"


class HabitCadence(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"


class DailyPlan(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "daily_plans"
    __table_args__ = (UniqueConstraint("user_id", "plan_date", name="uk_daily_plans_user_date"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    morning_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    time_blocks: Mapped[list[TimeBlock]] = relationship(back_populates="daily_plan", cascade="all, delete-orphan")
    checklist_items: Mapped[list[ChecklistItem]] = relationship(
        back_populates="daily_plan", cascade="all, delete-orphan"
    )


class TimeBlock(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "time_blocks"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    daily_plan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("daily_plans.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    daily_plan: Mapped[DailyPlan] = relationship(back_populates="time_blocks")


class ChecklistItem(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "checklist_items"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    daily_plan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("daily_plans.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    daily_plan: Mapped[DailyPlan] = relationship(back_populates="checklist_items")


class MorningRoutineItem(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "morning_routine_items"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")


class MorningRoutineLog(Base, PrimaryKeyMixin):
    __tablename__ = "morning_routine_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "routine_item_id", "log_date", name="uk_morning_routine_logs"),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    routine_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("morning_routine_items.id", ondelete="CASCADE"), index=True
    )
    log_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PlannerTask(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "planner_tasks"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="planner_task_status", native_enum=False, length=16),
        nullable=False,
        default=TaskStatus.TODO,
        server_default=TaskStatus.TODO.value,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, name="planner_task_priority", native_enum=False, length=16),
        nullable=False,
        default=TaskPriority.MEDIUM,
        server_default=TaskPriority.MEDIUM.value,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    scheduled_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    recurrence_rule: Mapped[str | None] = mapped_column(String(64), nullable=True)  # none|daily|weekly|weekdays
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Habit(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "habits"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    cadence: Mapped[HabitCadence] = mapped_column(
        Enum(HabitCadence, name="habit_cadence", native_enum=False, length=16),
        nullable=False,
        default=HabitCadence.DAILY,
        server_default=HabitCadence.DAILY.value,
    )
    target_per_period: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)


class HabitLog(Base, PrimaryKeyMixin):
    __tablename__ = "habit_logs"
    __table_args__ = (UniqueConstraint("user_id", "habit_id", "log_date", name="uk_habit_logs"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    habit_id: Mapped[str] = mapped_column(String(36), ForeignKey("habits.id", ondelete="CASCADE"), index=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
