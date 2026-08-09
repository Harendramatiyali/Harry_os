import { Trash2 } from "lucide-react"

import { formatMoney2 } from "@/features/trading/v2/mapJournalToV2"
import type { TradeHistoryItem } from "@/features/trading/v2/types"
import { SectionHeader } from "@/features/trading/v2/components/SectionHeader"

export function TradeHistoryCard({
  title = "Trade History",
  items,
  onDelete,
  deletingId,
  emptyHint,
}: {
  title?: string
  items: TradeHistoryItem[]
  onDelete?: (tradeId: string) => void
  deletingId?: string | null
  emptyHint?: string
}) {
  return (
    <section className="tv2-card space-y-3 p-4">
      <SectionHeader title={title} />
      {items.length === 0 ? (
        <p className="tv2-caption px-1">
          {emptyHint ?? "No trades on this journal. Delete only appears when individual trades exist."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li
              key={t.id}
              className="space-y-1 border-b border-[color:var(--tv2-border-soft)] pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="tv2-caption">{t.time}</span>
                <span className={t.pnl >= 0 ? "tv2-caption tv2-positive" : "tv2-caption tv2-negative"}>
                  {formatMoney2(t.pnl)}
                </span>
              </div>
              <p className="text-[13px] font-medium leading-snug">{t.name}</p>
              <p className="tv2-caption">
                {[
                  t.direction,
                  `Qty ${t.qty}`,
                  `${t.entry} → ${t.exit}`,
                  t.grade ? `Grade ${t.grade}` : null,
                  t.chartCount ? `${t.chartCount} charts` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {onDelete ? (
                <button
                  type="button"
                  className="tv2-btn tv2-btn-sm mt-1"
                  style={{
                    color: "#f87171",
                    borderColor: "rgba(248, 113, 113, 0.35)",
                  }}
                  aria-label={`Delete trade ${t.name}`}
                  disabled={deletingId === t.id}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete trade ${t.name}? This removes it from the journal and trade log.`,
                      )
                    ) {
                      onDelete(t.id)
                    }
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  {deletingId === t.id ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
