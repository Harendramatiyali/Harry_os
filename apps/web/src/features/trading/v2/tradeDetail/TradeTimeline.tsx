import { Flag } from "lucide-react"
import type { TradeDetailTimelineEvent } from "@/features/trading/v2/tradeDetail/types"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradeTimeline({ events }: { events: TradeDetailTimelineEvent[] }) {
  if (!events.length) return null
  return (
    <CollapsibleSection
      title={
        <>
          <Flag size={14} strokeWidth={1.75} />
          What Happened
        </>
      }
      subtitle={`${events.length} event${events.length === 1 ? "" : "s"}`}
      defaultOpen
      className="td-section td-section--collapse"
    >
      <ol className="td-timeline">
        {events.map((ev, i) => (
          <li key={ev.id} className="td-timeline__item">
            <div className="td-timeline__rail" aria-hidden>
              <span className="td-timeline__dot" />
              {i < events.length - 1 ? <span className="td-timeline__line" /> : null}
            </div>
            <div className="td-timeline__body">
              {ev.time ? <time className="td-timeline__time">{ev.time}</time> : null}
              <p className="td-timeline__title">{ev.title}</p>
              {ev.detail ? <p className="td-timeline__detail">{ev.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </CollapsibleSection>
  )
}
