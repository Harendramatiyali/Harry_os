"""Daily Planner HTTP routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query, status

from app.modules.auth.deps import CurrentUserDep
from app.modules.planner.deps import PlannerServiceDep
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
    HabitToggle,
    HabitUpdate,
    MorningRoutineDayItem,
    MorningRoutineItemCreate,
    MorningRoutineItemOut,
    MorningRoutineItemUpdate,
    MorningRoutineToggle,
    PlannerStatsOut,
    PlannerTaskCreate,
    PlannerTaskOut,
    PlannerTaskUpdate,
    TimeBlockCreate,
    TimeBlockOut,
    TimeBlockUpdate,
)

router = APIRouter(prefix="/planner", tags=["planner"])


@router.get("/days/{plan_date}", response_model=DayViewOut)
async def get_day(plan_date: date, user: CurrentUserDep, service: PlannerServiceDep) -> DayViewOut:
    return await service.get_day_view(user.id, plan_date)


@router.patch("/days/{plan_date}", response_model=DailyPlanOut)
async def update_day(
    plan_date: date,
    body: DailyPlanUpdate,
    user: CurrentUserDep,
    service: PlannerServiceDep,
) -> DailyPlanOut:
    return await service.update_plan(user.id, plan_date, body)


@router.get("/calendar", response_model=list[CalendarDayOut])
async def calendar(
    user: CurrentUserDep,
    service: PlannerServiceDep,
    start: date = Query(...),
    end: date = Query(...),
) -> list[CalendarDayOut]:
    return await service.calendar(user.id, start, end)


@router.get("/stats", response_model=PlannerStatsOut)
async def stats(user: CurrentUserDep, service: PlannerServiceDep) -> PlannerStatsOut:
    return await service.stats(user.id)


# Time blocks
@router.post("/days/{plan_date}/blocks", response_model=TimeBlockOut, status_code=status.HTTP_201_CREATED)
async def create_block(
    plan_date: date, body: TimeBlockCreate, user: CurrentUserDep, service: PlannerServiceDep
) -> TimeBlockOut:
    return await service.create_block(user.id, plan_date, body)


@router.patch("/blocks/{block_id}", response_model=TimeBlockOut)
async def update_block(
    block_id: str, body: TimeBlockUpdate, user: CurrentUserDep, service: PlannerServiceDep
) -> TimeBlockOut:
    return await service.update_block(user.id, block_id, body)


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(block_id: str, user: CurrentUserDep, service: PlannerServiceDep) -> None:
    await service.delete_block(user.id, block_id)


# Checklist
@router.post(
    "/days/{plan_date}/checklist",
    response_model=ChecklistOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_checklist(
    plan_date: date, body: ChecklistCreate, user: CurrentUserDep, service: PlannerServiceDep
) -> ChecklistOut:
    return await service.create_checklist(user.id, plan_date, body)


@router.patch("/checklist/{item_id}", response_model=ChecklistOut)
async def update_checklist(
    item_id: str, body: ChecklistUpdate, user: CurrentUserDep, service: PlannerServiceDep
) -> ChecklistOut:
    return await service.update_checklist(user.id, item_id, body)


@router.delete("/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist(item_id: str, user: CurrentUserDep, service: PlannerServiceDep) -> None:
    await service.delete_checklist(user.id, item_id)


# Morning routine
@router.get("/morning-routine", response_model=list[MorningRoutineItemOut])
async def list_routine(user: CurrentUserDep, service: PlannerServiceDep) -> list[MorningRoutineItemOut]:
    return await service.list_routine_items(user.id)


@router.post(
    "/morning-routine",
    response_model=MorningRoutineItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_routine(
    body: MorningRoutineItemCreate, user: CurrentUserDep, service: PlannerServiceDep
) -> MorningRoutineItemOut:
    return await service.create_routine_item(user.id, body)


@router.patch("/morning-routine/{item_id}", response_model=MorningRoutineItemOut)
async def update_routine(
    item_id: str, body: MorningRoutineItemUpdate, user: CurrentUserDep, service: PlannerServiceDep
) -> MorningRoutineItemOut:
    return await service.update_routine_item(user.id, item_id, body)


@router.delete("/morning-routine/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routine(item_id: str, user: CurrentUserDep, service: PlannerServiceDep) -> None:
    await service.delete_routine_item(user.id, item_id)


@router.post(
    "/days/{plan_date}/morning-routine/{item_id}/toggle",
    response_model=MorningRoutineDayItem,
)
async def toggle_routine(
    plan_date: date,
    item_id: str,
    body: MorningRoutineToggle,
    user: CurrentUserDep,
    service: PlannerServiceDep,
) -> MorningRoutineDayItem:
    return await service.toggle_routine_day(user.id, item_id, plan_date, body.is_done)


# Tasks
@router.get("/tasks", response_model=list[PlannerTaskOut])
async def list_tasks(user: CurrentUserDep, service: PlannerServiceDep) -> list[PlannerTaskOut]:
    return await service.list_tasks(user.id)


@router.post("/tasks", response_model=PlannerTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: PlannerTaskCreate, user: CurrentUserDep, service: PlannerServiceDep
) -> PlannerTaskOut:
    return await service.create_task(user.id, body)


@router.patch("/tasks/{task_id}", response_model=PlannerTaskOut)
async def update_task(
    task_id: str, body: PlannerTaskUpdate, user: CurrentUserDep, service: PlannerServiceDep
) -> PlannerTaskOut:
    return await service.update_task(user.id, task_id, body)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user: CurrentUserDep, service: PlannerServiceDep) -> None:
    await service.delete_task(user.id, task_id)


# Habits
@router.get("/habits", response_model=list[HabitOut])
async def list_habits(user: CurrentUserDep, service: PlannerServiceDep) -> list[HabitOut]:
    return await service.list_habits(user.id)


@router.post("/habits", response_model=HabitOut, status_code=status.HTTP_201_CREATED)
async def create_habit(body: HabitCreate, user: CurrentUserDep, service: PlannerServiceDep) -> HabitOut:
    return await service.create_habit(user.id, body)


@router.patch("/habits/{habit_id}", response_model=HabitOut)
async def update_habit(
    habit_id: str, body: HabitUpdate, user: CurrentUserDep, service: PlannerServiceDep
) -> HabitOut:
    return await service.update_habit(user.id, habit_id, body)


@router.delete("/habits/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(habit_id: str, user: CurrentUserDep, service: PlannerServiceDep) -> None:
    await service.delete_habit(user.id, habit_id)


@router.post("/days/{plan_date}/habits/{habit_id}/toggle", response_model=HabitDayItem)
async def toggle_habit(
    plan_date: date,
    habit_id: str,
    body: HabitToggle,
    user: CurrentUserDep,
    service: PlannerServiceDep,
) -> HabitDayItem:
    return await service.toggle_habit(user.id, habit_id, plan_date, body.is_done)
