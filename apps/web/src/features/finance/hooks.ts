import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { financeApi } from "@/features/finance/api"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function useFinanceDashboard() {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "dashboard"],
    queryFn: () => financeApi.dashboard(token!),
    enabled: Boolean(token),
  })
}

export function useFinanceCharts() {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "charts"],
    queryFn: () => financeApi.charts(token!),
    enabled: Boolean(token),
  })
}

export function useMonthlyReports(months = 6) {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "reports", months],
    queryFn: () => financeApi.monthlyReports(token!, months),
    enabled: Boolean(token),
  })
}

export function useAccounts() {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "accounts"],
    queryFn: () => financeApi.listAccounts(token!),
    enabled: Boolean(token),
  })
}

export function useIncomes(kind?: string) {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "incomes", kind],
    queryFn: () => financeApi.listIncomes(token!, kind),
    enabled: Boolean(token),
  })
}

export function useExpenses(category?: string) {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "expenses", category],
    queryFn: () => financeApi.listExpenses(token!, category),
    enabled: Boolean(token),
  })
}

export function useLoans(status?: string) {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "loans", status],
    queryFn: () => financeApi.listLoans(token!, status),
    enabled: Boolean(token),
  })
}

export function useHoldings(holdingType?: string) {
  const token = useToken()
  return useQuery({
    queryKey: ["finance", "holdings", holdingType],
    queryFn: () => financeApi.listHoldings(token!, holdingType),
    enabled: Boolean(token),
  })
}

export function useFinanceMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["finance"] })
  }

  return {
    createAccount: useMutation({
      mutationFn: (body: Record<string, unknown>) => financeApi.createAccount(body, token),
      onSuccess: invalidate,
    }),
    updateAccount: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        financeApi.updateAccount(id, body, token),
      onSuccess: invalidate,
    }),
    deleteAccount: useMutation({
      mutationFn: (id: string) => financeApi.deleteAccount(id, token),
      onSuccess: invalidate,
    }),
    createIncome: useMutation({
      mutationFn: (body: Record<string, unknown>) => financeApi.createIncome(body, token),
      onSuccess: invalidate,
    }),
    deleteIncome: useMutation({
      mutationFn: (id: string) => financeApi.deleteIncome(id, token),
      onSuccess: invalidate,
    }),
    createExpense: useMutation({
      mutationFn: (body: Record<string, unknown>) => financeApi.createExpense(body, token),
      onSuccess: invalidate,
    }),
    deleteExpense: useMutation({
      mutationFn: (id: string) => financeApi.deleteExpense(id, token),
      onSuccess: invalidate,
    }),
    createLoan: useMutation({
      mutationFn: (body: Record<string, unknown>) => financeApi.createLoan(body, token),
      onSuccess: invalidate,
    }),
    updateLoan: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        financeApi.updateLoan(id, body, token),
      onSuccess: invalidate,
    }),
    deleteLoan: useMutation({
      mutationFn: (id: string) => financeApi.deleteLoan(id, token),
      onSuccess: invalidate,
    }),
    createHolding: useMutation({
      mutationFn: (body: Record<string, unknown>) => financeApi.createHolding(body, token),
      onSuccess: invalidate,
    }),
    updateHolding: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        financeApi.updateHolding(id, body, token),
      onSuccess: invalidate,
    }),
    deleteHolding: useMutation({
      mutationFn: (id: string) => financeApi.deleteHolding(id, token),
      onSuccess: invalidate,
    }),
  }
}
