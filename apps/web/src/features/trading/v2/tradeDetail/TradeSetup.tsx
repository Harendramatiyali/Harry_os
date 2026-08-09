import type { TradeDetailChip } from "@/features/trading/v2/tradeDetail/types"
import { cn } from "@/shared/lib/utils"

export function TradeSetup({ chips }: { chips: TradeDetailChip[] }) {
  if (!chips.length) return null
  return (
    <section className="td-section">
      <h3 className="td-section__title">Setup</h3>
      <div className="td-chips">
        {chips.map((c) => (
          <span key={c.id} className={cn("td-chip", `td-chip--${c.tone}`)}>
            {c.label}
          </span>
        ))}
      </div>
    </section>
  )
}
