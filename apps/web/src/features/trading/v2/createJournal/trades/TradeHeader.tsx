import { Star } from "lucide-react"

import { formatMoney2, num2 } from "@/features/trading/v2/mapJournalToV2"
import {
  estimateTradePnl,
  inferResult,
  numOrNull,
  type DraftTradeReview,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

export function TradeHeader({
  trade,
  expanded,
  onToggle,
}: {
  trade: DraftTradeReview
  expanded: boolean
  onToggle: () => void
}) {
  const result = inferResult(trade)
  const pnl = numOrNull(trade.pnl) ?? estimateTradePnl(trade)
  const resultLabel =
    result === "win" ? "Win" : result === "loss" ? "Loss" : trade.result || "Flat"

  return (
    <button type="button" className="tr-header" data-expanded={expanded} onClick={onToggle}>
      <div className="tr-header-left">
        <span className="tr-header-num">Trade #{trade.tradeIndex}</span>
        <span className={`tr-result tr-result-${result}`}>{resultLabel}</span>
        {trade.setup ? <span className="tr-chip">{trade.setup}</span> : null}
        {trade.entryTime ? <span className="tr-meta">Entry {trade.entryTime}</span> : null}
        {trade.exitTime ? <span className="tr-meta">Exit {trade.exitTime}</span> : null}
      </div>
      <div className="tr-header-right">
        <span className="tr-meta">Qty {num2(trade.quantity)}</span>
        <span className="tr-meta">
          {num2(trade.entry)} → {num2(trade.exit)}
        </span>
        <span className={pnl != null && pnl < 0 ? "tr-pnl neg" : "tr-pnl pos"}>
          {pnl != null ? formatMoney2(pnl) : "—"}
        </span>
        <span className="tr-stars" aria-label={`${trade.starRating} of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={13}
              className={i < trade.starRating ? "filled" : ""}
              fill={i < trade.starRating ? "currentColor" : "none"}
            />
          ))}
        </span>
        <span className="tr-chevron" aria-hidden>
          {expanded ? "▾" : "▸"}
        </span>
      </div>
    </button>
  )
}
