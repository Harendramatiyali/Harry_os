import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"

export function TradeLessons({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-lessons`} title="Lessons Learned" aiAssist>
      <MarkdownEditor
        fieldId={`${tradeId}-todays-learning`}
        fieldName="Today's Learning"
        fieldDescription="Turn the trader's lesson into polished journal prose without changing the meaning."
        value={value}
        onChange={onChange}
        placeholder="What will you reinforce or change next time?"
        minHeight={140}
      />
    </ReviewSectionCard>
  )
}
