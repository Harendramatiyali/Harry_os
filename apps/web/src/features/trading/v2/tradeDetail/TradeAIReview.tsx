import { Sparkles } from "lucide-react"
import type { TradeDetailAIReview } from "@/features/trading/v2/tradeDetail/types"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradeAIReview({ review }: { review: TradeDetailAIReview }) {
  const scores = [
    { label: "Execution", value: review.executionScore },
    { label: "Psychology", value: review.psychologyScore },
    { label: "Risk Mgmt", value: review.riskManagement },
    { label: "Discipline", value: review.discipline },
    { label: "Trade Quality", value: review.tradeQuality },
  ]

  return (
    <CollapsibleSection
      title={
        <>
          <Sparkles size={14} strokeWidth={1.75} />
          AI Review
        </>
      }
      subtitle={`Grade ${review.overallGrade}`}
      badge={<span className="td-badge td-badge--ai">AI</span>}
      defaultOpen={false}
      className="td-section td-section--collapse"
    >
      <div className="td-ai">
        <div className="td-ai__head">
          <div>
            <p className="td-ai__eyebrow">
              <Sparkles size={13} strokeWidth={1.75} />
              Trade Coach Summary
            </p>
            <h3 className="td-ai__title">Trade Coach Summary</h3>
          </div>
          <div className="td-ai__grade">
            <span>Overall Grade</span>
            <strong>{review.overallGrade}</strong>
          </div>
        </div>

        <div className="td-ai__scores">
          {scores.map((s) => (
            <div key={s.label} className="td-ai__score">
              <div className="td-ai__score-top">
                <span>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
              <div className="td-ai__track" aria-hidden>
                <div className="td-ai__fill" style={{ width: `${s.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="td-ai__cols">
          <div>
            <h4>Top Strengths</h4>
            <ul>
              {review.topStrengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Top Mistakes</h4>
            <ul>
              {review.topMistakes.length ? (
                review.topMistakes.map((s) => <li key={s}>{s}</li>)
              ) : (
                <li>No major mistakes logged</li>
              )}
            </ul>
          </div>
        </div>

        <div className="td-ai__next">
          <h4>Next Action</h4>
          <p>{review.nextAction}</p>
        </div>
      </div>
    </CollapsibleSection>
  )
}
