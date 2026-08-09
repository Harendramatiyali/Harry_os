import type { MistakeItem } from "@/features/trading/v2/createJournal/draftState"
import { TradeLessons } from "@/features/trading/v2/createJournal/trades/TradeLessons"
import { TradeMistakes } from "@/features/trading/v2/createJournal/trades/TradeMistakes"
import { TradeNotes } from "@/features/trading/v2/createJournal/trades/TradeNotes"
import { TradePsychology } from "@/features/trading/v2/createJournal/trades/TradePsychology"
import { TradeSetup } from "@/features/trading/v2/createJournal/trades/TradeSetup"
import { TradeStory } from "@/features/trading/v2/createJournal/trades/TradeStory"
import { TradeSuccess } from "@/features/trading/v2/createJournal/trades/TradeSuccess"
import { TradeThesis } from "@/features/trading/v2/createJournal/trades/TradeThesis"
import type {
  DraftTradeReview,
  TradePsychology as Psych,
  TradeReviewSections,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

export function TradeReviewWorkspace({
  trade,
  onChange,
}: {
  trade: DraftTradeReview
  onChange: (patch: Partial<DraftTradeReview>) => void
}) {
  const setReview = (key: keyof TradeReviewSections, value: string) => {
    onChange({ review: { ...trade.review, [key]: value } })
  }

  return (
    <div className="trw-root">
      <h3 className="trw-heading">Trade Review Workspace</h3>
      <div className="trw-grid">
        <TradeThesis
          tradeId={trade.id}
          value={trade.review.thesis}
          onChange={(v) => setReview("thesis", v)}
        />
        <TradeSetup
          tradeId={trade.id}
          value={trade.review.setupType}
          onChange={(v) => setReview("setupType", v)}
        />
        <TradeStory
          tradeId={trade.id}
          value={trade.review.whatHappened}
          onChange={(v) => setReview("whatHappened", v)}
        />
        <TradeSuccess
          tradeId={trade.id}
          value={trade.review.whatWentWell}
          onChange={(v) => setReview("whatWentWell", v)}
        />
        <TradePsychology
          tradeId={trade.id}
          value={trade.psychology}
          onChange={(psychology: Psych) => onChange({ psychology })}
        />
        <TradeMistakes
          tradeId={trade.id}
          mistakes={trade.mistakes}
          onChange={(mistakes: MistakeItem[]) => onChange({ mistakes })}
        />
        <div className="trw-span-2">
          <TradeLessons
            tradeId={trade.id}
            value={trade.review.lessons}
            onChange={(v) => setReview("lessons", v)}
          />
        </div>
        <div className="trw-span-2">
          <TradeNotes
            tradeId={trade.id}
            value={trade.review.notes}
            onChange={(v) => setReview("notes", v)}
          />
        </div>
      </div>
    </div>
  )
}
