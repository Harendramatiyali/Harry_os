export type IncomeKind = "salary" | "bonus" | "freelance" | "other"
export type ExpenseCategory =
  | "food"
  | "rent"
  | "transport"
  | "utilities"
  | "health"
  | "entertainment"
  | "shopping"
  | "education"
  | "travel"
  | "subscriptions"
  | "other"
export type AccountType = "bank" | "cash" | "wallet" | "credit"
export type LoanStatus = "active" | "paid_off" | "defaulted"
export type HoldingType = "stock" | "mutual_fund" | "other"

export type Account = {
  id: string
  name: string
  account_type: AccountType
  balance: string | number
  currency: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Income = {
  id: string
  kind: IncomeKind
  source: string
  amount: string | number
  currency: string
  received_on: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  category: ExpenseCategory
  description: string
  amount: string | number
  currency: string
  spent_on: string
  payment_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Loan = {
  id: string
  name: string
  lender: string | null
  principal: string | number
  outstanding: string | number
  interest_rate: string | number | null
  emi: string | number | null
  start_date: string | null
  end_date: string | null
  status: LoanStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type Holding = {
  id: string
  holding_type: HoldingType
  name: string
  symbol: string | null
  units: string | number
  avg_cost: string | number
  current_price: string | number
  invested_value: string | number
  current_value: string | number
  unrealized_pnl: string | number
  currency: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type CategoryAmount = {
  category: string
  amount: string | number
}

export type MonthlyReport = {
  month: string
  income: string | number
  expenses: string | number
  savings: string | number
  salary: string | number
}

export type FinanceDashboard = {
  currency: string
  cash_total: string | number
  investments_total: string | number
  stocks_total: string | number
  mutual_funds_total: string | number
  loans_outstanding: string | number
  net_worth: string | number
  income_this_month: string | number
  salary_this_month: string | number
  expenses_this_month: string | number
  savings_this_month: string | number
  expense_by_category: CategoryAmount[]
  recent_expenses: Expense[]
  recent_income: Income[]
  top_holdings: Holding[]
  active_loans: Loan[]
}

export type FinanceCharts = {
  monthly_cashflow: MonthlyReport[]
  expense_by_category: CategoryAmount[]
  net_worth: {
    cash: string | number
    stocks: string | number
    mutual_funds: string | number
    other_investments: string | number
    loans: string | number
    net_worth: string | number
  }
  allocation: CategoryAmount[]
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "food",
  "rent",
  "transport",
  "utilities",
  "health",
  "entertainment",
  "shopping",
  "education",
  "travel",
  "subscriptions",
  "other",
]
