"""Health tracking schemas."""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class WorkoutType(str, Enum):
    STRENGTH = "strength"
    CARDIO = "cardio"
    MOBILITY = "mobility"
    SPORT = "sport"
    OTHER = "other"


class MealType(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


# —— Weight ——


class WeightCreate(BaseModel):
    logged_on: date
    weight_kg: Decimal = Field(gt=0, le=500)
    notes: str | None = None


class WeightUpdate(BaseModel):
    logged_on: date | None = None
    weight_kg: Decimal | None = Field(default=None, gt=0, le=500)
    notes: str | None = None


class WeightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    logged_on: date
    weight_kg: Decimal
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Gym ——


class GymCreate(BaseModel):
    session_on: date
    gym_name: str | None = None
    duration_min: int | None = Field(default=None, ge=1, le=600)
    feeling: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None


class GymUpdate(BaseModel):
    session_on: date | None = None
    gym_name: str | None = None
    duration_min: int | None = Field(default=None, ge=1, le=600)
    feeling: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None


class GymOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_on: date
    gym_name: str | None
    duration_min: int | None
    feeling: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Workout ——


class WorkoutCreate(BaseModel):
    workout_on: date
    title: str = Field(min_length=1, max_length=255)
    workout_type: WorkoutType = WorkoutType.STRENGTH
    duration_min: int | None = Field(default=None, ge=1, le=600)
    calories: int | None = Field(default=None, ge=0)
    gym_session_id: str | None = None
    notes: str | None = None


class WorkoutUpdate(BaseModel):
    workout_on: date | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    workout_type: WorkoutType | None = None
    duration_min: int | None = Field(default=None, ge=1, le=600)
    calories: int | None = Field(default=None, ge=0)
    gym_session_id: str | None = None
    notes: str | None = None


class WorkoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    gym_session_id: str | None
    workout_on: date
    title: str
    workout_type: WorkoutType
    duration_min: int | None
    calories: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Water ——


class WaterCreate(BaseModel):
    logged_on: date
    amount_ml: int = Field(gt=0, le=10000)
    notes: str | None = None


class WaterUpdate(BaseModel):
    logged_on: date | None = None
    amount_ml: int | None = Field(default=None, gt=0, le=10000)
    notes: str | None = None


class WaterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    logged_on: date
    amount_ml: int
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Nutrition ——


class NutritionCreate(BaseModel):
    logged_on: date
    meal_type: MealType = MealType.SNACK
    description: str = Field(min_length=1, max_length=512)
    calories: int | None = Field(default=None, ge=0)
    protein_g: Decimal | None = Field(default=None, ge=0)
    carbs_g: Decimal | None = Field(default=None, ge=0)
    fat_g: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None


class NutritionUpdate(BaseModel):
    logged_on: date | None = None
    meal_type: MealType | None = None
    description: str | None = Field(default=None, min_length=1, max_length=512)
    calories: int | None = Field(default=None, ge=0)
    protein_g: Decimal | None = Field(default=None, ge=0)
    carbs_g: Decimal | None = Field(default=None, ge=0)
    fat_g: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None


class NutritionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    logged_on: date
    meal_type: MealType
    description: str
    calories: int | None
    protein_g: Decimal | None
    carbs_g: Decimal | None
    fat_g: Decimal | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Sleep ——


class SleepCreate(BaseModel):
    sleep_date: date
    duration_hours: Decimal = Field(gt=0, le=24)
    bedtime: time | None = None
    wake_time: time | None = None
    quality: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None


class SleepUpdate(BaseModel):
    sleep_date: date | None = None
    duration_hours: Decimal | None = Field(default=None, gt=0, le=24)
    bedtime: time | None = None
    wake_time: time | None = None
    quality: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None


class SleepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sleep_date: date
    bedtime: time | None
    wake_time: time | None
    duration_hours: Decimal
    quality: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Aggregates ——


class DayPoint(BaseModel):
    date: str
    value: float


class HealthDashboard(BaseModel):
    water_goal_ml: int = 3000
    latest_weight_kg: Decimal | None
    weight_change_kg: Decimal | None
    water_today_ml: int
    water_pct: float
    calories_today: int
    protein_today_g: float
    sleep_last_hours: Decimal | None
    sleep_last_quality: int | None
    workouts_this_week: int
    gym_this_week: int
    workout_minutes_week: int
    recent_workouts: list[WorkoutOut]
    recent_weights: list[WeightOut]


class HealthCharts(BaseModel):
    weight: list[DayPoint]
    water: list[DayPoint]
    sleep: list[DayPoint]
    calories: list[DayPoint]
    workout_minutes: list[DayPoint]
