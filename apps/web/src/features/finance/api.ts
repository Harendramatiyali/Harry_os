import { apiRequest } from "@/shared/api/client"
import type {
  Account,
  Expense,
  FinanceCharts,
  FinanceDashboard,
  Holding,
  Income,
  Loan,
  MonthlyReport,
} from "@/features/finance/types"

export const financeApi = {
  dashboard(token: string) {
    return apiRequest<FinanceDashboard>("/finance/dashboard", { accessToken: token })
  },
  charts(token: string) {
    return apiRequest<FinanceCharts>("/finance/charts", { accessToken: token })
  },
  monthlyReports(token: string, months = 6) {
    return apiRequest<MonthlyReport[]>(`/finance/reports/monthly?months=${months}`, {
      accessToken: token,
    })
  },

  listAccounts(token: string) {
    return apiRequest<Account[]>("/finance/accounts", { accessToken: token })
  },
  createAccount(body: Record<string, unknown>, token: string) {
    return apiRequest<Account>("/finance/accounts", { body, accessToken: token })
  },
  updateAccount(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Account>(`/finance/accounts/${id}`, { method: "PATCH", body, accessToken: token })
  },
  deleteAccount(id: string, token: string) {
    return apiRequest<void>(`/finance/accounts/${id}`, { method: "DELETE", accessToken: token })
  },

  listIncomes(token: string, kind?: string) {
    const q = kind ? `?kind=${kind}` : ""
    return apiRequest<Income[]>(`/finance/incomes${q}`, { accessToken: token })
  },
  createIncome(body: Record<string, unknown>, token: string) {
    return apiRequest<Income>("/finance/incomes", { body, accessToken: token })
  },
  updateIncome(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Income>(`/finance/incomes/${id}`, { method: "PATCH", body, accessToken: token })
  },
  deleteIncome(id: string, token: string) {
    return apiRequest<void>(`/finance/incomes/${id}`, { method: "DELETE", accessToken: token })
  },

  listExpenses(token: string, category?: string) {
    const q = category ? `?category=${category}` : ""
    return apiRequest<Expense[]>(`/finance/expenses${q}`, { accessToken: token })
  },
  createExpense(body: Record<string, unknown>, token: string) {
    return apiRequest<Expense>("/finance/expenses", { body, accessToken: token })
  },
  updateExpense(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Expense>(`/finance/expenses/${id}`, { method: "PATCH", body, accessToken: token })
  },
  deleteExpense(id: string, token: string) {
    return apiRequest<void>(`/finance/expenses/${id}`, { method: "DELETE", accessToken: token })
  },

  listLoans(token: string, status?: string) {
    const q = status ? `?status=${status}` : ""
    return apiRequest<Loan[]>(`/finance/loans${q}`, { accessToken: token })
  },
  createLoan(body: Record<string, unknown>, token: string) {
    return apiRequest<Loan>("/finance/loans", { body, accessToken: token })
  },
  updateLoan(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Loan>(`/finance/loans/${id}`, { method: "PATCH", body, accessToken: token })
  },
  deleteLoan(id: string, token: string) {
    return apiRequest<void>(`/finance/loans/${id}`, { method: "DELETE", accessToken: token })
  },

  listHoldings(token: string, holdingType?: string) {
    const q = holdingType ? `?holding_type=${holdingType}` : ""
    return apiRequest<Holding[]>(`/finance/holdings${q}`, { accessToken: token })
  },
  createHolding(body: Record<string, unknown>, token: string) {
    return apiRequest<Holding>("/finance/holdings", { body, accessToken: token })
  },
  updateHolding(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Holding>(`/finance/holdings/${id}`, { method: "PATCH", body, accessToken: token })
  },
  deleteHolding(id: string, token: string) {
    return apiRequest<void>(`/finance/holdings/${id}`, { method: "DELETE", accessToken: token })
  },
}
