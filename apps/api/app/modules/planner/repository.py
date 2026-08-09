"""Daily Planner persistence."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repository import BaseRepository
from app.modules.planner.models import (
    ChecklistItem,
    DailyPlan,
    Habit,
    HabitLog,
    MorningRoutineItem,
    MorningRoutineLog,
    PlannerTask,
    TaskStatus,
    TimeBlock,
)


class DailyPlanRepository(BaseRepository[DailyPlan]):
    model = DailyPlan

    async def get_by_date(self, user_id: str, plan_date: date) -> DailyPlan | None:
        stmt = select(DailyPlan).where(
            DailyPlan.user_id == user_id,
            DailyPlan.plan_date == plan_date,
            DailyPlan.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def list_between(self, user_id: str, start: date, end: date) -> list[DailyPlan]:
        stmt = select(DailyPlan).where(
            DailyPlan.user_id == user_id,
            DailyPlan.plan_date >= start,
            DailyPlan.plan_date <= end,
            DailyPlan.deleted_at.is_(None),
        )
        return list(await self.session.scalars(stmt))


class TimeBlockRepository(BaseRepository[TimeBlock]):
    model = TimeBlock

    async def list_for_plan(self, user_id: str, daily_plan_id: str) -> list[TimeBlock]:
        stmt = (
            select(TimeBlock)
            .where(
                TimeBlock.user_id == user_id,
                TimeBlock.daily_plan_id == daily_plan_id,
                TimeBlock.deleted_at.is_(None),
            )
            .order_by(TimeBlock.start_time, TimeBlock.sort_order)
        )
        return list(await self.session.scalars(stmt))

    async def count_done_since(self, user_id: str, since: date) -> int:
        stmt = (
            select(func.count())
            .select_from(TimeBlock)
            .join(DailyPlan, DailyPlan.id == TimeBlock.daily_plan_id)
            .where(
                TimeBlock.user_id == user_id,
                TimeBlock.is_done.is_(True),
                TimeBlock.deleted_at.is_(None),
                DailyPlan.plan_date >= since,
            )
        )
        return int(await self.session.scalar(stmt) or 0)


class ChecklistRepository(BaseRepository[ChecklistItem]):
    model = ChecklistItem

    async def list_for_plan(self, user_id: str, daily_plan_id: str) -> list[ChecklistItem]:
        stmt = (
            select(ChecklistItem)
            .where(
                ChecklistItem.user_id == user_id,
                ChecklistItem.daily_plan_id == daily_plan_id,
                ChecklistItem.deleted_at.is_(None),
            )
            .order_by(ChecklistItem.sort_order, ChecklistItem.created_at)
        )
        return list(await self.session.scalars(stmt))


class MorningRoutineRepository(BaseRepository[MorningRoutineItem]):
    model = MorningRoutineItem

    async def list_active(self, user_id: str) -> list[MorningRoutineItem]:
        stmt = (
            select(MorningRoutineItem)
            .where(
                MorningRoutineItem.user_id == user_id,
                MorningRoutineItem.deleted_at.is_(None),
                MorningRoutineItem.is_active.is_(True),
            )
            .order_by(MorningRoutineItem.sort_order, MorningRoutineItem.created_at)
        )
        return list(await self.session.scalars(stmt))

    async def list_all(self, user_id: str) -> list[MorningRoutineItem]:
        stmt = (
            select(MorningRoutineItem)
            .where(
                MorningRoutineItem.user_id == user_id,
                MorningRoutineItem.deleted_at.is_(None),
            )
            .order_by(MorningRoutineItem.sort_order)
        )
        return list(await self.session.scalars(stmt))


class MorningRoutineLogRepository(BaseRepository[MorningRoutineLog]):
    model = MorningRoutineLog

    async def get_log(self, user_id: str, item_id: str, log_date: date) -> MorningRoutineLog | None:
        stmt = select(MorningRoutineLog).where(
            MorningRoutineLog.user_id == user_id,
            MorningRoutineLog.routine_item_id == item_id,
            MorningRoutineLog.log_date == log_date,
        )
        return await self.session.scalar(stmt)

    async def list_for_date(self, user_id: str, log_date: date) -> list[MorningRoutineLog]:
        stmt = select(MorningRoutineLog).where(
            MorningRoutineLog.user_id == user_id,
            MorningRoutineLog.log_date == log_date,
        )
        return list(await self.session.scalars(stmt))

    async def count_complete_days(self, user_id: str, since: date) -> int:
        # Days where at least one routine item marked done
        stmt = (
            select(func.count(func.distinct(MorningRoutineLog.log_date)))
            .where(
                MorningRoutineLog.user_id == user_id,
                MorningRoutineLog.log_date >= since,
                MorningRoutineLog.is_done.is_(True),
            )
        )
        return int(await self.session.scalar(stmt) or 0)


class PlannerTaskRepository(BaseRepository[PlannerTask]):
    model = PlannerTask

    async def list_for_date(self, user_id: str, day: date) -> list[PlannerTask]:
        weekday = day.weekday()  # Mon=0
        stmt = (
            select(PlannerTask)
            .where(
                PlannerTask.user_id == user_id,
                PlannerTask.deleted_at.is_(None),
                PlannerTask.status != TaskStatus.CANCELLED,
                or_(
                    PlannerTask.scheduled_date == day,
                    PlannerTask.due_date == day,
                    and_(
                        PlannerTask.recurrence_rule == "daily",
                        or_(PlannerTask.scheduled_date.is_(None), PlannerTask.scheduled_date <= day),
                    ),
                    and_(
                        PlannerTask.recurrence_rule == "weekdays",
                        weekday < 5,
                        or_(PlannerTask.scheduled_date.is_(None), PlannerTask.scheduled_date <= day),
                    ),
                    and_(
                        PlannerTask.recurrence_rule == "weekly",
                        or_(PlannerTask.scheduled_date.is_(None), PlannerTask.scheduled_date <= day),
                        # Match weekday of scheduled_date if set, else due_date, else created weekday ignored → show all weekly
                    ),
                ),
            )
            .order_by(PlannerTask.priority, PlannerTask.created_at)
        )
        rows = list(await self.session.scalars(stmt))
        filtered: list[PlannerTask] = []
        for task in rows:
            if task.recurrence_rule == "weekly":
                anchor = task.scheduled_date or task.due_date
                if anchor and anchor.weekday() != weekday:
                    continue
            filtered.append(task)
        return filtered

    async def list_all(self, user_id: str, *, limit: int = 100) -> list[PlannerTask]:
        stmt = (
            select(PlannerTask)
            .where(PlannerTask.user_id == user_id, PlannerTask.deleted_at.is_(None))
            .order_by(PlannerTask.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def count_completed_since(self, user_id: str, since: datetime) -> int:
        stmt = select(func.count()).select_from(PlannerTask).where(
            PlannerTask.user_id == user_id,
            PlannerTask.status == TaskStatus.DONE,
            PlannerTask.completed_at.is_not(None),
            PlannerTask.completed_at >= since,
            PlannerTask.deleted_at.is_(None),
        )
        return int(await self.session.scalar(stmt) or 0)

    async def count_created_since(self, user_id: str, since: datetime) -> int:
        stmt = select(func.count()).select_from(PlannerTask).where(
            PlannerTask.user_id == user_id,
            PlannerTask.created_at >= since,
            PlannerTask.deleted_at.is_(None),
        )
        return int(await self.session.scalar(stmt) or 0)


class HabitRepository(BaseRepository[Habit]):
    model = Habit

    async def list_active(self, user_id: str) -> list[Habit]:
        stmt = (
            select(Habit)
            .where(Habit.user_id == user_id, Habit.deleted_at.is_(None), Habit.is_active.is_(True))
            .order_by(Habit.created_at)
        )
        return list(await self.session.scalars(stmt))

    async def list_all(self, user_id: str) -> list[Habit]:
        stmt = (
            select(Habit)
            .where(Habit.user_id == user_id, Habit.deleted_at.is_(None))
            .order_by(Habit.created_at)
        )
        return list(await self.session.scalars(stmt))


class HabitLogRepository(BaseRepository[HabitLog]):
    model = HabitLog

    async def get_log(self, user_id: str, habit_id: str, log_date: date) -> HabitLog | None:
        stmt = select(HabitLog).where(
            HabitLog.user_id == user_id,
            HabitLog.habit_id == habit_id,
            HabitLog.log_date == log_date,
        )
        return await self.session.scalar(stmt)

    async def list_for_date(self, user_id: str, log_date: date) -> list[HabitLog]:
        stmt = select(HabitLog).where(HabitLog.user_id == user_id, HabitLog.log_date == log_date)
        return list(await self.session.scalars(stmt))

    async def list_for_habit(self, user_id: str, habit_id: str, since: date) -> list[HabitLog]:
        stmt = (
            select(HabitLog)
            .where(
                HabitLog.user_id == user_id,
                HabitLog.habit_id == habit_id,
                HabitLog.log_date >= since,
                HabitLog.is_done.is_(True),
            )
            .order_by(HabitLog.log_date.desc())
        )
        return list(await self.session.scalars(stmt))

    async def count_done_since(self, user_id: str, since: date) -> int:
        stmt = select(func.count()).select_from(HabitLog).where(
            HabitLog.user_id == user_id,
            HabitLog.log_date >= since,
            HabitLog.is_done.is_(True),
        )
        return int(await self.session.scalar(stmt) or 0)


def soft_delete(entity, when: datetime | None = None) -> None:
    entity.deleted_at = when or datetime.now(timezone.utc)
