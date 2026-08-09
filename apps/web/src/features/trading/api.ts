import { apiRequest } from "@/shared/api/client"
import { API_BASE } from "@/shared/api/base"
import type {
  JournalAnalytics,
  JournalDay,
  JournalDayFilters,
  JournalDaySummary,
  JournalMediaSyncReport,
  JournalMigrateReport,
  JournalPromoteReport,
  Mistake,
  PeriodReview,
  PsychologyEntry,
  ReviewPeriod,
  Screenshot,
  Trade,
  TradeFilters,
  TradingAnalytics,
} from "@/features/trading/types"

function qs(filters: TradeFilters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v)
  })
  const s = params.toString()
  return s ? `?${s}` : ""
}

function journalQs(filters: JournalDayFilters = {}) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.date_from) params.set("date_from", filters.date_from)
  if (filters.date_to) params.set("date_to", filters.date_to)
  if (filters.parse_status) params.set("parse_status", filters.parse_status)
  if (filters.favorite_only) params.set("favorite_only", "true")
  const s = params.toString()
  return s ? `?${s}` : ""
}

export const tradingApi = {
  listTrades(filters: TradeFilters, token: string) {
    return apiRequest<Trade[]>(`/trading/trades${qs(filters)}`, { accessToken: token })
  },

  getTrade(id: string, token: string) {
    return apiRequest<Trade>(`/trading/trades/${id}`, { accessToken: token })
  },

  createTrade(body: Record<string, unknown>, token: string) {
    return apiRequest<Trade>("/trading/trades", { body, accessToken: token })
  },

  updateTrade(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Trade>(`/trading/trades/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },

  deleteTrade(id: string, token: string) {
    return apiRequest<void>(`/trading/trades/${id}`, { method: "DELETE", accessToken: token })
  },

  analytics(token: string, range?: { date_from?: string; date_to?: string }) {
    const params = new URLSearchParams()
    if (range?.date_from) params.set("date_from", range.date_from)
    if (range?.date_to) params.set("date_to", range.date_to)
    const q = params.toString()
    return apiRequest<TradingAnalytics>(`/trading/analytics${q ? `?${q}` : ""}`, {
      accessToken: token,
    })
  },

  listMistakes(token: string) {
    return apiRequest<Mistake[]>("/trading/mistakes", { accessToken: token })
  },

  createMistake(body: Record<string, unknown>, token: string) {
    return apiRequest<Mistake>("/trading/mistakes", { body, accessToken: token })
  },

  deleteMistake(id: string, token: string) {
    return apiRequest<void>(`/trading/mistakes/${id}`, { method: "DELETE", accessToken: token })
  },

  listPsychology(token: string) {
    return apiRequest<PsychologyEntry[]>("/trading/psychology", { accessToken: token })
  },

  createPsychology(body: Record<string, unknown>, token: string) {
    return apiRequest<PsychologyEntry>("/trading/psychology", { body, accessToken: token })
  },

  deletePsychology(id: string, token: string) {
    return apiRequest<void>(`/trading/psychology/${id}`, { method: "DELETE", accessToken: token })
  },

  async uploadScreenshot(tradeId: string, file: File, token: string, caption?: string) {
    const form = new FormData()
    form.append("file", file)
    if (caption) form.append("caption", caption)
    const res = await fetch(`${API_BASE}/trading/trades/${tradeId}/screenshots`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      credentials: "include",
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error?.message || "Upload failed")
    }
    return (await res.json()) as Screenshot
  },

  listReviews(period_type: ReviewPeriod | undefined, token: string) {
    const q = period_type ? `?period_type=${period_type}` : ""
    return apiRequest<PeriodReview[]>(`/trading/reviews${q}`, { accessToken: token })
  },

  createReview(body: Record<string, unknown>, token: string) {
    return apiRequest<PeriodReview>("/trading/reviews", { body, accessToken: token })
  },

  deleteReview(id: string, token: string) {
    return apiRequest<void>(`/trading/reviews/${id}`, { method: "DELETE", accessToken: token })
  },

  listJournals(filters: JournalDayFilters, token: string) {
    return apiRequest<JournalDaySummary[]>(`/trading/journals${journalQs(filters)}`, {
      accessToken: token,
    })
  },

  getJournal(id: string, token: string) {
    return apiRequest<JournalDay>(`/trading/journals/${id}`, { accessToken: token })
  },

  createJournal(body: Record<string, unknown>, token: string) {
    return apiRequest<JournalDay>("/trading/journals", {
      method: "POST",
      body,
      accessToken: token,
    })
  },

  updateJournal(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<JournalDay>(`/trading/journals/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },

  async uploadJournalAttachment(
    journalId: string,
    file: File,
    token: string,
    opts?: { caption?: string; journalTradeId?: string },
  ) {
    const form = new FormData()
    form.append("file", file)
    if (opts?.caption) form.append("caption", opts.caption)
    if (opts?.journalTradeId) form.append("journal_trade_id", opts.journalTradeId)

    const doFetch = (accessToken: string) =>
      fetch(`${API_BASE}/trading/journals/${journalId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        body: form,
        credentials: "include",
      })

    let res = await doFetch(token)
    if (res.status === 401) {
      const { useAuthStore } = await import("@/features/auth/store")
      const next = await useAuthStore.getState().refresh()
      if (next) res = await doFetch(next)
    }
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error?.message || `Upload failed (${res.status})`)
    }
    return (await res.json()) as import("@/features/trading/types").JournalAttachment
  },

  deleteJournalTrade(tradeId: string, token: string) {
    return apiRequest<JournalDay>(`/trading/journals/trades/${tradeId}`, {
      method: "DELETE",
      accessToken: token,
    })
  },

  deleteJournal(id: string, token: string) {
    return apiRequest<void>(`/trading/journals/${id}`, {
      method: "DELETE",
      accessToken: token,
    })
  },

  getJournalByDate(journalDate: string, token: string) {
    return apiRequest<JournalDay>(`/trading/journals/by-date/${journalDate}`, {
      accessToken: token,
    })
  },

  migrateJournals(body: { dry_run?: boolean; note_ids?: string[] }, token: string) {
    return apiRequest<JournalMigrateReport>("/trading/journals/migrate", {
      body,
      accessToken: token,
    })
  },

  syncJournalMedia(token: string) {
    return apiRequest<JournalMediaSyncReport>("/trading/journals/attachments/sync", {
      method: "POST",
      body: {},
      accessToken: token,
    })
  },

  journalAnalytics(token: string, range?: { date_from?: string; date_to?: string }) {
    const params = new URLSearchParams()
    if (range?.date_from) params.set("date_from", range.date_from)
    if (range?.date_to) params.set("date_to", range.date_to)
    const q = params.toString()
    return apiRequest<JournalAnalytics>(`/trading/journals/analytics${q ? `?${q}` : ""}`, {
      accessToken: token,
    })
  },

  promoteJournalTrades(
    body: {
      dry_run?: boolean
      journal_day_id?: string
      journal_trade_ids?: string[]
    },
    token: string,
  ) {
    return apiRequest<JournalPromoteReport>("/trading/journals/promote", {
      method: "POST",
      body,
      accessToken: token,
    })
  },

  async fetchJournalAttachmentBlob(attachmentId: string, token: string) {
    const doFetch = (accessToken: string) =>
      fetch(`${API_BASE}/trading/journals/attachments/${attachmentId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "*/*" },
        credentials: "include",
      })

    let res = await doFetch(token)
    if (res.status === 401) {
      const { useAuthStore } = await import("@/features/auth/store")
      const next = await useAuthStore.getState().refresh()
      if (next) res = await doFetch(next)
    }
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error?.message || `Failed to load attachment (${res.status})`)
    }
    return res.blob()
  },
}
