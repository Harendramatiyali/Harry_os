import { memo } from "react"
import { Star } from "lucide-react"

import { formatMoney2 } from "@/features/trading/v2/mapJournalToV2"
import type { JournalCardModel } from "@/features/trading/v2/types"
import { cn } from "@/shared/lib/utils"

export const JournalCard = memo(function JournalCard({
  model,
  active,
  onSelect,
  onToggleFavorite,
}: {
  model: JournalCardModel
  active?: boolean
  onSelect?: (id: string) => void
  onToggleFavorite?: (id: string) => void
}) {
  return (
    <article
      className="tv2-journal relative"
      data-active={Boolean(active)}
      aria-current={active ? "true" : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-[14px]"
        aria-label={`Open journal ${model.title}, ${model.date}, ${model.trades} trades, P&L ${formatMoney2(model.pnl)}`}
        onClick={() => onSelect?.(model.id)}
      />
      <div className="pointer-events-none relative z-[1]">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="tv2-caption">{model.date}</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "tv2-badge",
                model.source === "AI" ? "tv2-badge-ai" : "tv2-badge-obsidian",
              )}
            >
              {model.source}
            </span>
            <span className="pointer-events-auto inline-flex">
              <button
                type="button"
                aria-label={model.favorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={Boolean(model.favorite)}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite?.(model.id)
                }}
                className="rounded p-0.5"
              >
                <Star
                  className="size-3.5"
                  aria-hidden
                  style={{
                    color: model.favorite ? "var(--tv2-amber)" : "var(--tv2-muted)",
                    fill: model.favorite ? "var(--tv2-amber)" : "none",
                  }}
                />
              </button>
            </span>
          </div>
        </div>
        <p className="tv2-h3 mb-1.5 line-clamp-2">{model.title}</p>
        <div className="flex items-center justify-between">
          <span className="tv2-caption">{model.trades} trades</span>
          <span
            className={model.pnl >= 0 ? "tv2-caption tv2-positive" : "tv2-caption tv2-negative"}
          >
            {formatMoney2(model.pnl)}
          </span>
        </div>
      </div>
    </article>
  )
})
