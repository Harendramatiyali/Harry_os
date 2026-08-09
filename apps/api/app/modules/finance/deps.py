"""Finance FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSessionDep
from app.modules.finance.repository import (
    AccountRepository,
    ExpenseRepository,
    HoldingRepository,
    IncomeRepository,
    LoanRepository,
)
from app.modules.finance.service import FinanceService


def get_finance_service(session: DbSessionDep) -> FinanceService:
    return FinanceService(
        accounts=AccountRepository(session),
        incomes=IncomeRepository(session),
        expenses=ExpenseRepository(session),
        loans=LoanRepository(session),
        holdings=HoldingRepository(session),
    )


FinanceServiceDep = Annotated[FinanceService, Depends(get_finance_service)]
