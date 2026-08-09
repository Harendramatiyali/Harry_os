"""Health persistence."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select

from app.db.repository import BaseRepository
from app.modules.health.models import GymSession, NutritionLog, SleepLog, WaterLog, WeightLog, Workout


def soft_delete(entity) -> None:
    entity.deleted_at = datetime.now(timezone.utc)


class WeightRepository(BaseRepository[WeightLog]):
    model = WeightLog

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[WeightLog]:
        stmt = (
            select(WeightLog)
            .where(WeightLog.user_id == user_id, WeightLog.deleted_at.is_(None))
            .order_by(WeightLog.logged_on.desc(), WeightLog.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> WeightLog | None:
        stmt = select(WeightLog).where(
            WeightLog.id == item_id, WeightLog.user_id == user_id, WeightLog.deleted_at.is_(None)
        )
        return await self.session.scalar(stmt)

    async def between(self, user_id: str, start: date, end: date) -> list[WeightLog]:
        stmt = (
            select(WeightLog)
            .where(
                WeightLog.user_id == user_id,
                WeightLog.deleted_at.is_(None),
                WeightLog.logged_on >= start,
                WeightLog.logged_on <= end,
            )
            .order_by(WeightLog.logged_on.asc())
        )
        return list(await self.session.scalars(stmt))


class GymRepository(BaseRepository[GymSession]):
    model = GymSession

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[GymSession]:
        stmt = (
            select(GymSession)
            .where(GymSession.user_id == user_id, GymSession.deleted_at.is_(None))
            .order_by(GymSession.session_on.desc(), GymSession.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> GymSession | None:
        stmt = select(GymSession).where(
            GymSession.id == item_id, GymSession.user_id == user_id, GymSession.deleted_at.is_(None)
        )
        return await self.session.scalar(stmt)

    async def count_between(self, user_id: str, start: date, end: date) -> int:
        stmt = select(func.count()).select_from(GymSession).where(
            GymSession.user_id == user_id,
            GymSession.deleted_at.is_(None),
            GymSession.session_on >= start,
            GymSession.session_on <= end,
        )
        return int(await self.session.scalar(stmt) or 0)


class WorkoutRepository(BaseRepository[Workout]):
    model = Workout

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[Workout]:
        stmt = (
            select(Workout)
            .where(Workout.user_id == user_id, Workout.deleted_at.is_(None))
            .order_by(Workout.workout_on.desc(), Workout.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> Workout | None:
        stmt = select(Workout).where(
            Workout.id == item_id, Workout.user_id == user_id, Workout.deleted_at.is_(None)
        )
        return await self.session.scalar(stmt)

    async def between(self, user_id: str, start: date, end: date) -> list[Workout]:
        stmt = (
            select(Workout)
            .where(
                Workout.user_id == user_id,
                Workout.deleted_at.is_(None),
                Workout.workout_on >= start,
                Workout.workout_on <= end,
            )
            .order_by(Workout.workout_on.asc())
        )
        return list(await self.session.scalars(stmt))


class WaterRepository(BaseRepository[WaterLog]):
    model = WaterLog

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[WaterLog]:
        stmt = (
            select(WaterLog)
            .where(WaterLog.user_id == user_id, WaterLog.deleted_at.is_(None))
            .order_by(WaterLog.logged_on.desc(), WaterLog.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> WaterLog | None:
        stmt = select(WaterLog).where(
            WaterLog.id == item_id, WaterLog.user_id == user_id, WaterLog.deleted_at.is_(None)
        )
        return await self.session.scalar(stmt)

    async def sum_on(self, user_id: str, day: date) -> int:
        stmt = select(func.coalesce(func.sum(WaterLog.amount_ml), 0)).where(
            WaterLog.user_id == user_id,
            WaterLog.deleted_at.is_(None),
            WaterLog.logged_on == day,
        )
        return int(await self.session.scalar(stmt) or 0)

    async def between(self, user_id: str, start: date, end: date) -> list[WaterLog]:
        stmt = (
            select(WaterLog)
            .where(
                WaterLog.user_id == user_id,
                WaterLog.deleted_at.is_(None),
                WaterLog.logged_on >= start,
                WaterLog.logged_on <= end,
            )
            .order_by(WaterLog.logged_on.asc())
        )
        return list(await self.session.scalars(stmt))


class NutritionRepository(BaseRepository[NutritionLog]):
    model = NutritionLog

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[NutritionLog]:
        stmt = (
            select(NutritionLog)
            .where(NutritionLog.user_id == user_id, NutritionLog.deleted_at.is_(None))
            .order_by(NutritionLog.logged_on.desc(), NutritionLog.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> NutritionLog | None:
        stmt = select(NutritionLog).where(
            NutritionLog.id == item_id,
            NutritionLog.user_id == user_id,
            NutritionLog.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def between(self, user_id: str, start: date, end: date) -> list[NutritionLog]:
        stmt = (
            select(NutritionLog)
            .where(
                NutritionLog.user_id == user_id,
                NutritionLog.deleted_at.is_(None),
                NutritionLog.logged_on >= start,
                NutritionLog.logged_on <= end,
            )
            .order_by(NutritionLog.logged_on.asc())
        )
        return list(await self.session.scalars(stmt))

    async def macros_on(self, user_id: str, day: date) -> tuple[int, float]:
        stmt = select(
            func.coalesce(func.sum(NutritionLog.calories), 0),
            func.coalesce(func.sum(NutritionLog.protein_g), 0),
        ).where(
            NutritionLog.user_id == user_id,
            NutritionLog.deleted_at.is_(None),
            NutritionLog.logged_on == day,
        )
        row = (await self.session.execute(stmt)).one()
        return int(row[0] or 0), float(row[1] or 0)


class SleepRepository(BaseRepository[SleepLog]):
    model = SleepLog

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[SleepLog]:
        stmt = (
            select(SleepLog)
            .where(SleepLog.user_id == user_id, SleepLog.deleted_at.is_(None))
            .order_by(SleepLog.sleep_date.desc(), SleepLog.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> SleepLog | None:
        stmt = select(SleepLog).where(
            SleepLog.id == item_id, SleepLog.user_id == user_id, SleepLog.deleted_at.is_(None)
        )
        return await self.session.scalar(stmt)

    async def between(self, user_id: str, start: date, end: date) -> list[SleepLog]:
        stmt = (
            select(SleepLog)
            .where(
                SleepLog.user_id == user_id,
                SleepLog.deleted_at.is_(None),
                SleepLog.sleep_date >= start,
                SleepLog.sleep_date <= end,
            )
            .order_by(SleepLog.sleep_date.asc())
        )
        return list(await self.session.scalars(stmt))

    async def latest(self, user_id: str) -> SleepLog | None:
        rows = await self.list_for_user(user_id, limit=1)
        return rows[0] if rows else None
