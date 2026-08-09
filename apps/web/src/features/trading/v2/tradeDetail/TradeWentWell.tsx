import { Check } from "lucide-react"
import type { TradeDetailSuccessPoint } from "@/features/trading/v2/tradeDetail/types"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradeWentWell({ points }: { points: TradeDetailSuccessPoint[] }) {
  if (!points.length) return null
  return (
    <CollapsibleSection
      title="What Went Well"
      subtitle={`${points.length} point${points.length === 1 ? "" : "s"}`}
      defaultOpen
      className="td-section td-section--collapse"
    >
      <div className="td-success-grid">
        {points.map((p) => (
          <div key={p.id} className="td-success-card">
            <span className="td-success-card__icon" aria-hidden>
              <Check size={14} strokeWidth={2.25} />
            </span>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}
