import { Plus, Search } from "lucide-react"

import type { JournalDaySummary } from "@/features/trading/types"
import {
  formatTimelineDate,
} from "@/features/trading/v2/createJournal/draftState"
import { formatMoney2 } from "@/features/trading/v2/mapJournalToV2"

export type TimelineFilter = "all" | "favourites" | "winning" | "losing"

function gradeTone(grade: string | null): "high" | "mid" | "low" {
  const g = (grade || "").toUpperCase()
  if (g.startsWith("A")) return "high"
  if (g.startsWith("B")) return "mid"
  return "low"
}

export function JournalTimeline({
  journals,
  activeId,
  query,
  filter,
  onQueryChange,
  onFilterChange,
  onSelect,
  onNew,
}: {
  journals: JournalDaySummary[]
  activeId: string | null
  query: string
  filter: TimelineFilter
  onQueryChange: (q: string) => void
  onFilterChange: (f: TimelineFilter) => void
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const filters: Array<{ id: TimelineFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "favourites", label: "Favourites" },
    { id: "winning", label: "Winning" },
    { id: "losing", label: "Losing" },
  ]

  return (
    <aside className="cj-left" aria-label="Journal navigator">
      <div className="cj-left-head">
        <div className="cj-left-title">
          <h2>Trading Journals</h2>
          <button type="button" className="cj-md-tool" aria-label="New journal" onClick={onNew}>
            <Plus size={16} />
          </button>
        </div>
        <label className="cj-search">
          <Search size={14} aria-hidden />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search journals…"
            aria-label="Search journals"
          />
        </label>
        <div className="cj-filters" role="tablist" aria-label="Journal filters">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className="cj-filter"
              role="tab"
              aria-selected={filter === f.id}
              data-active={filter === f.id}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cj-timeline">
        {journals.length === 0 ? (
          <p className="tv2-caption" style={{ padding: 12 }}>
            No journals match this filter.
          </p>
        ) : (
          journals.map((j) => {
            const { top, weekday } = formatTimelineDate(j.journal_date)
            const pnl = Number(j.day_pnl ?? 0)
            return (
              <button
                key={j.id}
                type="button"
                className="cj-timeline-item"
                data-active={activeId === j.id}
                onClick={() => onSelect(j.id)}
              >
                <div>
                  <div className="cj-timeline-date">{top}</div>
                  <div className="cj-timeline-meta">
                    <span>{weekday}</span>
                    <span>{j.trade_count} Trades</span>
                    <span className={pnl >= 0 ? "tv2-positive" : "tv2-negative"}>
                      {formatMoney2(pnl)}
                    </span>
                  </div>
                </div>
                {j.overall_grade ? (
                  <span className="cj-grade" data-tone={gradeTone(j.overall_grade)}>
                    {j.overall_grade}
                  </span>
                ) : (
                  <span className="cj-grade" data-tone="mid">
                    —
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>

      <div className="cj-left-foot">
        <button type="button" className="cj-new-btn" onClick={onNew}>
          <Plus size={16} />
          New Journal
        </button>
      </div>
    </aside>
  )
}
