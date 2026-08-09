import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"

export function TradeStory({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-happened`} title="What Happened" aiAssist>
      <MarkdownEditor
        fieldId={`${tradeId}-what-happened`}
        fieldName="What Happened"
        fieldDescription="Rewrite how the trade unfolded — entry, management, exit — into polished journal prose. Preserve every fact."
        value={value}
        onChange={onChange}
        placeholder="Describe exactly how the trade unfolded — entry trigger, management, exit…"
        minHeight={160}
      />
    </ReviewSectionCard>
  )
}
