import { CheckCircle2, Clock3, Sparkles } from "lucide-react"

import type { ProgressItem } from "@/features/trading/v2/createJournal/draftState"

export function JournalProgress({
  pct,
  items,
  onJump,
}: {
  pct: number
  items: ProgressItem[]
  onJump: (sectionId: string) => void
}) {
  const visible = items.filter((i) =>
    ["market_context", "trading_plan", "psychology", "lessons", "screenshots"].includes(i.id),
  )
  const complete = pct >= 100

  return (
    <aside className="cj-card" aria-label="Journal progress">
      <div className="cj-card-head" style={{ marginBottom: 4 }}>
        <h3 className="cj-card-title">
          <Sparkles size={15} />
          Journal Progress
        </h3>
        <span className="cj-progress-pct">{complete ? "Complete" : `${pct.toFixed(2)}% Complete`}</span>
      </div>
      <div className="cj-progress-bar" aria-hidden>
        <div className="cj-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="cj-progress-list">
        {visible.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="cj-progress-item"
              data-done={item.done}
              onClick={() => onJump(item.sectionId)}
            >
              {item.done ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
              {item.done ? item.label : item.pendingLabel}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
