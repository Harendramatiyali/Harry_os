/**
 * Trading module global date-range model.
 * Supports month navigation today; presets scale without architecture changes.
 */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "custom"

export type TradingDateRange = {
  /** Inclusive ISO date YYYY-MM-DD */
  startDate: string
  /** Inclusive ISO date YYYY-MM-DD */
  endDate: string
  preset: DateRangePreset
  /** Human label e.g. "August 2026" */
  label: string
}

export const DATE_RANGE_PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3_months", label: "Last 3 Months" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom" },
]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = x.getDay() // Sun=0
  x.setDate(x.getDate() - dow)
  return x
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

export function rangeForMonth(year: number, monthIndex: number): TradingDateRange {
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0)
  const now = new Date()
  const isThisMonth = now.getFullYear() === year && now.getMonth() === monthIndex
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    preset: isThisMonth ? "this_month" : "custom",
    label: monthLabel(year, monthIndex),
  }
}

export function resolvePreset(preset: DateRangePreset, now = new Date()): TradingDateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case "today":
      return {
        startDate: toIsoDate(today),
        endDate: toIsoDate(today),
        preset,
        label: "Today",
      }
    case "yesterday": {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return {
        startDate: toIsoDate(y),
        endDate: toIsoDate(y),
        preset,
        label: "Yesterday",
      }
    }
    case "this_week": {
      const s = startOfWeek(today)
      const e = endOfWeek(today)
      return { startDate: toIsoDate(s), endDate: toIsoDate(e), preset, label: "This Week" }
    }
    case "last_week": {
      const s = startOfWeek(today)
      s.setDate(s.getDate() - 7)
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
      return { startDate: toIsoDate(s), endDate: toIsoDate(e), preset, label: "Last Week" }
    }
    case "this_month":
      return rangeForMonth(today.getFullYear(), today.getMonth())
    case "last_month": {
      const m = today.getMonth() - 1
      const y = m < 0 ? today.getFullYear() - 1 : today.getFullYear()
      const mi = (m + 12) % 12
      const r = rangeForMonth(y, mi)
      return { ...r, preset: "last_month", label: "Last Month" }
    }
    case "last_3_months": {
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      return {
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        preset,
        label: "Last 3 Months",
      }
    }
    case "this_year": {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return {
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        preset,
        label: String(today.getFullYear()),
      }
    }
    case "custom":
    default:
      return rangeForMonth(today.getFullYear(), today.getMonth())
  }
}

export function shiftMonth(range: TradingDateRange, delta: number): TradingDateRange {
  const start = parseIsoDate(range.startDate)
  return rangeForMonth(start.getFullYear(), start.getMonth() + delta)
}

/** Calendar cursor = first day of the month that contains startDate */
export function monthCursorFromRange(range: TradingDateRange): Date {
  const d = parseIsoDate(range.startDate)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}
