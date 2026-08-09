"""Planner FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSessionDep
from app.modules.planner.repository import (
    ChecklistRepository,
    DailyPlanRepository,
    HabitLogRepository,
    HabitRepository,
    MorningRoutineLogRepository,
    MorningRoutineRepository,
    PlannerTaskRepository,
    TimeBlockRepository,
)
from app.modules.planner.service import PlannerService


def get_planner_service(session: DbSessionDep) -> PlannerService:
    return PlannerService(
        plans=DailyPlanRepository(session),
        blocks=TimeBlockRepository(session),
        checklist=ChecklistRepository(session),
        routines=MorningRoutineRepository(session),
        routine_logs=MorningRoutineLogRepository(session),
        tasks=PlannerTaskRepository(session),
        habits=HabitRepository(session),
        habit_logs=HabitLogRepository(session),
    )


PlannerServiceDep = Annotated[PlannerService, Depends(get_planner_service)]
