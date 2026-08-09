import { useState } from "react"
import { Calendar, ChevronDown } from "lucide-react"
import type { TradeDetailModel } from "@/features/trading/v2/tradeDetail/types"
import { TradeSummary } from "@/features/trading/v2/tradeDetail/TradeSummary"
import { TradeSetup } from "@/features/trading/v2/tradeDetail/TradeSetup"
import { TradeThesis } from "@/features/trading/v2/tradeDetail/TradeThesis"
import { TradeTimeline } from "@/features/trading/v2/tradeDetail/TradeTimeline"
import { TradeWentWell } from "@/features/trading/v2/tradeDetail/TradeWentWell"
import { TradeMistakes } from "@/features/trading/v2/tradeDetail/TradeMistakes"
import { TradeLessons } from "@/features/trading/v2/tradeDetail/TradeLessons"
import { TradePsychology } from "@/features/trading/v2/tradeDetail/TradePsychology"
import { TradeScreenshots } from "@/features/trading/v2/tradeDetail/TradeScreenshots"
import { TradeAIReview } from "@/features/trading/v2/tradeDetail/TradeAIReview"
import { FormattedJournalBody } from "@/features/trading/v2/components/ArticleRenderer"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"
import { cn } from "@/shared/lib/utils"
import "@/features/trading/v2/tradeDetail/tradeDetail.css"

export function TradeDetailCard({
  trade,
  defaultOpen = false,
}: {
  trade: TradeDetailModel
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const statusLabel =
    trade.status === "win" ? "Win" : trade.status === "loss" ? "Loss" : "Flat"

  return (
    <article className={cn("td-card", open && "is-open")}>
      <button
        type="button"
        className="td-collapse"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="td-collapse__main">
          <div className="td-collapse__title-row">
            <h2 className="td-header__instrument">
              Trade #{trade.tradeIndex}
              {trade.grade ? <span className="td-pill td-pill--amber">Grade {trade.grade}</span> : null}
            </h2>
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
          </div>
          <p className="td-header__sub">
            {trade.instrument}
            {trade.direction ? ` · ${trade.direction}` : ""}
            {trade.strike ? ` · Strike ${trade.strike}` : ""}
            <span className="td-header__date">
              <Calendar size={13} strokeWidth={1.75} />
              {trade.tradeDate}
            </span>
            <span
              className={cn(
                "td-collapse__pnl",
                trade.pnl > 0 && "is-pos",
                trade.pnl < 0 && "is-neg",
              )}
            >
              {trade.pnlLabel}
            </span>
          </p>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={cn("td-collapse__chev", open && "is-open")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="td-card__body">
          <TradeSummary metrics={trade.metrics} />
          <TradeSetup chips={trade.setupChips} />

          <div className="td-grid">
            <TradeThesis thesis={trade.thesis} />
            {trade.timeline.length ? (
              <TradeTimeline events={trade.timeline} />
            ) : trade.whatHappenedProse.trim() ? (
              <CollapsibleSection
                title="What Happened"
                defaultOpen
                className="td-section td-section--collapse"
              >
                <div className="td-prose-card">
                  <FormattedJournalBody text={trade.whatHappenedProse} />
                </div>
              </CollapsibleSection>
            ) : null}
          </div>

          <TradeWentWell points={trade.whatWentWell} />
          <TradeMistakes mistakes={trade.mistakes} />
          <TradeLessons lesson={trade.lesson} />

          {trade.psychology ? <TradePsychology psychology={trade.psychology} /> : null}

          <TradeScreenshots shots={trade.screenshots} />
          <TradeAIReview review={trade.aiReview} />

          {trade.notes.trim() ? (
            <CollapsibleSection
              title="Notes"
              defaultOpen={false}
              className="td-section td-section--collapse"
            >
              <div className="td-prose-card">
                <FormattedJournalBody text={trade.notes} />
              </div>
            </CollapsibleSection>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
