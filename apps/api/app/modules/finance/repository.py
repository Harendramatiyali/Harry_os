"""Finance persistence."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select

from app.db.repository import BaseRepository
from app.modules.finance.models import Expense, FinanceAccount, Holding, IncomeEntry, Loan, LoanStatus


def soft_delete(entity) -> None:
    entity.deleted_at = datetime.now(timezone.utc)


class AccountRepository(BaseRepository[FinanceAccount]):
    model = FinanceAccount

    async def list_for_user(self, user_id: str) -> list[FinanceAccount]:
        stmt = (
            select(FinanceAccount)
            .where(FinanceAccount.user_id == user_id, FinanceAccount.deleted_at.is_(None))
            .order_by(FinanceAccount.name.asc())
        )
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> FinanceAccount | None:
        stmt = select(FinanceAccount).where(
            FinanceAccount.id == item_id,
            FinanceAccount.user_id == user_id,
            FinanceAccount.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def sum_balance(self, user_id: str) -> Decimal:
        stmt = select(func.coalesce(func.sum(FinanceAccount.balance), 0)).where(
            FinanceAccount.user_id == user_id,
            FinanceAccount.deleted_at.is_(None),
        )
        return Decimal(str(await self.session.scalar(stmt) or 0))


class IncomeRepository(BaseRepository[IncomeEntry]):
    model = IncomeEntry

    async def list_for_user(
        self,
        user_id: str,
        *,
        kind: str | None = None,
        limit: int = 200,
    ) -> list[IncomeEntry]:
        stmt = (
            select(IncomeEntry)
            .where(IncomeEntry.user_id == user_id, IncomeEntry.deleted_at.is_(None))
            .order_by(IncomeEntry.received_on.desc(), IncomeEntry.created_at.desc())
            .limit(limit)
        )
        if kind:
            stmt = stmt.where(IncomeEntry.kind == kind)
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> IncomeEntry | None:
        stmt = select(IncomeEntry).where(
            IncomeEntry.id == item_id,
            IncomeEntry.user_id == user_id,
            IncomeEntry.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def sum_between(self, user_id: str, start: date, end: date, kind: str | None = None) -> Decimal:
        stmt = select(func.coalesce(func.sum(IncomeEntry.amount), 0)).where(
            IncomeEntry.user_id == user_id,
            IncomeEntry.deleted_at.is_(None),
            IncomeEntry.received_on >= start,
            IncomeEntry.received_on <= end,
        )
        if kind:
            stmt = stmt.where(IncomeEntry.kind == kind)
        return Decimal(str(await self.session.scalar(stmt) or 0))

    async def recent(self, user_id: str, limit: int = 5) -> list[IncomeEntry]:
        return await self.list_for_user(user_id, limit=limit)


class ExpenseRepository(BaseRepository[Expense]):
    model = Expense

    async def list_for_user(
        self,
        user_id: str,
        *,
        category: str | None = None,
        limit: int = 200,
    ) -> list[Expense]:
        stmt = (
            select(Expense)
            .where(Expense.user_id == user_id, Expense.deleted_at.is_(None))
            .order_by(Expense.spent_on.desc(), Expense.created_at.desc())
            .limit(limit)
        )
        if category:
            stmt = stmt.where(Expense.category == category)
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> Expense | None:
        stmt = select(Expense).where(
            Expense.id == item_id,
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def sum_between(self, user_id: str, start: date, end: date) -> Decimal:
        stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
            Expense.spent_on >= start,
            Expense.spent_on <= end,
        )
        return Decimal(str(await self.session.scalar(stmt) or 0))

    async def by_category(self, user_id: str, start: date, end: date) -> list[tuple[str, Decimal]]:
        stmt = (
            select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
            .where(
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None),
                Expense.spent_on >= start,
                Expense.spent_on <= end,
            )
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
        )
        rows = await self.session.execute(stmt)
        return [(str(cat.value if hasattr(cat, "value") else cat), Decimal(str(amt))) for cat, amt in rows.all()]

    async def recent(self, user_id: str, limit: int = 8) -> list[Expense]:
        return await self.list_for_user(user_id, limit=limit)


class LoanRepository(BaseRepository[Loan]):
    model = Loan

    async def list_for_user(self, user_id: str, *, status: str | None = None) -> list[Loan]:
        stmt = (
            select(Loan)
            .where(Loan.user_id == user_id, Loan.deleted_at.is_(None))
            .order_by(Loan.updated_at.desc())
        )
        if status:
            stmt = stmt.where(Loan.status == status)
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> Loan | None:
        stmt = select(Loan).where(
            Loan.id == item_id,
            Loan.user_id == user_id,
            Loan.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def sum_outstanding(self, user_id: str) -> Decimal:
        stmt = select(func.coalesce(func.sum(Loan.outstanding), 0)).where(
            Loan.user_id == user_id,
            Loan.deleted_at.is_(None),
            Loan.status == LoanStatus.ACTIVE,
        )
        return Decimal(str(await self.session.scalar(stmt) or 0))


class HoldingRepository(BaseRepository[Holding]):
    model = Holding

    async def list_for_user(
        self,
        user_id: str,
        *,
        holding_type: str | None = None,
    ) -> list[Holding]:
        stmt = (
            select(Holding)
            .where(Holding.user_id == user_id, Holding.deleted_at.is_(None))
            .order_by(Holding.name.asc())
        )
        if holding_type:
            stmt = stmt.where(Holding.holding_type == holding_type)
        return list(await self.session.scalars(stmt))

    async def get_owned(self, user_id: str, item_id: str) -> Holding | None:
        stmt = select(Holding).where(
            Holding.id == item_id,
            Holding.user_id == user_id,
            Holding.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)
