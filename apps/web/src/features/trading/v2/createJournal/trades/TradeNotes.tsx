import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"

export function TradeNotes({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-notes`} title="Trade Notes">
      <MarkdownEditor
        fieldId={`${tradeId}-general-notes`}
        fieldName="General Notes"
        fieldDescription="Rewrite free-form trade notes into polished journal prose. Preserve all details; invent nothing."
        value={value}
        onChange={onChange}
        placeholder="Free-writing space for anything else about this trade…"
        minHeight={200}
      />
    </ReviewSectionCard>
  )
}
