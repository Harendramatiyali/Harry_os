"""Finance module schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class IncomeKind(str, Enum):
    SALARY = "salary"
    BONUS = "bonus"
    FREELANCE = "freelance"
    OTHER = "other"


class ExpenseCategory(str, Enum):
    FOOD = "food"
    RENT = "rent"
    TRANSPORT = "transport"
    UTILITIES = "utilities"
    HEALTH = "health"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    EDUCATION = "education"
    TRAVEL = "travel"
    SUBSCRIPTIONS = "subscriptions"
    OTHER = "other"


class AccountType(str, Enum):
    BANK = "bank"
    CASH = "cash"
    WALLET = "wallet"
    CREDIT = "credit"


class LoanStatus(str, Enum):
    ACTIVE = "active"
    PAID_OFF = "paid_off"
    DEFAULTED = "defaulted"


class HoldingType(str, Enum):
    STOCK = "stock"
    MUTUAL_FUND = "mutual_fund"
    OTHER = "other"


# —— Accounts ——


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    account_type: AccountType = AccountType.BANK
    balance: Decimal = Field(default=Decimal("0"))
    currency: str = Field(default="INR", max_length=8)
    notes: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    account_type: AccountType | None = None
    balance: Decimal | None = None
    currency: str | None = Field(default=None, max_length=8)
    notes: str | None = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    account_type: AccountType
    balance: Decimal
    currency: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Income / Salary ——


class IncomeCreate(BaseModel):
    kind: IncomeKind = IncomeKind.SALARY
    source: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    currency: str = Field(default="INR", max_length=8)
    received_on: date
    notes: str | None = None


class IncomeUpdate(BaseModel):
    kind: IncomeKind | None = None
    source: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, max_length=8)
    received_on: date | None = None
    notes: str | None = None


class IncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: IncomeKind
    source: str
    amount: Decimal
    currency: str
    received_on: date
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Expenses ——


class ExpenseCreate(BaseModel):
    category: ExpenseCategory = ExpenseCategory.OTHER
    description: str = Field(min_length=1, max_length=512)
    amount: Decimal = Field(gt=0)
    currency: str = Field(default="INR", max_length=8)
    spent_on: date
    payment_method: str | None = None
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    category: ExpenseCategory | None = None
    description: str | None = Field(default=None, min_length=1, max_length=512)
    amount: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, max_length=8)
    spent_on: date | None = None
    payment_method: str | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: ExpenseCategory
    description: str
    amount: Decimal
    currency: str
    spent_on: date
    payment_method: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Loans ——


class LoanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    lender: str | None = None
    principal: Decimal = Field(gt=0)
    outstanding: Decimal = Field(ge=0)
    interest_rate: Decimal | None = Field(default=None, ge=0)
    emi: Decimal | None = Field(default=None, ge=0)
    start_date: date | None = None
    end_date: date | None = None
    status: LoanStatus = LoanStatus.ACTIVE
    notes: str | None = None


class LoanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    lender: str | None = None
    principal: Decimal | None = Field(default=None, gt=0)
    outstanding: Decimal | None = Field(default=None, ge=0)
    interest_rate: Decimal | None = Field(default=None, ge=0)
    emi: Decimal | None = Field(default=None, ge=0)
    start_date: date | None = None
    end_date: date | None = None
    status: LoanStatus | None = None
    notes: str | None = None


class LoanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    lender: str | None
    principal: Decimal
    outstanding: Decimal
    interest_rate: Decimal | None
    emi: Decimal | None
    start_date: date | None
    end_date: date | None
    status: LoanStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Holdings (stocks / MF / other) ——


class HoldingCreate(BaseModel):
    holding_type: HoldingType = HoldingType.STOCK
    name: str = Field(min_length=1, max_length=255)
    symbol: str | None = Field(default=None, max_length=64)
    units: Decimal = Field(ge=0)
    avg_cost: Decimal = Field(ge=0)
    current_price: Decimal = Field(ge=0)
    currency: str = Field(default="INR", max_length=8)
    notes: str | None = None


class HoldingUpdate(BaseModel):
    holding_type: HoldingType | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    symbol: str | None = Field(default=None, max_length=64)
    units: Decimal | None = Field(default=None, ge=0)
    avg_cost: Decimal | None = Field(default=None, ge=0)
    current_price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    notes: str | None = None


class HoldingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    holding_type: HoldingType
    name: str
    symbol: str | None
    units: Decimal
    avg_cost: Decimal
    current_price: Decimal
    invested_value: Decimal
    current_value: Decimal
    unrealized_pnl: Decimal
    currency: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


# —— Aggregates ——


class CategoryAmount(BaseModel):
    category: str
    amount: Decimal


class MonthlyReport(BaseModel):
    month: str  # YYYY-MM
    income: Decimal
    expenses: Decimal
    savings: Decimal
    salary: Decimal


class NetWorthBreakdown(BaseModel):
    cash: Decimal
    stocks: Decimal
    mutual_funds: Decimal
    other_investments: Decimal
    loans: Decimal
    net_worth: Decimal


class FinanceDashboard(BaseModel):
    currency: str = "INR"
    cash_total: Decimal
    investments_total: Decimal
    stocks_total: Decimal
    mutual_funds_total: Decimal
    loans_outstanding: Decimal
    net_worth: Decimal
    income_this_month: Decimal
    salary_this_month: Decimal
    expenses_this_month: Decimal
    savings_this_month: Decimal
    expense_by_category: list[CategoryAmount]
    recent_expenses: list[ExpenseOut]
    recent_income: list[IncomeOut]
    top_holdings: list[HoldingOut]
    active_loans: list[LoanOut]


class FinanceCharts(BaseModel):
    monthly_cashflow: list[MonthlyReport]
    expense_by_category: list[CategoryAmount]
    net_worth: NetWorthBreakdown
    allocation: list[CategoryAmount]
