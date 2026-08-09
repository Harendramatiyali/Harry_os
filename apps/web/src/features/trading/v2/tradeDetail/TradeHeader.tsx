import { Calendar } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { TradeDetailModel } from "@/features/trading/v2/tradeDetail/types"

export function TradeHeader({ trade }: { trade: TradeDetailModel }) {
  const statusLabel =
    trade.status === "win" ? "Win" : trade.status === "loss" ? "Loss" : "Flat"

  return (
    <header className="td-header">
      <div className="td-header__left">
        <h2 className="td-header__instrument">
          Trade #{trade.tradeIndex}
          {trade.grade ? <span className="td-pill td-pill--amber">Grade {trade.grade}</span> : null}
        </h2>
        <p className="td-header__sub">
          {trade.instrument}
          {trade.direction ? ` · ${trade.direction}` : ""}
          {trade.strike ? ` · Strike ${trade.strike}` : ""}
          <span className="td-header__date">
            <Calendar size={13} strokeWidth={1.75} />
            {trade.tradeDate}
          </span>
        </p>
      </div>

      <div className="td-header__right">
        <span
          className={cn(
            "td-badge",
            trade.status === "win" && "td-badge--win",
            trade.status === "loss" && "td-badge--loss",
            trade.status === "flat" && "td-badge--flat",
          )}
        >
          {statusLabel}
        </span>
        <p
          className={cn(
            "td-header__pnl",
            trade.pnl > 0 && "is-pos",
            trade.pnl < 0 && "is-neg",
          )}
        >
          {trade.pnlLabel}
        </p>
      </div>
    </header>
  )
}
