"""Health tracking HTTP routes.

Note: API liveness remains at GET /health (app.api.health).
This module mounts under /health/* subpaths only.
"""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.modules.auth.deps import CurrentUserDep
from app.modules.health.deps import HealthServiceDep
from app.modules.health.schemas import (
    GymCreate,
    GymOut,
    GymUpdate,
    HealthCharts,
    HealthDashboard,
    NutritionCreate,
    NutritionOut,
    NutritionUpdate,
    SleepCreate,
    SleepOut,
    SleepUpdate,
    WaterCreate,
    WaterOut,
    WaterUpdate,
    WeightCreate,
    WeightOut,
    WeightUpdate,
    WorkoutCreate,
    WorkoutOut,
    WorkoutUpdate,
)

router = APIRouter(prefix="/health", tags=["health-tracking"])


@router.get("/dashboard", response_model=HealthDashboard)
async def dashboard(user: CurrentUserDep, service: HealthServiceDep) -> HealthDashboard:
    return await service.dashboard(user.id)


@router.get("/charts", response_model=HealthCharts)
async def charts(
    user: CurrentUserDep,
    service: HealthServiceDep,
    days: int = Query(default=30, ge=7, le=90),
) -> HealthCharts:
    return await service.charts(user.id, days=days)


# —— Weight ——


@router.get("/weight", response_model=list[WeightOut])
async def list_weights(user: CurrentUserDep, service: HealthServiceDep) -> list[WeightOut]:
    return await service.list_weights(user.id)


@router.post("/weight", response_model=WeightOut, status_code=status.HTTP_201_CREATED)
async def create_weight(
    body: WeightCreate, user: CurrentUserDep, service: HealthServiceDep
) -> WeightOut:
    return await service.create_weight(user.id, body)


@router.patch("/weight/{item_id}", response_model=WeightOut)
async def update_weight(
    item_id: str, body: WeightUpdate, user: CurrentUserDep, service: HealthServiceDep
) -> WeightOut:
    return await service.update_weight(user.id, item_id, body)


@router.delete("/weight/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_weight(item_id: str, user: CurrentUserDep, service: HealthServiceDep) -> None:
    await service.delete_weight(user.id, item_id)


# —— Gym ——


@router.get("/gym", response_model=list[GymOut])
async def list_gyms(user: CurrentUserDep, service: HealthServiceDep) -> list[GymOut]:
    return await service.list_gyms(user.id)


@router.post("/gym", response_model=GymOut, status_code=status.HTTP_201_CREATED)
async def create_gym(body: GymCreate, user: CurrentUserDep, service: HealthServiceDep) -> GymOut:
    return await service.create_gym(user.id, body)


@router.patch("/gym/{item_id}", response_model=GymOut)
async def update_gym(
    item_id: str, body: GymUpdate, user: CurrentUserDep, service: HealthServiceDep
) -> GymOut:
    return await service.update_gym(user.id, item_id, body)


@router.delete("/gym/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gym(item_id: str, user: CurrentUserDep, service: HealthServiceDep) -> None:
    await service.delete_gym(user.id, item_id)


# —— Workouts ——


@router.get("/workouts", response_model=list[WorkoutOut])
async def list_workouts(user: CurrentUserDep, service: HealthServiceDep) -> list[WorkoutOut]:
    return await service.list_workouts(user.id)


@router.post("/workouts", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
async def create_workout(
    body: WorkoutCreate, user: CurrentUserDep, service: HealthServiceDep
) -> WorkoutOut:
    return await service.create_workout(user.id, body)


@router.patch("/workouts/{item_id}", response_model=WorkoutOut)
async def update_workout(
    item_id: str, body: WorkoutUpdate, user: CurrentUserDep, service: HealthServiceDep
) -> WorkoutOut:
    return await service.update_workout(user.id, item_id, body)


@router.delete("/workouts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(item_id: str, user: CurrentUserDep, service: HealthServiceDep) -> None:
    await service.delete_workout(user.id, item_id)


# —— Water ——


@router.get("/water", response_model=list[WaterOut])
async def list_water(user: CurrentUserDep, service: HealthServiceDep) -> list[WaterOut]:
    return await service.list_water(user.id)


@router.post("/water", response_model=WaterOut, status_code=status.HTTP_201_CREATED)
async def create_water(
    body: WaterCreate, user: CurrentUserDep, service: HealthServiceDep
) -> WaterOut:
    return await service.create_water(user.id, body)


@router.patch("/water/{item_id}", response_model=WaterOut)
async def update_water(
    item_id: str, body: WaterUpdate, user: CurrentUserDep, service: HealthServiceDep
) -> WaterOut:
    return await service.update_water(user.id, item_id, body)


@router.delete("/water/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_water(item_id: str, user: CurrentUserDep, service: HealthServiceDep) -> None:
    await service.delete_water(user.id, item_id)


# —— Nutrition ——


@router.get("/nutrition", response_model=list[NutritionOut])
async def list_nutrition(user: CurrentUserDep, service: HealthServiceDep) -> list[NutritionOut]:
    return await service.list_nutrition(user.id)


@router.post("/nutrition", response_model=NutritionOut, status_code=status.HTTP_201_CREATED)
async def create_nutrition(
    body: NutritionCreate, user: CurrentUserDep, service: HealthServiceDep
) -> NutritionOut:
    return await service.create_nutrition(user.id, body)


@router.patch("/nutrition/{item_id}", response_model=NutritionOut)
async def update_nutrition(
    item_id: str, body: NutritionUpdate, user: CurrentUserDep, service: HealthServiceDep
) -> NutritionOut:
    return await service.update_nutrition(user.id, item_id, body)


@router.delete("/nutrition/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition(item_id: str, user: CurrentUserDep, service: HealthServiceDep) -> None:
    await service.delete_nutrition(user.id, item_id)


# —— Sleep ——


@router.get("/sleep", response_model=list[SleepOut])
async def list_sleep(user: CurrentUserDep, service: HealthServiceDep) -> list[SleepOut]:
    return await service.list_sleep(user.id)


@router.post("/sleep", response_model=SleepOut, status_code=status.HTTP_201_CREATED)
async def create_sleep(
    body: SleepCreate, user: CurrentUserDep, service: HealthServiceDep
) -> SleepOut:
    return await service.create_sleep(user.id, body)


@router.patch("/sleep/{item_id}", response_model=SleepOut)
async def update_sleep(
    item_id: str, body: SleepUpdate, user: CurrentUserDep, service: HealthServiceDep
) -> SleepOut:
    return await service.update_sleep(user.id, item_id, body)


@router.delete("/sleep/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sleep(item_id: str, user: CurrentUserDep, service: HealthServiceDep) -> None:
    await service.delete_sleep(user.id, item_id)
