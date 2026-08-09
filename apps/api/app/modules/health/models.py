"""Health tracking ORM models."""

from __future__ import annotations

import enum
from datetime import date, time
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


class WorkoutType(str, enum.Enum):
    STRENGTH = "strength"
    CARDIO = "cardio"
    MOBILITY = "mobility"
    SPORT = "sport"
    OTHER = "other"


class MealType(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class WeightLog(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "health_weight_logs"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    logged_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class GymSession(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "health_gym_sessions"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    gym_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feeling: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Workout(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "health_workouts"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    gym_session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("health_gym_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    workout_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    workout_type: Mapped[WorkoutType] = mapped_column(
        Enum(WorkoutType, name="health_workout_type", native_enum=False, length=16),
        nullable=False,
        default=WorkoutType.STRENGTH,
        server_default=WorkoutType.STRENGTH.value,
        index=True,
    )
    duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class WaterLog(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "health_water_logs"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    logged_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class NutritionLog(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "health_nutrition_logs"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    logged_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    meal_type: Mapped[MealType] = mapped_column(
        Enum(MealType, name="health_meal_type", native_enum=False, length=16),
        nullable=False,
        default=MealType.SNACK,
        server_default=MealType.SNACK.value,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_g: Mapped[Decimal | None] = mapped_column(Numeric(8, 1), nullable=True)
    carbs_g: Mapped[Decimal | None] = mapped_column(Numeric(8, 1), nullable=True)
    fat_g: Mapped[Decimal | None] = mapped_column(Numeric(8, 1), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class SleepLog(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "health_sleep_logs"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    sleep_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)  # wake-up date
    bedtime: Mapped[time | None] = mapped_column(Time, nullable=True)
    wake_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    duration_hours: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    quality: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
