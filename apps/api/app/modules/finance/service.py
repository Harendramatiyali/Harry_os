"""Finance use-cases."""

from __future__ import annotations

import calendar
import uuid
from datetime import date
from decimal import Decimal

from app.core.errors import NotFoundError
from app.modules.finance.models import (
    Expense,
    FinanceAccount,
    Holding,
    HoldingType,
    IncomeEntry,
    IncomeKind,
    Loan,
    LoanStatus,
)
from app.modules.finance.repository import (
    AccountRepository,
    ExpenseRepository,
    HoldingRepository,
    IncomeRepository,
    LoanRepository,
    soft_delete,
)
from app.modules.finance.schemas import (
    AccountCreate,
    AccountOut,
    AccountUpdate,
    CategoryAmount,
    ExpenseCreate,
    ExpenseOut,
    ExpenseUpdate,
    FinanceCharts,
    FinanceDashboard,
    HoldingCreate,
    HoldingOut,
    HoldingUpdate,
    IncomeCreate,
    IncomeOut,
    IncomeUpdate,
    LoanCreate,
    LoanOut,
    LoanUpdate,
    MonthlyReport,
    NetWorthBreakdown,
)


def _holding_values(h: Holding) -> tuple[Decimal, Decimal, Decimal]:
    invested = (h.units * h.avg_cost).quantize(Decimal("0.0001"))
    current = (h.units * h.current_price).quantize(Decimal("0.0001"))
    pnl = (current - invested).quantize(Decimal("0.0001"))
    return invested, current, pnl


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def _shift_month(d: date, delta: int) -> tuple[int, int]:
    m = d.month - 1 + delta
    y = d.year + m // 12
    m = m % 12 + 1
    return y, m


