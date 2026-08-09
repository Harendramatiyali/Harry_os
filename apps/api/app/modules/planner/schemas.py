"""Daily Planner Pydantic schemas."""

from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TaskPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskStatus(str, Enum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"
    CANCELLED = "cancelled"


class HabitCadence(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"


class RecurrenceRule(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    WEEKDAYS = "weekdays"


# ---- Daily plan ----

class DailyPlanUpdate(BaseModel):
    notes: str | None = None
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)
    morning_completed: bool | None = None


class DailyPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_date: date
    notes: str | None
    mood: int | None
    energy: int | None
    morning_completed: bool
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


# ---- Time blocks ----

class TimeBlockCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=64)
    start_time: time
    end_time: time
    sort_order: int = 0


class TimeBlockUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_done: bool | None = None
    sort_order: int | None = None


class TimeBlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    daily_plan_id: str
    title: str
    category: str | None
    start_time: time
    end_time: time
    is_done: bool
    sort_order: int


# ---- Checklist ----

class ChecklistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    sort_order: int = 0


class ChecklistUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    is_done: bool | None = None
    sort_order: int | None = None


class ChecklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    daily_plan_id: str
    title: str
    is_done: bool
    sort_order: int


# ---- Morning routine ----

class MorningRoutineItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    sort_order: int = 0


class MorningRoutineItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    sort_order: int | None = None
    is_active: bool | None = None


class MorningRoutineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    sort_order: int
    is_active: bool


class MorningRoutineDayItem(BaseModel):
    id: str
    title: str
    sort_order: int
    is_done: bool


class MorningRoutineToggle(BaseModel):
    is_done: bool


# ---- Tasks ----

class PlannerTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    notes: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: date | None = None
    scheduled_date: date | None = None
    recurrence_rule: RecurrenceRule = RecurrenceRule.NONE


class PlannerTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    scheduled_date: date | None = None
    recurrence_rule: RecurrenceRule | None = None


class PlannerTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    notes: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    scheduled_date: date | None
    recurrence_rule: str | None
    completed_at: datetime | None
    created_at: datetime


# ---- Habits ----

class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    cadence: HabitCadence = HabitCadence.DAILY
    target_per_period: int = Field(default=1, ge=1, le=100)
    color: str | None = None


class HabitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    cadence: HabitCadence | None = None
    target_per_period: int | None = Field(default=None, ge=1, le=100)
    is_active: bool | None = None
    color: str | None = None


class HabitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    cadence: HabitCadence
    target_per_period: int
    is_active: bool
    color: str | None


class HabitDayItem(BaseModel):
    id: str
    name: str
    cadence: HabitCadence
    color: str | None
    is_done: bool
    streak: int = 0


class HabitToggle(BaseModel):
    is_done: bool = True


# ---- Aggregates ----

class DayViewOut(BaseModel):
    plan: DailyPlanOut
    time_blocks: list[TimeBlockOut]
    checklist: list[ChecklistOut]
    tasks: list[PlannerTaskOut]
    morning_routine: list[MorningRoutineDayItem]
    habits: list[HabitDayItem]


class CalendarDayOut(BaseModel):
    date: date
    has_plan: bool
    tasks_count: int
    blocks_count: int
    habits_done: int
    habits_total: int


class PlannerStatsOut(BaseModel):
    tasks_completed_7d: int
    tasks_created_7d: int
    completion_rate_7d: float
    habits_completed_7d: int
    time_blocks_done_7d: int
    morning_routine_days_7d: int
    current_habit_streak_best: int
