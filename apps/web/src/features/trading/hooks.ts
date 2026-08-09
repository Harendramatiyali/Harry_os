import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { tradingApi } from "@/features/trading/api"
import type { JournalDayFilters, ReviewPeriod, TradeFilters } from "@/features/trading/types"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function useTrades(filters: TradeFilters) {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "trades", filters],
    queryFn: () => tradingApi.listTrades(filters, token!),
    enabled: Boolean(token),
  })
}

export function useTradingAnalytics(range?: { date_from?: string; date_to?: string }) {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "analytics", range?.date_from ?? null, range?.date_to ?? null],
    queryFn: () => tradingApi.analytics(token!, range),
    enabled: Boolean(token),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useMistakes() {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "mistakes"],
    queryFn: () => tradingApi.listMistakes(token!),
    enabled: Boolean(token),
  })
}

export function usePsychology() {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "psychology"],
    queryFn: () => tradingApi.listPsychology(token!),
    enabled: Boolean(token),
  })
}

export function useReviews(period?: ReviewPeriod) {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "reviews", period ?? "all"],
    queryFn: () => tradingApi.listReviews(period, token!),
    enabled: Boolean(token),
  })
}

export function useJournalDays(
  filters: JournalDayFilters = {},
  options?: { enabled?: boolean },
) {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "journals", filters],
    queryFn: () => tradingApi.listJournals(filters, token!),
    enabled: Boolean(token) && (options?.enabled ?? true),
    staleTime: 20_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useJournalDay(journalId: string | null) {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "journals", "detail", journalId],
    queryFn: () => tradingApi.getJournal(journalId!, token!),
    enabled: Boolean(token && journalId),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  })
}

export function useJournalAnalytics(range?: { date_from?: string; date_to?: string }) {
  const token = useToken()
  return useQuery({
    queryKey: ["trading", "journals", "analytics", range?.date_from ?? null, range?.date_to ?? null],
    queryFn: () => tradingApi.journalAnalytics(token!, range),
    enabled: Boolean(token),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useTradingMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["trading"] })
  }

  return {
    createTrade: useMutation({
      mutationFn: (body: Record<string, unknown>) => tradingApi.createTrade(body, token),
      onSuccess: invalidate,
    }),
    updateTrade: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        tradingApi.updateTrade(id, body, token),
      onSuccess: invalidate,
    }),
    deleteTrade: useMutation({
      mutationFn: (id: string) => tradingApi.deleteTrade(id, token),
      onSuccess: invalidate,
    }),
    createMistake: useMutation({
      mutationFn: (body: Record<string, unknown>) => tradingApi.createMistake(body, token),
      onSuccess: invalidate,
    }),
    deleteMistake: useMutation({
      mutationFn: (id: string) => tradingApi.deleteMistake(id, token),
      onSuccess: invalidate,
    }),
    createPsychology: useMutation({
      mutationFn: (body: Record<string, unknown>) => tradingApi.createPsychology(body, token),
      onSuccess: invalidate,
    }),
    deletePsychology: useMutation({
      mutationFn: (id: string) => tradingApi.deletePsychology(id, token),
      onSuccess: invalidate,
    }),
    uploadScreenshot: useMutation({
      mutationFn: ({ tradeId, file }: { tradeId: string; file: File }) =>
        tradingApi.uploadScreenshot(tradeId, file, token),
      onSuccess: invalidate,
    }),
    createReview: useMutation({
      mutationFn: (body: Record<string, unknown>) => tradingApi.createReview(body, token),
      onSuccess: invalidate,
    }),
    deleteReview: useMutation({
      mutationFn: (id: string) => tradingApi.deleteReview(id, token),
      onSuccess: invalidate,
    }),
    migrateJournals: useMutation({
      mutationFn: (body: { dry_run?: boolean; note_ids?: string[] } = {}) =>
        tradingApi.migrateJournals(body, token),
      onSuccess: invalidate,
    }),
    syncJournalMedia: useMutation({
      mutationFn: () => tradingApi.syncJournalMedia(token),
      onSuccess: invalidate,
    }),
    promoteJournalTrades: useMutation({
      mutationFn: (body: {
        dry_run?: boolean
        journal_day_id?: string
        journal_trade_ids?: string[]
      } = {}) => tradingApi.promoteJournalTrades(body, token),
      onSuccess: invalidate,
    }),
    updateJournal: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        tradingApi.updateJournal(id, body, token),
      onSuccess: (data, vars) => {
        qc.setQueryData(["trading", "journals", "detail", vars.id], data)
        void qc.invalidateQueries({ queryKey: ["trading", "journals"] })
        void qc.invalidateQueries({ queryKey: ["trading", "analytics"] })
      },
    }),
    createJournal: useMutation({
      mutationFn: (body: Record<string, unknown>) => tradingApi.createJournal(body, token),
      onSuccess: (data) => {
        qc.setQueryData(["trading", "journals", "detail", data.id], data)
        void qc.invalidateQueries({ queryKey: ["trading", "journals"] })
      },
    }),
    deleteJournalTrade: useMutation({
      mutationFn: (tradeId: string) => tradingApi.deleteJournalTrade(tradeId, token),
      onSuccess: (data) => {
        qc.setQueryData(["trading", "journals", "detail", data.id], data)
        void qc.invalidateQueries({ queryKey: ["trading", "journals"] })
        void qc.invalidateQueries({ queryKey: ["trading", "trades"] })
        void qc.invalidateQueries({ queryKey: ["trading", "analytics"] })
      },
    }),
    deleteJournal: useMutation({
      mutationFn: (id: string) => tradingApi.deleteJournal(id, token),
      onSuccess: (_data, id) => {
        qc.removeQueries({ queryKey: ["trading", "journals", "detail", id] })
        void qc.invalidateQueries({ queryKey: ["trading", "journals"] })
        void qc.invalidateQueries({ queryKey: ["trading", "trades"] })
        void qc.invalidateQueries({ queryKey: ["trading", "analytics"] })
      },
    }),
  }
}

export function money(n: number | string | null | undefined) {
  const v = Number(n ?? 0)
  const sign = v > 0 ? "+" : v < 0 ? "−" : ""
  return `${sign}₹${Math.abs(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
