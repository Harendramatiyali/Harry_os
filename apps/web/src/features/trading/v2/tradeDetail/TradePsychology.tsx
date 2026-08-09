import { Brain } from "lucide-react"
import type { TradeDetailModel } from "@/features/trading/v2/tradeDetail/types"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradePsychology({
  psychology,
}: {
  psychology: NonNullable<TradeDetailModel["psychology"]>
}) {
  return (
    <CollapsibleSection
      title={
        <>
          <Brain size={14} strokeWidth={1.75} />
          Psychology
        </>
      }
      subtitle={
        psychology.mood
          ? `Mood ${psychology.mood}${
              psychology.bars.length ? ` · ${psychology.overallScore.toFixed(1)}/10` : ""
            }`
          : psychology.bars.length
            ? `${psychology.overallScore.toFixed(1)}/10`
            : undefined
      }
      defaultOpen={false}
      className="td-section td-section--collapse"
    >
      {psychology.mood ? (
        <p className="td-psych__mood">
          Mood <span>{psychology.mood}</span>
        </p>
      ) : null}
      {psychology.bars.length ? (
        <div className="td-psych__bars">
          {psychology.bars.map((b) => {
            const pct = Math.max(0, Math.min(100, b.value * 10))
            return (
              <div key={b.id} className="td-psych__row">
                <div className="td-psych__row-top">
                  <span>{b.label}</span>
                  <strong>{pct}%</strong>
                </div>
                <div className="td-psych__track" aria-hidden>
                  <div className="td-psych__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      {psychology.notes.trim() ? (
        <p className="td-psych__notes">{psychology.notes}</p>
      ) : null}
    </CollapsibleSection>
  )
}
