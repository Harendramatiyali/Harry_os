import type { MistakeItem } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { MistakesChecklist } from "@/features/trading/v2/createJournal/MistakesChecklist"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"

export function TradeMistakes({
  tradeId,
  mistakes,
  onChange,
}: {
  tradeId: string
  mistakes: MistakeItem[]
  onChange: (next: MistakeItem[]) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-mistakes`} title="Mistakes">
      <MistakesChecklist
        mistakes={mistakes}
        onChange={onChange}
        notesPlaceholder="What went wrong on this trade, and what you’ll change next time…"
      />
    </ReviewSectionCard>
  )
}
