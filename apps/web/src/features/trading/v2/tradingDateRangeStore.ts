import { create } from "zustand"

import {
  type DateRangePreset,
  type TradingDateRange,
  rangeForMonth,
  resolvePreset,
  shiftMonth,
} from "@/features/trading/v2/dateRange"

type TradingDateRangeState = {
  range: TradingDateRange
  setPreset: (preset: DateRangePreset) => void
  setCustomRange: (startDate: string, endDate: string, label?: string) => void
  setMonth: (year: number, monthIndex: number) => void
  shiftMonth: (delta: number) => void
  /** Hydrate from URL without fighting local defaults */
  hydrateFromUrl: (params: { month?: string | null; from?: string | null; to?: string | null; preset?: string | null }) => void
}

function defaultRange(): TradingDateRange {
  return resolvePreset("this_month")
}

export const useTradingDateRangeStore = create<TradingDateRangeState>((set, get) => ({
  range: defaultRange(),

  setPreset: (preset) => {
    if (preset === "custom") return
    set({ range: resolvePreset(preset) })
  },

  setCustomRange: (startDate, endDate, label) => {
    set({
      range: {
        startDate,
        endDate,
        preset: "custom",
        label: label ?? `${startDate} → ${endDate}`,
      },
    })
  },

  setMonth: (year, monthIndex) => {
    set({ range: rangeForMonth(year, monthIndex) })
  },

  shiftMonth: (delta) => {
    set({ range: shiftMonth(get().range, delta) })
  },

  hydrateFromUrl: ({ month, from, to, preset }) => {
    if (from && to) {
      const label =
        from.slice(0, 7) === to.slice(0, 7)
          ? new Date(`${from}T12:00:00`).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })
          : `${from} → ${to}`
      set({
        range: {
          startDate: from,
          endDate: to,
          preset: (preset as DateRangePreset) || "custom",
          label,
        },
      })
      return
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number)
      set({ range: rangeForMonth(y!, (m ?? 1) - 1) })
      return
    }
    if (preset && preset !== "custom") {
      set({ range: resolvePreset(preset as DateRangePreset) })
    }
  },
}))

/** Stable API filter slice for React Query keys (date-only endpoints). */
export function dateRangeToApiParams(range: TradingDateRange): {
  date_from: string
  date_to: string
} {
  return { date_from: range.startDate, date_to: range.endDate }
}

/** Inclusive end-of-day for datetime query params (ledger / analytics). */
export function dateRangeToDateTimeParams(range: TradingDateRange): {
  date_from: string
  date_to: string
} {
  return {
    date_from: `${range.startDate}T00:00:00`,
    date_to: `${range.endDate}T23:59:59`,
  }
}
