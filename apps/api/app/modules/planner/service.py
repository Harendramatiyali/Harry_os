"""Daily Planner use-cases."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from app.core.errors import DomainError, NotFoundError
from app.modules.planner.models import (
    ChecklistItem,
    DailyPlan,
    Habit,
    HabitCadence,
    HabitLog,
    MorningRoutineItem,
    MorningRoutineLog,
    PlannerTask,
    TaskPriority,
    TaskStatus,
    TimeBlock,
)
from app.modules.planner.repository import (
    ChecklistRepository,
    DailyPlanRepository,
    HabitLogRepository,
    HabitRepository,
    MorningRoutineLogRepository,
    MorningRoutineRepository,
    PlannerTaskRepository,
    TimeBlockRepository,
    soft_delete,
)
from app.modules.planner.schemas import (
    CalendarDayOut,
    ChecklistCreate,
    ChecklistOut,
    ChecklistUpdate,
    DailyPlanOut,
    DailyPlanUpdate,
    DayViewOut,
    HabitCreate,
    HabitDayItem,
    HabitOut,
    HabitUpdate,
    MorningRoutineDayItem,
    MorningRoutineItemCreate,
    MorningRoutineItemOut,
    MorningRoutineItemUpdate,
    PlannerStatsOut,
    PlannerTaskCreate,
    PlannerTaskOut,
    PlannerTaskUpdate,
    TimeBlockCreate,
    TimeBlockOut,
    TimeBlockUpdate,
)


class PlannerService:
    def __init__(
        self,
        *,
        plans: DailyPlanRepository,
        blocks: TimeBlockRepository,
        checklist: ChecklistRepository,
        routines: MorningRoutineRepository,
        routine_logs: MorningRoutineLogRepository,
        tasks: PlannerTaskRepository,
        habits: HabitRepository,
        habit_logs: HabitLogRepository,
    ) -> None:
        self.plans = plans
        self.blocks = blocks
        self.checklist = checklist
        self.routines = routines
        self.routine_logs = routine_logs
        self.tasks = tasks
        self.habits = habits
        self.habit_logs = habit_logs

    # ---- Day aggregate ----

    async def get_or_create_plan(self, user_id: str, plan_date: date) -> DailyPlan:
        plan = await self.plans.get_by_date(user_id, plan_date)
        if plan:
            return plan
        plan = DailyPlan(id=str(uuid.uuid4()), user_id=user_id, plan_date=plan_date)
        await self.plans.add(plan)
        return plan

    async def get_day_view(self, user_id: str, plan_date: date) -> DayViewOut:
        plan = await self.get_or_create_plan(user_id, plan_date)
        blocks = await self.blocks.list_for_plan(user_id, plan.id)
        checks = await self.checklist.list_for_plan(user_id, plan.id)
        day_tasks = await self.tasks.list_for_date(user_id, plan_date)
        morning = await self._morning_for_date(user_id, plan_date)
        habits = await self._habits_for_date(user_id, plan_date)
        return DayViewOut(
            plan=DailyPlanOut.model_validate(plan),
            time_blocks=[TimeBlockOut.model_validate(b) for b in blocks],
            checklist=[ChecklistOut.model_validate(c) for c in checks],
            tasks=[PlannerTaskOut.model_validate(t) for t in day_tasks],
            morning_routine=morning,
            habits=habits,
        )

    async def update_plan(self, user_id: str, plan_date: date, data: DailyPlanUpdate) -> DailyPlanOut:
        plan = await self.get_or_create_plan(user_id, plan_date)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(plan, field, value)
        await self.plans.session.flush()
        return DailyPlanOut.model_validate(plan)

    # ---- Time blocks ----

    async def create_block(self, user_id: str, plan_date: date, data: TimeBlockCreate) -> TimeBlockOut:
        if data.end_time <= data.start_time:
            raise DomainError("end_time must be after start_time")
        plan = await self.get_or_create_plan(user_id, plan_date)
        block = TimeBlock(
            id=str(uuid.uuid4()),
            user_id=user_id,
            daily_plan_id=plan.id,
            title=data.title.strip(),
            category=data.category,
            start_time=data.start_time,
            end_time=data.end_time,
            sort_order=data.sort_order,
        )
        await self.blocks.add(block)
        return TimeBlockOut.model_validate(block)

    async def update_block(self, user_id: str, block_id: str, data: TimeBlockUpdate) -> TimeBlockOut:
        block = await self._get_block(user_id, block_id)
        payload = data.model_dump(exclude_unset=True)
        start = payload.get("start_time", block.start_time)
        end = payload.get("end_time", block.end_time)
        if end <= start:
            raise DomainError("end_time must be after start_time")
        for field, value in payload.items():
            setattr(block, field, value)
        await self.blocks.session.flush()
        return TimeBlockOut.model_validate(block)

    async def delete_block(self, user_id: str, block_id: str) -> None:
        block = await self._get_block(user_id, block_id)
        soft_delete(block)
        await self.blocks.session.flush()

    # ---- Checklist ----

    async def create_checklist(self, user_id: str, plan_date: date, data: ChecklistCreate) -> ChecklistOut:
        plan = await self.get_or_create_plan(user_id, plan_date)
        item = ChecklistItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            daily_plan_id=plan.id,
            title=data.title.strip(),
            sort_order=data.sort_order,
        )
        await self.checklist.add(item)
        return ChecklistOut.model_validate(item)

    async def update_checklist(self, user_id: str, item_id: str, data: ChecklistUpdate) -> ChecklistOut:
        item = await self._get_checklist(user_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self.checklist.session.flush()
        return ChecklistOut.model_validate(item)

    async def delete_checklist(self, user_id: str, item_id: str) -> None:
        item = await self._get_checklist(user_id, item_id)
        soft_delete(item)
        await self.checklist.session.flush()

    # ---- Morning routine template ----

    async def list_routine_items(self, user_id: str) -> list[MorningRoutineItemOut]:
        rows = await self.routines.list_all(user_id)
        return [MorningRoutineItemOut.model_validate(r) for r in rows]

    async def create_routine_item(self, user_id: str, data: MorningRoutineItemCreate) -> MorningRoutineItemOut:
        item = MorningRoutineItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title.strip(),
            sort_order=data.sort_order,
        )
        await self.routines.add(item)
        return MorningRoutineItemOut.model_validate(item)

    async def update_routine_item(
        self, user_id: str, item_id: str, data: MorningRoutineItemUpdate
    ) -> MorningRoutineItemOut:
        item = await self._get_routine_item(user_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self.routines.session.flush()
        return MorningRoutineItemOut.model_validate(item)

    async def delete_routine_item(self, user_id: str, item_id: str) -> None:
        item = await self._get_routine_item(user_id, item_id)
        soft_delete(item)
        await self.routines.session.flush()

    async def toggle_routine_day(
        self, user_id: str, item_id: str, plan_date: date, is_done: bool
    ) -> MorningRoutineDayItem:
        item = await self._get_routine_item(user_id, item_id)
        log = await self.routine_logs.get_log(user_id, item_id, plan_date)
        if log is None:
            log = MorningRoutineLog(
                id=str(uuid.uuid4()),
                user_id=user_id,
                routine_item_id=item_id,
                log_date=plan_date,
                is_done=is_done,
            )
            await self.routine_logs.add(log)
        else:
            log.is_done = is_done
            await self.routine_logs.session.flush()
        return MorningRoutineDayItem(
            id=item.id, title=item.title, sort_order=item.sort_order, is_done=is_done
        )

    # ---- Tasks ----

    async def list_tasks(self, user_id: str) -> list[PlannerTaskOut]:
        rows = await self.tasks.list_all(user_id)
        return [PlannerTaskOut.model_validate(t) for t in rows]

    async def create_task(self, user_id: str, data: PlannerTaskCreate) -> PlannerTaskOut:
        rule = data.recurrence_rule.value if data.recurrence_rule else "none"
        if rule == "none":
            rule = None
        task = PlannerTask(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title.strip(),
            notes=data.notes,
            priority=TaskPriority(data.priority.value),
            due_date=data.due_date,
            scheduled_date=data.scheduled_date,
            recurrence_rule=rule,
        )
        await self.tasks.add(task)
        return PlannerTaskOut.model_validate(task)

    async def update_task(self, user_id: str, task_id: str, data: PlannerTaskUpdate) -> PlannerTaskOut:
        task = await self._get_task(user_id, task_id)
        payload = data.model_dump(exclude_unset=True)
        if "recurrence_rule" in payload:
            rule = payload["recurrence_rule"]
            payload["recurrence_rule"] = None if rule in (None, "none") else (
                rule.value if hasattr(rule, "value") else rule
            )
        if "status" in payload:
            status = payload["status"]
            status_val = status.value if hasattr(status, "value") else status
            if status_val == TaskStatus.DONE.value and task.status != TaskStatus.DONE:
                task.completed_at = datetime.now(timezone.utc)
            if status_val != TaskStatus.DONE.value:
                task.completed_at = None
        for field, value in payload.items():
            setattr(task, field, value)
        await self.tasks.session.flush()
        return PlannerTaskOut.model_validate(task)

    async def delete_task(self, user_id: str, task_id: str) -> None:
        task = await self._get_task(user_id, task_id)
        soft_delete(task)
        await self.tasks.session.flush()

    # ---- Habits ----

    async def list_habits(self, user_id: str) -> list[HabitOut]:
        rows = await self.habits.list_all(user_id)
        return [HabitOut.model_validate(h) for h in rows]

    async def create_habit(self, user_id: str, data: HabitCreate) -> HabitOut:
        habit = Habit(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.name.strip(),
            cadence=HabitCadence(data.cadence.value),
            target_per_period=data.target_per_period,
            color=data.color,
        )
        await self.habits.add(habit)
        return HabitOut.model_validate(habit)

    async def update_habit(self, user_id: str, habit_id: str, data: HabitUpdate) -> HabitOut:
        habit = await self._get_habit(user_id, habit_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(habit, field, value)
        await self.habits.session.flush()
        return HabitOut.model_validate(habit)

    async def delete_habit(self, user_id: str, habit_id: str) -> None:
        habit = await self._get_habit(user_id, habit_id)
        soft_delete(habit)
        await self.habits.session.flush()

    async def toggle_habit(self, user_id: str, habit_id: str, plan_date: date, is_done: bool) -> HabitDayItem:
        habit = await self._get_habit(user_id, habit_id)
        log = await self.habit_logs.get_log(user_id, habit_id, plan_date)
        if log is None:
            log = HabitLog(
                id=str(uuid.uuid4()),
                user_id=user_id,
                habit_id=habit_id,
                log_date=plan_date,
                is_done=is_done,
            )
            await self.habit_logs.add(log)
        else:
            log.is_done = is_done
            await self.habit_logs.session.flush()
        streak = await self._habit_streak(user_id, habit_id, plan_date)
        return HabitDayItem(
            id=habit.id,
            name=habit.name,
            cadence=habit.cadence,  # type: ignore[arg-type]
            color=habit.color,
            is_done=is_done,
            streak=streak,
        )

    # ---- Calendar & stats ----

    async def calendar(self, user_id: str, start: date, end: date) -> list[CalendarDayOut]:
        if end < start:
            raise DomainError("end must be on or after start")
        if (end - start).days > 62:
            raise DomainError("Calendar range cannot exceed 62 days")

        plans = {p.plan_date: p for p in await self.plans.list_between(user_id, start, end)}
        habits = await self.habits.list_active(user_id)
        result: list[CalendarDayOut] = []
        cursor = start
        while cursor <= end:
            plan = plans.get(cursor)
            blocks_count = 0
            if plan:
                blocks_count = len(await self.blocks.list_for_plan(user_id, plan.id))
            day_tasks = await self.tasks.list_for_date(user_id, cursor)
            logs = await self.habit_logs.list_for_date(user_id, cursor)
            done_ids = {l.habit_id for l in logs if l.is_done}
            result.append(
                CalendarDayOut(
                    date=cursor,
                    has_plan=plan is not None,
                    tasks_count=len(day_tasks),
                    blocks_count=blocks_count,
                    habits_done=len(done_ids),
                    habits_total=len(habits),
                )
            )
            cursor += timedelta(days=1)
        return result

    async def stats(self, user_id: str) -> PlannerStatsOut:
        since_dt = datetime.now(timezone.utc) - timedelta(days=7)
        since_d = date.today() - timedelta(days=7)
        completed = await self.tasks.count_completed_since(user_id, since_dt)
        created = await self.tasks.count_created_since(user_id, since_dt)
        rate = (completed / created * 100.0) if created else 0.0
        habits_done = await self.habit_logs.count_done_since(user_id, since_d)
        blocks_done = await self.blocks.count_done_since(user_id, since_d)
        morning_days = await self.routine_logs.count_complete_days(user_id, since_d)

        best_streak = 0
        for habit in await self.habits.list_active(user_id):
            streak = await self._habit_streak(user_id, habit.id, date.today())
            best_streak = max(best_streak, streak)

        return PlannerStatsOut(
            tasks_completed_7d=completed,
            tasks_created_7d=created,
            completion_rate_7d=round(rate, 1),
            habits_completed_7d=habits_done,
            time_blocks_done_7d=blocks_done,
            morning_routine_days_7d=morning_days,
            current_habit_streak_best=best_streak,
        )

    # ---- helpers ----

    async def _morning_for_date(self, user_id: str, plan_date: date) -> list[MorningRoutineDayItem]:
        items = await self.routines.list_active(user_id)
        logs = {l.routine_item_id: l for l in await self.routine_logs.list_for_date(user_id, plan_date)}
        return [
            MorningRoutineDayItem(
                id=i.id,
                title=i.title,
                sort_order=i.sort_order,
                is_done=bool(logs.get(i.id) and logs[i.id].is_done),
            )
            for i in items
        ]

    async def _habits_for_date(self, user_id: str, plan_date: date) -> list[HabitDayItem]:
        habits = await self.habits.list_active(user_id)
        logs = {l.habit_id: l for l in await self.habit_logs.list_for_date(user_id, plan_date)}
        out: list[HabitDayItem] = []
        for h in habits:
            streak = await self._habit_streak(user_id, h.id, plan_date)
            out.append(
                HabitDayItem(
                    id=h.id,
                    name=h.name,
                    cadence=h.cadence,  # type: ignore[arg-type]
                    color=h.color,
                    is_done=bool(logs.get(h.id) and logs[h.id].is_done),
                    streak=streak,
                )
            )
        return out

    async def _habit_streak(self, user_id: str, habit_id: str, from_date: date) -> int:
        streak = 0
        cursor = from_date
        for _ in range(365):
            log = await self.habit_logs.get_log(user_id, habit_id, cursor)
            if log and log.is_done:
                streak += 1
                cursor -= timedelta(days=1)
            else:
                break
        return streak

    async def _get_block(self, user_id: str, block_id: str) -> TimeBlock:
        block = await self.blocks.get_by_id(block_id)
        if not block or block.user_id != user_id or block.deleted_at:
            raise NotFoundError("Time block not found")
        return block

    async def _get_checklist(self, user_id: str, item_id: str) -> ChecklistItem:
        item = await self.checklist.get_by_id(item_id)
        if not item or item.user_id != user_id or item.deleted_at:
            raise NotFoundError("Checklist item not found")
        return item

    async def _get_routine_item(self, user_id: str, item_id: str) -> MorningRoutineItem:
        item = await self.routines.get_by_id(item_id)
        if not item or item.user_id != user_id or item.deleted_at:
            raise NotFoundError("Morning routine item not found")
        return item

    async def _get_task(self, user_id: str, task_id: str) -> PlannerTask:
        task = await self.tasks.get_by_id(task_id)
        if not task or task.user_id != user_id or task.deleted_at:
            raise NotFoundError("Task not found")
        return task

    async def _get_habit(self, user_id: str, habit_id: str) -> Habit:
        habit = await self.habits.get_by_id(habit_id)
        if not habit or habit.user_id != user_id or habit.deleted_at:
            raise NotFoundError("Habit not found")
        return habit
