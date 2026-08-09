import { cn } from "@/shared/lib/utils"
import type { TradeDetailMetric } from "@/features/trading/v2/tradeDetail/types"

export function TradeSummary({ metrics }: { metrics: TradeDetailMetric[] }) {
  return (
    <section className="td-kpi-row">
      {metrics.map((m) => (
        <div key={m.id} className="td-kpi">
          <span className="td-kpi__label">{m.label}</span>
          <strong
            className={cn(
              "td-kpi__value",
              m.tone === "positive" && "td-kpi__value--green",
              m.tone === "negative" && "td-kpi__value--rose",
              m.tone === "accent" && "td-kpi__value--violet",
            )}
          >
            {m.value}
          </strong>
        </div>
      ))}
    </section>
  )
}
