import { parseIsoDate, toIsoDate } from "@/features/trading/v2/dateRange"

/** Monday of the ISO-style trading week containing `d`. */
export function startOfTradingWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = x.getDay() // Sun=0 … Sat=6
  const diff = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + diff)
  return x
}

/** Friday of the trading week containing `d`. */
export function endOfTradingWeek(d: Date): Date {
  const s = startOfTradingWeek(d)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 4)
}

export function shiftTradingWeek(anchorIso: string, weeks: number): string {
  const d = parseIsoDate(anchorIso)
  d.setDate(d.getDate() + weeks * 7)
  return toIsoDate(startOfTradingWeek(d))
}

export function tradingWeekBounds(anchorIso: string): {
  startDate: string
  endDate: string
  label: string
} {
  const start = startOfTradingWeek(parseIsoDate(anchorIso))
  const end = endOfTradingWeek(parseIsoDate(anchorIso))
  const label = `${start.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })} – ${end.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`
  return { startDate: toIsoDate(start), endDate: toIsoDate(end), label }
}

export function eachTradingDay(startIso: string, endIso: string): string[] {
  const out: string[] = []
  const cur = parseIsoDate(startIso)
  const end = parseIsoDate(endIso)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow >= 1 && dow <= 5) out.push(toIsoDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export function weekdayShort(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-GB", { weekday: "short" })
}
