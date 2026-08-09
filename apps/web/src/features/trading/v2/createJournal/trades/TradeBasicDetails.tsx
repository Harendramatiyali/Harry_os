import type { DraftTradeReview } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { instrumentGroupOf } from "@/features/trading/v2/createJournal/trades/tradeTypes"

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

export function TradeBasicDetails({
  trade,
  onChange,
}: {
  trade: DraftTradeReview
  onChange: (patch: Partial<DraftTradeReview>) => void
}) {
  return (
    <div className="tr-mini-card">
      <h4 className="tr-mini-title">Basic Details</h4>
      <div className="tr-mini-grid">
        <Field label="Instrument">
          <input
            className="cj-input"
            value={trade.instrument}
            placeholder="NIFTY 25000 CE"
            onChange={(e) => onChange({ instrument: e.target.value })}
            onBlur={() => {
              const nextGroup = instrumentGroupOf(trade.instrument)
              if (nextGroup === trade.instrumentGroup) return
              onChange({ instrumentGroup: nextGroup })
            }}
          />
        </Field>
        <Field label="Direction">
          <select
            className="cj-select"
            value={trade.direction || "long"}
            onChange={(e) => onChange({ direction: e.target.value })}
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Timeframe">
          <select
            className="cj-select"
            value={trade.timeframe}
            onChange={(e) => onChange({ timeframe: e.target.value })}
          >
            {["1 Min", "3 Min", "5 Min", "15 Min", "30 Min", "1 Hour", "Daily"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trade Date">
          <input
            className="cj-input"
            type="date"
            value={trade.tradeDate}
            onChange={(e) => onChange({ tradeDate: e.target.value })}
          />
        </Field>
        <Field label="Trade Source">
          <select
            className="cj-select"
            value={trade.source}
            onChange={(e) => onChange({ source: e.target.value })}
          >
            {["Manual", "Broker", "Import", "Obsidian"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}
