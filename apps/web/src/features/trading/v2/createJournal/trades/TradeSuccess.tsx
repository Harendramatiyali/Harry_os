import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"

export function TradeSuccess({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-went-well`} title="What Went Well" aiAssist>
      <MarkdownEditor
        fieldId={`${tradeId}-what-went-well`}
        fieldName="What Went Well"
        fieldDescription="Rewrite what went well into polished journal prose. Only include what the trader actually wrote."
        value={value}
        onChange={onChange}
        placeholder="Mention everything you executed correctly…"
        minHeight={160}
      />
    </ReviewSectionCard>
  )
}