class FinanceService:
    def __init__(
        self,
        *,
        accounts: AccountRepository,
        incomes: IncomeRepository,
        expenses: ExpenseRepository,
        loans: LoanRepository,
        holdings: HoldingRepository,
    ) -> None:
        self.accounts = accounts
        self.incomes = incomes
        self.expenses = expenses
        self.loans = loans
        self.holdings = holdings

    # —— mappers ——

    def to_holding_out(self, h: Holding) -> HoldingOut:
        invested, current, pnl = _holding_values(h)
        return HoldingOut(
            id=h.id,
            holding_type=h.holding_type,  # type: ignore[arg-type]
            name=h.name,
            symbol=h.symbol,
            units=h.units,
            avg_cost=h.avg_cost,
            current_price=h.current_price,
            invested_value=invested,
            current_value=current,
            unrealized_pnl=pnl,
            currency=h.currency,
            notes=h.notes,
            created_at=h.created_at,
            updated_at=h.updated_at,
        )

    # —— Accounts ——

    async def list_accounts(self, user_id: str) -> list[AccountOut]:
        return [AccountOut.model_validate(a) for a in await self.accounts.list_for_user(user_id)]

    async def create_account(self, user_id: str, data: AccountCreate) -> AccountOut:
        row = FinanceAccount(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.name.strip(),
            account_type=data.account_type,  # type: ignore[arg-type]
            balance=data.balance,
            currency=data.currency.upper(),
            notes=data.notes,
        )
        await self.accounts.add(row)
        return AccountOut.model_validate(row)

    async def update_account(self, user_id: str, item_id: str, data: AccountUpdate) -> AccountOut:
        row = await self._account(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "name" in payload and payload["name"]:
            payload["name"] = payload["name"].strip()
        if "currency" in payload and payload["currency"]:
            payload["currency"] = payload["currency"].upper()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.accounts.session.flush()
        return AccountOut.model_validate(row)

    async def delete_account(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._account(user_id, item_id))
        await self.accounts.session.flush()

    # —— Income ——

    async def list_incomes(self, user_id: str, kind: str | None = None) -> list[IncomeOut]:
        return [IncomeOut.model_validate(i) for i in await self.incomes.list_for_user(user_id, kind=kind)]

    async def create_income(self, user_id: str, data: IncomeCreate) -> IncomeOut:
        row = IncomeEntry(
            id=str(uuid.uuid4()),
            user_id=user_id,
            kind=IncomeKind(data.kind.value),
            source=data.source.strip(),
            amount=data.amount,
            currency=data.currency.upper(),
            received_on=data.received_on,
            notes=data.notes,
        )
        await self.incomes.add(row)
        return IncomeOut.model_validate(row)

    async def update_income(self, user_id: str, item_id: str, data: IncomeUpdate) -> IncomeOut:
        row = await self._income(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "kind" in payload and payload["kind"] is not None:
            payload["kind"] = IncomeKind(payload["kind"].value if hasattr(payload["kind"], "value") else payload["kind"])
        if "source" in payload and payload["source"]:
            payload["source"] = payload["source"].strip()
        if "currency" in payload and payload["currency"]:
            payload["currency"] = payload["currency"].upper()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.incomes.session.flush()
        return IncomeOut.model_validate(row)

    async def delete_income(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._income(user_id, item_id))
        await self.incomes.session.flush()

    # —— Expenses ——

    async def list_expenses(self, user_id: str, category: str | None = None) -> list[ExpenseOut]:
        return [
            ExpenseOut.model_validate(e) for e in await self.expenses.list_for_user(user_id, category=category)
        ]

    async def create_expense(self, user_id: str, data: ExpenseCreate) -> ExpenseOut:
        row = Expense(
            id=str(uuid.uuid4()),
            user_id=user_id,
            category=data.category,  # type: ignore[arg-type]
            description=data.description.strip(),
            amount=data.amount,
            currency=data.currency.upper(),
            spent_on=data.spent_on,
            payment_method=data.payment_method,
            notes=data.notes,
        )
        await self.expenses.add(row)
        return ExpenseOut.model_validate(row)

    async def update_expense(self, user_id: str, item_id: str, data: ExpenseUpdate) -> ExpenseOut:
        row = await self._expense(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "description" in payload and payload["description"]:
            payload["description"] = payload["description"].strip()
        if "currency" in payload and payload["currency"]:
            payload["currency"] = payload["currency"].upper()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.expenses.session.flush()
        return ExpenseOut.model_validate(row)

    async def delete_expense(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._expense(user_id, item_id))
        await self.expenses.session.flush()

    # —— Loans ——

    async def list_loans(self, user_id: str, status: str | None = None) -> list[LoanOut]:
        return [LoanOut.model_validate(l) for l in await self.loans.list_for_user(user_id, status=status)]

    async def create_loan(self, user_id: str, data: LoanCreate) -> LoanOut:
        row = Loan(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.name.strip(),
            lender=data.lender.strip() if data.lender else None,
            principal=data.principal,
            outstanding=data.outstanding,
            interest_rate=data.interest_rate,
            emi=data.emi,
            start_date=data.start_date,
            end_date=data.end_date,
            status=LoanStatus(data.status.value),
            notes=data.notes,
        )
        await self.loans.add(row)
        return LoanOut.model_validate(row)

    async def update_loan(self, user_id: str, item_id: str, data: LoanUpdate) -> LoanOut:
        row = await self._loan(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "name" in payload and payload["name"]:
            payload["name"] = payload["name"].strip()
        if "lender" in payload and payload["lender"]:
            payload["lender"] = payload["lender"].strip()
        if "status" in payload and payload["status"] is not None:
            payload["status"] = LoanStatus(
                payload["status"].value if hasattr(payload["status"], "value") else payload["status"]
            )
        for k, v in payload.items():
            setattr(row, k, v)
        await self.loans.session.flush()
        return LoanOut.model_validate(row)

    async def delete_loan(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._loan(user_id, item_id))
        await self.loans.session.flush()

    # —— Holdings ——

    async def list_holdings(self, user_id: str, holding_type: str | None = None) -> list[HoldingOut]:
        rows = await self.holdings.list_for_user(user_id, holding_type=holding_type)
        return [self.to_holding_out(h) for h in rows]

    async def create_holding(self, user_id: str, data: HoldingCreate) -> HoldingOut:
        row = Holding(
            id=str(uuid.uuid4()),
            user_id=user_id,
            holding_type=HoldingType(data.holding_type.value),
            name=data.name.strip(),
            symbol=data.symbol.strip().upper() if data.symbol else None,
            units=data.units,
            avg_cost=data.avg_cost,
            current_price=data.current_price,
            currency=data.currency.upper(),
            notes=data.notes,
        )
        await self.holdings.add(row)
        return self.to_holding_out(row)

    async def update_holding(self, user_id: str, item_id: str, data: HoldingUpdate) -> HoldingOut:
        row = await self._holding(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "holding_type" in payload and payload["holding_type"] is not None:
            payload["holding_type"] = HoldingType(
                payload["holding_type"].value
                if hasattr(payload["holding_type"], "value")
                else payload["holding_type"]
            )
        if "name" in payload and payload["name"]:
            payload["name"] = payload["name"].strip()
        if "symbol" in payload and payload["symbol"]:
            payload["symbol"] = payload["symbol"].strip().upper()
        if "currency" in payload and payload["currency"]:
            payload["currency"] = payload["currency"].upper()
        for k, v in payload.items():
            setattr(row, k, v)
        await self.holdings.session.flush()
        return self.to_holding_out(row)

    async def delete_holding(self, user_id: str, item_id: str) -> None:
        soft_delete(await self._holding(user_id, item_id))
        await self.holdings.session.flush()

    # —— Aggregates ——

    async def _net_worth_parts(self, user_id: str) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
        cash = await self.accounts.sum_balance(user_id)
        holdings = await self.holdings.list_for_user(user_id)
        stocks = Decimal("0")
        mfs = Decimal("0")
        other = Decimal("0")
        for h in holdings:
            _, current, _ = _holding_values(h)
            if h.holding_type == HoldingType.STOCK:
                stocks += current
            elif h.holding_type == HoldingType.MUTUAL_FUND:
                mfs += current
            else:
                other += current
        loans = await self.loans.sum_outstanding(user_id)
        return cash, stocks, mfs, other, loans

    async def dashboard(self, user_id: str) -> FinanceDashboard:
        today = date.today()
        start, end = _month_bounds(today.year, today.month)
        cash, stocks, mfs, other, loans = await self._net_worth_parts(user_id)
        investments = stocks + mfs + other
        income_m = await self.incomes.sum_between(user_id, start, end)
        salary_m = await self.incomes.sum_between(user_id, start, end, kind=IncomeKind.SALARY.value)
        expenses_m = await self.expenses.sum_between(user_id, start, end)
        by_cat = await self.expenses.by_category(user_id, start, end)
        holdings = await self.holdings.list_for_user(user_id)
        top = sorted(holdings, key=lambda h: _holding_values(h)[1], reverse=True)[:5]
        active_loans = await self.loans.list_for_user(user_id, status=LoanStatus.ACTIVE.value)

        return FinanceDashboard(
            cash_total=cash,
            investments_total=investments,
            stocks_total=stocks,
            mutual_funds_total=mfs,
            loans_outstanding=loans,
            net_worth=cash + investments - loans,
            income_this_month=income_m,
            salary_this_month=salary_m,
            expenses_this_month=expenses_m,
            savings_this_month=income_m - expenses_m,
            expense_by_category=[CategoryAmount(category=c, amount=a) for c, a in by_cat],
            recent_expenses=[ExpenseOut.model_validate(e) for e in await self.expenses.recent(user_id)],
            recent_income=[IncomeOut.model_validate(i) for i in await self.incomes.recent(user_id)],
            top_holdings=[self.to_holding_out(h) for h in top],
            active_loans=[LoanOut.model_validate(l) for l in active_loans],
        )

    async def monthly_reports(self, user_id: str, months: int = 6) -> list[MonthlyReport]:
        today = date.today()
        reports: list[MonthlyReport] = []
        for delta in range(-(months - 1), 1):
            y, m = _shift_month(today, delta)
            start, end = _month_bounds(y, m)
            income = await self.incomes.sum_between(user_id, start, end)
            salary = await self.incomes.sum_between(user_id, start, end, kind=IncomeKind.SALARY.value)
            expenses = await self.expenses.sum_between(user_id, start, end)
            reports.append(
                MonthlyReport(
                    month=f"{y:04d}-{m:02d}",
                    income=income,
                    expenses=expenses,
                    savings=income - expenses,
                    salary=salary,
                )
            )
        return reports

    async def charts(self, user_id: str) -> FinanceCharts:
        today = date.today()
        start, end = _month_bounds(today.year, today.month)
        cash, stocks, mfs, other, loans = await self._net_worth_parts(user_id)
        investments = stocks + mfs + other
        by_cat = await self.expenses.by_category(user_id, start, end)
        allocation = [
            CategoryAmount(category="cash", amount=cash),
            CategoryAmount(category="stocks", amount=stocks),
            CategoryAmount(category="mutual_funds", amount=mfs),
            CategoryAmount(category="other", amount=other),
        ]
        return FinanceCharts(
            monthly_cashflow=await self.monthly_reports(user_id, months=6),
            expense_by_category=[CategoryAmount(category=c, amount=a) for c, a in by_cat],
            net_worth=NetWorthBreakdown(
                cash=cash,
                stocks=stocks,
                mutual_funds=mfs,
                other_investments=other,
                loans=loans,
                net_worth=cash + investments - loans,
            ),
            allocation=[a for a in allocation if a.amount > 0],
        )

    # —— ownership ——

    async def _account(self, user_id: str, item_id: str) -> FinanceAccount:
        row = await self.accounts.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Account not found")
        return row

    async def _income(self, user_id: str, item_id: str) -> IncomeEntry:
        row = await self.incomes.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Income entry not found")
        return row

    async def _expense(self, user_id: str, item_id: str) -> Expense:
        row = await self.expenses.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Expense not found")
        return row

    async def _loan(self, user_id: str, item_id: str) -> Loan:
        row = await self.loans.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Loan not found")
        return row

    async def _holding(self, user_id: str, item_id: str) -> Holding:
        row = await self.holdings.get_owned(user_id, item_id)
        if not row:
            raise NotFoundError("Holding not found")
        return row
