"""Health FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSessionDep
from app.modules.health.repository import (
    GymRepository,
    NutritionRepository,
    SleepRepository,
    WaterRepository,
    WeightRepository,
    WorkoutRepository,
)
from app.modules.health.service import HealthService


def get_health_service(session: DbSessionDep) -> HealthService:
    return HealthService(
        weights=WeightRepository(session),
        gyms=GymRepository(session),
        workouts=WorkoutRepository(session),
        waters=WaterRepository(session),
        nutrition=NutritionRepository(session),
        sleeps=SleepRepository(session),
    )


HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]
