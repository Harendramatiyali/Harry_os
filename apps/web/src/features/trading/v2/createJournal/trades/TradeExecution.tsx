import { num2 } from "@/features/trading/v2/mapJournalToV2"
import type { DraftTradeReview } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import {
  holdingDuration,
  riskReward,
  toDec2,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="tr-field">
      <span className="tr-field-label">{label}</span>
      {children}
    </label>
  )
}

function DecInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="cj-input"
      type="number"
      step="0.01"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (value.trim() === "") return
        onChange(toDec2(value))
      }}
    />
  )
}

export function TradeExecution({
  trade,
  onChange,
}: {
  trade: DraftTradeReview
  onChange: (patch: Partial<DraftTradeReview>) => void
}) {
  const rr = riskReward(trade)
  const autoHold = holdingDuration(trade.entryTime, trade.exitTime)

  return (
    <div className="tr-mini-card">
      <h4 className="tr-mini-title">Execution</h4>
      <div className="tr-mini-grid">
        <Field label="Entry">
          <DecInput value={trade.entry} onChange={(entry) => onChange({ entry })} />
        </Field>
        <Field label="Exit">
          <DecInput value={trade.exit} onChange={(exit) => onChange({ exit })} />
        </Field>
        <Field label="Stoploss">
          <DecInput value={trade.stop} onChange={(stop) => onChange({ stop })} />
        </Field>
        <Field label="Target">
          <DecInput value={trade.target} onChange={(target) => onChange({ target })} />
        </Field>
        <Field
          label={
            !trade.direction || trade.direction.toLowerCase() === "long"
              ? "Highest after exit"
              : "Lowest after exit"
          }
        >
          <DecInput
            value={trade.highestAfterExit}
            onChange={(highestAfterExit) => onChange({ highestAfterExit })}
            placeholder="Best price after exit"
          />
        </Field>
        <Field label="Quantity">
          <DecInput value={trade.quantity} onChange={(quantity) => onChange({ quantity })} />
        </Field>
        <Field label="Risk Reward">
          <input className="cj-input" readOnly value={rr != null ? num2(rr) : "—"} />
        </Field>
        <Field label="Entry Time">
          <input
            className="cj-input"
            type="time"
            value={trade.entryTime}
            onChange={(e) => onChange({ entryTime: e.target.value })}
          />
        </Field>
        <Field label="Exit Time">
          <input
            className="cj-input"
            type="time"
            value={trade.exitTime}
            onChange={(e) => onChange({ exitTime: e.target.value })}
          />
        </Field>
        <Field label="Holding Time">
          <input
            className="cj-input"
            readOnly
            value={autoHold ?? trade.holdingTime}
            placeholder="Auto from entry / exit"
            title="Calculated from entry and exit time"
          />
        </Field>
      </div>
    </div>
  )
}
