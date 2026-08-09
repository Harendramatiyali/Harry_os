import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"
import { SETUP_EXAMPLES } from "@/features/trading/v2/createJournal/trades/tradeTypes"

export function TradeSetup({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-setup`} title="Setup Type" aiAssist>
      <div className="trw-setup-chips">
        {SETUP_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="trw-chip"
            onClick={() => {
              const line = `- ${ex}`
              if (value.includes(ex)) return
              onChange(value.trim() ? `${value.trim()}\n${line}` : line)
            }}
          >
            {ex}
          </button>
        ))}
      </div>
      <MarkdownEditor
        fieldId={`${tradeId}-setup-type`}
        fieldName="Setup Type"
        fieldDescription="Rewrite setup type and confirmation factors into polished journal prose without inventing confirmations."
        value={value}
        onChange={onChange}
        placeholder={"- Breakout\n- Volume Confirmation\n- …"}
        minHeight={140}
      />
    </ReviewSectionCard>
  )
}
