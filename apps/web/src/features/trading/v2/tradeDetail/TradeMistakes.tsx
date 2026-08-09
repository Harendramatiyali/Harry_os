import { AlertTriangle } from "lucide-react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { TradeDetailMistake } from "@/features/trading/v2/tradeDetail/types"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradeMistakes({ mistakes }: { mistakes: TradeDetailMistake[] }) {
  if (!mistakes.length) return null
  return (
    <CollapsibleSection
      title={
        <>
          <AlertTriangle size={14} strokeWidth={1.75} />
          Mistakes
        </>
      }
      subtitle={`${mistakes.length} logged`}
      defaultOpen
      className="td-section td-section--collapse"
    >
      <div className="td-mistakes">
        {mistakes.map((m) => (
          <MistakeCard key={m.id} mistake={m} />
        ))}
      </div>
    </CollapsibleSection>
  )
}

function MistakeCard({ mistake }: { mistake: TradeDetailMistake }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn(
        "td-mistake",
        mistake.severity === "high" && "td-mistake--high",
        mistake.severity === "medium" && "td-mistake--med",
        mistake.severity === "low" && "td-mistake--low",
      )}
    >
      <button type="button" className="td-mistake__head" onClick={() => setOpen((v) => !v)}>
        <span className="td-mistake__warn" aria-hidden>
          ⚠
        </span>
        <span className="td-mistake__label">{mistake.label}</span>
        <span className="td-mistake__sev">{mistake.severity}</span>
        <ChevronDown size={14} className={cn("td-mistake__chev", open && "is-open")} />
      </button>
      {open ? <p className="td-mistake__desc">{mistake.description}</p> : null}
    </div>
  )
}
