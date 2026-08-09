import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"

export function TradeThesis({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-thesis`} title="Trade Thesis" aiAssist>
      <MarkdownEditor
        fieldId={`${tradeId}-trade-thesis`}
        fieldName="Trade Thesis"
        fieldDescription="Explain why the trade was taken — structure, levels, and catalysts — as polished journal prose. Invent nothing."
        value={value}
        onChange={onChange}
        placeholder="Why did you take this trade? Structure, levels, catalysts…"
        minHeight={160}
      />
    </ReviewSectionCard>
  )
}
