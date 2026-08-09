"""Finance HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.modules.auth.deps import CurrentUserDep
from app.modules.finance.deps import FinanceServiceDep
from app.modules.finance.schemas import (
    AccountCreate,
    AccountOut,
    AccountUpdate,
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
)

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/dashboard", response_model=FinanceDashboard)
async def dashboard(user: CurrentUserDep, service: FinanceServiceDep) -> FinanceDashboard:
    return await service.dashboard(user.id)


@router.get("/charts", response_model=FinanceCharts)
async def charts(user: CurrentUserDep, service: FinanceServiceDep) -> FinanceCharts:
    return await service.charts(user.id)


@router.get("/reports/monthly", response_model=list[MonthlyReport])
async def monthly_reports(
    user: CurrentUserDep,
    service: FinanceServiceDep,
    months: int = Query(default=6, ge=1, le=24),
) -> list[MonthlyReport]:
    return await service.monthly_reports(user.id, months=months)


# —— Accounts ——


@router.get("/accounts", response_model=list[AccountOut])
async def list_accounts(user: CurrentUserDep, service: FinanceServiceDep) -> list[AccountOut]:
    return await service.list_accounts(user.id)


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    body: AccountCreate, user: CurrentUserDep, service: FinanceServiceDep
) -> AccountOut:
    return await service.create_account(user.id, body)


@router.patch("/accounts/{item_id}", response_model=AccountOut)
async def update_account(
    item_id: str, body: AccountUpdate, user: CurrentUserDep, service: FinanceServiceDep
) -> AccountOut:
    return await service.update_account(user.id, item_id, body)


@router.delete("/accounts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(item_id: str, user: CurrentUserDep, service: FinanceServiceDep) -> None:
    await service.delete_account(user.id, item_id)


# —— Income / Salary ——


@router.get("/incomes", response_model=list[IncomeOut])
async def list_incomes(
    user: CurrentUserDep,
    service: FinanceServiceDep,
    kind: str | None = None,
) -> list[IncomeOut]:
    return await service.list_incomes(user.id, kind=kind)


@router.post("/incomes", response_model=IncomeOut, status_code=status.HTTP_201_CREATED)
async def create_income(
    body: IncomeCreate, user: CurrentUserDep, service: FinanceServiceDep
) -> IncomeOut:
    return await service.create_income(user.id, body)


@router.patch("/incomes/{item_id}", response_model=IncomeOut)
async def update_income(
    item_id: str, body: IncomeUpdate, user: CurrentUserDep, service: FinanceServiceDep
) -> IncomeOut:
    return await service.update_income(user.id, item_id, body)


@router.delete("/incomes/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(item_id: str, user: CurrentUserDep, service: FinanceServiceDep) -> None:
    await service.delete_income(user.id, item_id)


# —— Expenses ——


@router.get("/expenses", response_model=list[ExpenseOut])
async def list_expenses(
    user: CurrentUserDep,
    service: FinanceServiceDep,
    category: str | None = None,
) -> list[ExpenseOut]:
    return await service.list_expenses(user.id, category=category)


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    body: ExpenseCreate, user: CurrentUserDep, service: FinanceServiceDep
) -> ExpenseOut:
    return await service.create_expense(user.id, body)


@router.patch("/expenses/{item_id}", response_model=ExpenseOut)
async def update_expense(
    item_id: str, body: ExpenseUpdate, user: CurrentUserDep, service: FinanceServiceDep
) -> ExpenseOut:
    return await service.update_expense(user.id, item_id, body)


@router.delete("/expenses/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(item_id: str, user: CurrentUserDep, service: FinanceServiceDep) -> None:
    await service.delete_expense(user.id, item_id)


# —— Loans ——


@router.get("/loans", response_model=list[LoanOut])
async def list_loans(
    user: CurrentUserDep,
    service: FinanceServiceDep,
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[LoanOut]:
    return await service.list_loans(user.id, status=status_filter)


@router.post("/loans", response_model=LoanOut, status_code=status.HTTP_201_CREATED)
async def create_loan(body: LoanCreate, user: CurrentUserDep, service: FinanceServiceDep) -> LoanOut:
    return await service.create_loan(user.id, body)


@router.patch("/loans/{item_id}", response_model=LoanOut)
async def update_loan(
    item_id: str, body: LoanUpdate, user: CurrentUserDep, service: FinanceServiceDep
) -> LoanOut:
    return await service.update_loan(user.id, item_id, body)


@router.delete("/loans/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_loan(item_id: str, user: CurrentUserDep, service: FinanceServiceDep) -> None:
    await service.delete_loan(user.id, item_id)


# —— Holdings (stocks / mutual funds / other) ——


@router.get("/holdings", response_model=list[HoldingOut])
async def list_holdings(
    user: CurrentUserDep,
    service: FinanceServiceDep,
    holding_type: str | None = None,
) -> list[HoldingOut]:
    return await service.list_holdings(user.id, holding_type=holding_type)


@router.post("/holdings", response_model=HoldingOut, status_code=status.HTTP_201_CREATED)
async def create_holding(
    body: HoldingCreate, user: CurrentUserDep, service: FinanceServiceDep
) -> HoldingOut:
    return await service.create_holding(user.id, body)


@router.patch("/holdings/{item_id}", response_model=HoldingOut)
async def update_holding(
    item_id: str, body: HoldingUpdate, user: CurrentUserDep, service: FinanceServiceDep
) -> HoldingOut:
    return await service.update_holding(user.id, item_id, body)


@router.delete("/holdings/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(item_id: str, user: CurrentUserDep, service: FinanceServiceDep) -> None:
    await service.delete_holding(user.id, item_id)
