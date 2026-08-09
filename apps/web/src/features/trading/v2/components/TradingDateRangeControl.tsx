import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  monthCursorFromRange,
} from "@/features/trading/v2/dateRange"
import { useTradingDateRangeStore } from "@/features/trading/v2/tradingDateRangeStore"

/**
 * Global period control for the Trading module.
 * Month prev/next drives the calendar; presets scale for week/year/custom later.
 */
export function TradingDateRangeControl({
  className = "",
  showPresets = true,
}: {
  className?: string
  showPresets?: boolean
}) {
  const range = useTradingDateRangeStore((s) => s.range)
  const shiftMonth = useTradingDateRangeStore((s) => s.shiftMonth)
  const setPreset = useTradingDateRangeStore((s) => s.setPreset)
  const cursor = monthCursorFromRange(range)

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Trading period filter"
    >
      <div className="flex items-center gap-1 rounded-[12px] border border-[color:var(--tv2-border)] bg-[color:var(--tv2-surface)] p-0.5">
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-ghost"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="tv2-h3 min-w-[8.5rem] px-1 text-center text-[13px]">{range.label}</span>
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-ghost"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {showPresets ? (
        <label className="tv2-caption flex items-center gap-1.5">
          <span className="sr-only">Period preset</span>
          <select
            className="rounded-[10px] border border-[color:var(--tv2-border)] bg-transparent px-2 py-1.5 text-[12px] text-[color:var(--tv2-fg)] outline-none"
            value={range.preset === "custom" ? "this_month" : range.preset}
            onChange={(e) => setPreset(e.target.value as DateRangePreset)}
            aria-label="Quick period"
          >
            {DATE_RANGE_PRESETS.filter((p) => p.id !== "custom").map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <span className="tv2-caption hidden md:inline" title={`${range.startDate} → ${range.endDate}`}>
        {cursor.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
      </span>
    </div>
  )
}
