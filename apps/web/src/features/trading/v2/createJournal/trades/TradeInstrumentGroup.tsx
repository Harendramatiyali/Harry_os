import { Trash2 } from "lucide-react"

import { TradeBasicDetails } from "@/features/trading/v2/createJournal/trades/TradeBasicDetails"
import { TradeExecution } from "@/features/trading/v2/createJournal/trades/TradeExecution"
import { TradeGallery } from "@/features/trading/v2/createJournal/trades/TradeGallery"
import { TradeHeader } from "@/features/trading/v2/createJournal/trades/TradeHeader"
import { TradePerformance } from "@/features/trading/v2/createJournal/trades/TradePerformance"
import { TradeReviewWorkspace } from "@/features/trading/v2/createJournal/trades/TradeReviewWorkspace"
import type { DraftTradeReview } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { estimateTradePnl, inferResult, numOrNull } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { formatMoney2 } from "@/features/trading/v2/mapJournalToV2"

export function TradeInstrumentGroup({
  group,
  trades,
  expanded,
  expandedTradeId,
  onToggleGroup,
  onToggleTrade,
  onChangeTrade,
  onDeleteTrade,
  deletingId,
}: {
  group: string
  trades: DraftTradeReview[]
  expanded: boolean
  expandedTradeId: string | null
  onToggleGroup: () => void
  onToggleTrade: (id: string) => void
  onChangeTrade: (id: string, patch: Partial<DraftTradeReview>) => void
  onDeleteTrade: (id: string) => void
  deletingId?: string | null
}) {
  let pnl = 0
  for (const t of trades) {
    pnl += numOrNull(t.pnl) ?? estimateTradePnl(t) ?? 0
  }
  const winRate =
    trades.length === 0
      ? 0
      : (trades.filter((t) => (numOrNull(t.pnl) ?? estimateTradePnl(t) ?? 0) > 0).length /
          trades.length) *
        100

  return (
    <section className="tr-group" data-open={expanded}>
      <button type="button" className="tr-group-head" onClick={onToggleGroup}>
        <span className="tr-group-chevron" aria-hidden>
          {expanded ? "▼" : "▶"}
        </span>
        <strong>{group}</strong>
        <span className="tv2-caption">{trades.length} trades</span>
        <span className={pnl >= 0 ? "tv2-positive tv2-caption" : "tv2-negative tv2-caption"}>
          {formatMoney2(pnl)}
        </span>
        <span className="tv2-caption">WR {winRate.toFixed(2)}%</span>
      </button>
      {expanded ? (
        <div className="tr-group-body">
          {trades.map((t) => {
            const open = expandedTradeId === t.id
            return (
              <article
                key={t.id}
                className="tr-trade"
                data-open={open}
                data-result={inferResult(t)}
              >
                <TradeHeader trade={t} expanded={open} onToggle={() => onToggleTrade(t.id)} />
                {open ? (
                  <div className="tr-trade-body">
                    <div className="tr-trade-toolbar">
                      <button
                        type="button"
                        className="cj-btn cj-btn-danger"
                        disabled={deletingId === t.id}
                        onClick={() => onDeleteTrade(t.id)}
                      >
                        <Trash2 size={14} />
                        {deletingId === t.id ? "Deleting…" : "Delete Trade"}
                      </button>
                    </div>
                    <div className="tr-approved-grid">
                      <TradeBasicDetails
                        trade={t}
                        onChange={(patch) => onChangeTrade(t.id, patch)}
                      />
                      <TradeExecution trade={t} onChange={(patch) => onChangeTrade(t.id, patch)} />
                      <TradePerformance
                        trade={t}
                        onChange={(patch) => onChangeTrade(t.id, patch)}
                      />
                    </div>
                    <TradeGallery
                      screenshots={t.screenshots}
                      onChange={(screenshots) => onChangeTrade(t.id, { screenshots })}
                    />
                    <TradeReviewWorkspace
                      trade={t}
                      onChange={(patch) => onChangeTrade(t.id, patch)}
                    />
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
