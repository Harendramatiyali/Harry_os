"""Health use-cases."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from app.core.errors import NotFoundError
from app.modules.health.models import (
    GymSession,
    MealType,
    NutritionLog,
    SleepLog,
    WaterLog,
    WeightLog,
    Workout,
    WorkoutType,
)
from app.modules.health.repository import (
    GymRepository,
    NutritionRepository,
    SleepRepository,
    WaterRepository,
    WeightRepository,
    WorkoutRepository,
    soft_delete,
)
from app.modules.health.schemas import (
    DayPoint,
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

WATER_GOAL_ML = 3000


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


class HealthService:
    def __init__(
        self,
        *,
        weights: WeightRepository,
        gyms: GymRepository,
        workouts: WorkoutRepository,
        waters: WaterRepository,
        nutrition: NutritionRepository,
        sleeps: SleepRepository,
    ) -> None:
        self.weights = weights
        self.gyms = gyms
        self.workouts = workouts
        self.waters = waters
        self.nutrition = nutrition
        self.sleeps = sleeps

    # —— Weight ——

    async def list_weights(self, user_id: str) -> list[WeightOut]:
        return [WeightOut.model_validate(r) for r in await self.weights.list_for_user(user_id)]

    async def create_weight(self, user_id: str, data: WeightCreate) -> WeightOut:
        row = WeightLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            logged_on=data.logged_on,
            weight_kg=data.weight_kg,
            notes=data.notes,
        )
        await self.weights.add(row)
        return WeightOut.model_validate(row)

    async def update_weight(self, user_id: str, item_id: str, data: WeightUpdate) -> WeightOut:
        row = await self._weight(user_id, item_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(row, k, v)
        await self.weights.session.flush()
        return WeightOut.model_validate(row)

    async def delete_weight(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._weight(user_id, item_id))
        await self.weights.session.flush()

    # —— Gym ——

    async def list_gyms(self, user_id: str) -> list[GymOut]:
        return [GymOut.model_validate(r) for r in await self.gyms.list_for_user(user_id)]

    async def create_gym(self, user_id: str, data: GymCreate) -> GymOut:
        row = GymSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_on=data.session_on,
            gym_name=data.gym_name.strip() if data.gym_name else None,
            duration_min=data.duration_min,
            feeling=data.feeling,
            notes=data.notes,
        )
        await self.gyms.add(row)
        return GymOut.model_validate(row)

    async def update_gym(self, user_id: str, item_id: str, data: GymUpdate) -> GymOut:
        row = await self._gym(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "gym_name" in payload and payload["gym_name"]:
            payload["gym_name"] = payload["gym_name"].strip()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.gyms.session.flush()
        return GymOut.model_validate(row)

    async def delete_gym(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._gym(user_id, item_id))
        await self.gyms.session.flush()

    # —— Workouts ——

    async def list_workouts(self, user_id: str) -> list[WorkoutOut]:
        return [WorkoutOut.model_validate(r) for r in await self.workouts.list_for_user(user_id)]

    async def create_workout(self, user_id: str, data: WorkoutCreate) -> WorkoutOut:
        if data.gym_session_id:
            await self._gym(user_id, data.gym_session_id)
        row = Workout(
            id=str(uuid.uuid4()),
            user_id=user_id,
            gym_session_id=data.gym_session_id,
            workout_on=data.workout_on,
            title=data.title.strip(),
            workout_type=WorkoutType(data.workout_type.value),
            duration_min=data.duration_min,
            calories=data.calories,
            notes=data.notes,
        )
        await self.workouts.add(row)
        return WorkoutOut.model_validate(row)

    async def update_workout(self, user_id: str, item_id: str, data: WorkoutUpdate) -> WorkoutOut:
        row = await self._workout(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "title" in payload and payload["title"]:
            payload["title"] = payload["title"].strip()
        if "workout_type" in payload and payload["workout_type"] is not None:
            vt = payload["workout_type"]
            payload["workout_type"] = WorkoutType(vt.value if hasattr(vt, "value") else vt)
        if "gym_session_id" in payload and payload["gym_session_id"]:
            await self._gym(user_id, payload["gym_session_id"])
        for k, v in payload.items():
            setattr(row, k, v)
        await self.workouts.session.flush()
        return WorkoutOut.model_validate(row)

    async def delete_workout(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._workout(user_id, item_id))
        await self.workouts.session.flush()

    # —— Water ——

    async def list_water(self, user_id: str) -> list[WaterOut]:
        return [WaterOut.model_validate(r) for r in await self.waters.list_for_user(user_id)]

    async def create_water(self, user_id: str, data: WaterCreate) -> WaterOut:
        row = WaterLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            logged_on=data.logged_on,
            amount_ml=data.amount_ml,
            notes=data.notes,
        )
        await self.waters.add(row)
        return WaterOut.model_validate(row)

    async def update_water(self, user_id: str, item_id: str, data: WaterUpdate) -> WaterOut:
        row = await self._water(user_id, item_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(row, k, v)
        await self.waters.session.flush()
        return WaterOut.model_validate(row)

    async def delete_water(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._water(user_id, item_id))
        await self.waters.session.flush()

    # —— Nutrition ——

    async def list_nutrition(self, user_id: str) -> list[NutritionOut]:
        return [NutritionOut.model_validate(r) for r in await self.nutrition.list_for_user(user_id)]

    async def create_nutrition(self, user_id: str, data: NutritionCreate) -> NutritionOut:
        row = NutritionLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            logged_on=data.logged_on,
            meal_type=MealType(data.meal_type.value),
            description=data.description.strip(),
            calories=data.calories,
            protein_g=data.protein_g,
            carbs_g=data.carbs_g,
            fat_g=data.fat_g,
            notes=data.notes,
        )
        await self.nutrition.add(row)
        return NutritionOut.model_validate(row)

    async def update_nutrition(self, user_id: str, item_id: str, data: NutritionUpdate) -> NutritionOut:
        row = await self._nutrition(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "description" in payload and payload["description"]:
            payload["description"] = payload["description"].strip()
        if "meal_type" in payload and payload["meal_type"] is not None:
            mt = payload["meal_type"]
            payload["meal_type"] = MealType(mt.value if hasattr(mt, "value") else mt)
        for k, v in payload.items():
            setattr(row, k, v)
        await self.nutrition.session.flush()
        return NutritionOut.model_validate(row)

    async def delete_nutrition(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._nutrition(user_id, item_id))
        await self.nutrition.session.flush()

    # —— Sleep ——

    async def list_sleep(self, user_id: str) -> list[SleepOut]:
        return [SleepOut.model_validate(r) for r in await self.sleeps.list_for_user(user_id)]

    async def create_sleep(self, user_id: str, data: SleepCreate) -> SleepOut:
        row = SleepLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            sleep_date=data.sleep_date,
            bedtime=data.bedtime,
            wake_time=data.wake_time,
            duration_hours=data.duration_hours,
            quality=data.quality,
            notes=data.notes,
        )
        await self.sleeps.add(row)
        return SleepOut.model_validate(row)

    async def update_sleep(self, user_id: str, item_id: str, data: SleepUpdate) -> SleepOut:
        row = await self._sleep(user_id, item_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(row, k, v)
        await self.sleeps.session.flush()
        return SleepOut.model_validate(row)

    async def delete_sleep(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._sleep(user_id, item_id))
        await self.sleeps.session.flush()

    # —— Aggregates ——

    async def dashboard(self, user_id: str) -> HealthDashboard:
        today = date.today()
        week_start = _week_start(today)
        weights = await self.weights.list_for_user(user_id, limit=14)
        latest = weights[0] if weights else None
        prev = weights[1] if len(weights) > 1 else None
        change = None
        if latest and prev:
            change = (latest.weight_kg - prev.weight_kg).quantize(Decimal("0.01"))

        water_today = await self.waters.sum_on(user_id, today)
        cals, protein = await self.nutrition.macros_on(user_id, today)
        last_sleep = await self.sleeps.latest(user_id)
        week_workouts = await self.workouts.between(user_id, week_start, today)
        minutes = sum(w.duration_min or 0 for w in week_workouts)
        gym_count = await self.gyms.count_between(user_id, week_start, today)

        return HealthDashboard(
            water_goal_ml=WATER_GOAL_ML,
            latest_weight_kg=latest.weight_kg if latest else None,
            weight_change_kg=change,
            water_today_ml=water_today,
            water_pct=min(100.0, round(water_today / WATER_GOAL_ML * 100, 1)) if WATER_GOAL_ML else 0,
            calories_today=cals,
            protein_today_g=round(protein, 1),
            sleep_last_hours=last_sleep.duration_hours if last_sleep else None,
            sleep_last_quality=last_sleep.quality if last_sleep else None,
            workouts_this_week=len(week_workouts),
            gym_this_week=gym_count,
            workout_minutes_week=minutes,
            recent_workouts=[WorkoutOut.model_validate(w) for w in week_workouts[::-1][:5]],
            recent_weights=[WeightOut.model_validate(w) for w in weights[:5]],
        )

    async def charts(self, user_id: str, days: int = 30) -> HealthCharts:
        today = date.today()
        start = today - timedelta(days=days - 1)

        weights = await self.weights.between(user_id, start, today)
        waters = await self.waters.between(user_id, start, today)
        sleeps = await self.sleeps.between(user_id, start, today)
        meals = await self.nutrition.between(user_id, start, today)
        workouts = await self.workouts.between(user_id, start, today)

        water_by_day: dict[str, int] = defaultdict(int)
        for w in waters:
            water_by_day[w.logged_on.isoformat()] += w.amount_ml

        cal_by_day: dict[str, int] = defaultdict(int)
        for m in meals:
            cal_by_day[m.logged_on.isoformat()] += m.calories or 0

        mins_by_day: dict[str, int] = defaultdict(int)
        for w in workouts:
            mins_by_day[w.workout_on.isoformat()] += w.duration_min or 0

        # Prefer last weight of day if multiple
        weight_by_day: dict[str, float] = {}
        for w in weights:
            weight_by_day[w.logged_on.isoformat()] = float(w.weight_kg)

        sleep_by_day = {s.sleep_date.isoformat(): float(s.duration_hours) for s in sleeps}

        series_dates = [(start + timedelta(days=i)).isoformat() for i in range(days)]

        return HealthCharts(
            weight=[DayPoint(date=d, value=weight_by_day[d]) for d in series_dates if d in weight_by_day],
            water=[DayPoint(date=d, value=float(water_by_day.get(d, 0))) for d in series_dates],
            sleep=[DayPoint(date=d, value=sleep_by_day[d]) for d in series_dates if d in sleep_by_day],
            calories=[DayPoint(date=d, value=float(cal_by_day.get(d, 0))) for d in series_dates],
            workout_minutes=[DayPoint(date=d, value=float(mins_by_day.get(d, 0))) for d in series_dates],
        )

    # —— ownership ——

    async def _weight(self, user_id: str, item_id: str) -> WeightLog:
        row = await self.weights.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Weight log not found")
        return row

    async def _gym(self, user_id: str, item_id: str) -> GymSession:
        row = await self.gyms.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Gym session not found")
        return row

    async def _workout(self, user_id: str, item_id: str) -> Workout:
        row = await self.workouts.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Workout not found")
        return row

    async def _water(self, user_id: str, item_id: str) -> WaterLog:
        row = await self.waters.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Water log not found")
        return row

    async def _nutrition(self, user_id: str, item_id: str) -> NutritionLog:
        row = await self.nutrition.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Nutrition log not found")
        return row

    async def _sleep(self, user_id: str, item_id: str) -> SleepLog:
        row = await self.sleeps.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Sleep log not found")
        return row
