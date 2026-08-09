"""Finance module ORM models."""

from __future__ import annotations

import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


class IncomeKind(str, enum.Enum):
    SALARY = "salary"
    BONUS = "bonus"
    FREELANCE = "freelance"
    OTHER = "other"


class ExpenseCategory(str, enum.Enum):
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


class AccountType(str, enum.Enum):
    BANK = "bank"
    CASH = "cash"
    WALLET = "wallet"
    CREDIT = "credit"


class LoanStatus(str, enum.Enum):
    ACTIVE = "active"
    PAID_OFF = "paid_off"
    DEFAULTED = "defaulted"


class HoldingType(str, enum.Enum):
    STOCK = "stock"
    MUTUAL_FUND = "mutual_fund"
    OTHER = "other"


class FinanceAccount(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Liquid cash / bank balances for net worth."""

    __tablename__ = "finance_accounts"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="finance_account_type", native_enum=False, length=16),
        nullable=False,
        default=AccountType.BANK,
        server_default=AccountType.BANK.value,
    )
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0, server_default="0")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR", server_default="INR")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class IncomeEntry(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Salary and other income."""

    __tablename__ = "finance_incomes"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[IncomeKind] = mapped_column(
        Enum(IncomeKind, name="finance_income_kind", native_enum=False, length=16),
        nullable=False,
        default=IncomeKind.SALARY,
        server_default=IncomeKind.SALARY.value,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR", server_default="INR")
    received_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Expense(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "finance_expenses"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="finance_expense_category", native_enum=False, length=24),
        nullable=False,
        default=ExpenseCategory.OTHER,
        server_default=ExpenseCategory.OTHER.value,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR", server_default="INR")
    spent_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payment_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Loan(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "finance_loans"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    lender: Mapped[str | None] = mapped_column(String(255), nullable=True)
    principal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    outstanding: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    emi: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[LoanStatus] = mapped_column(
        Enum(LoanStatus, name="finance_loan_status", native_enum=False, length=16),
        nullable=False,
        default=LoanStatus.ACTIVE,
        server_default=LoanStatus.ACTIVE.value,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Holding(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Stocks, mutual funds, and other investments."""

    __tablename__ = "finance_holdings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    holding_type: Mapped[HoldingType] = mapped_column(
        Enum(HoldingType, name="finance_holding_type", native_enum=False, length=16),
        nullable=False,
        default=HoldingType.STOCK,
        server_default=HoldingType.STOCK.value,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    units: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False, default=0, server_default="0")
    avg_cost: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False, default=0, server_default="0")
    current_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False, default=0, server_default="0")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR", server_default="INR")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
