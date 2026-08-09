import { Star } from "lucide-react"

import { formatMoney2, num2 } from "@/features/trading/v2/mapJournalToV2"
import {
  estimateTradePnl,
  numOrNull,
  pointsCaptured,
  roiPct,
  toDec2,
  type DraftTradeReview,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="tr-perf-stat">
      <span className="tr-field-label">{label}</span>
      <strong className={tone === "pos" ? "tv2-positive" : tone === "neg" ? "tv2-negative" : undefined}>
        {value}
      </strong>
    </div>
  )
}

export function TradePerformance({
  trade,
  onChange,
}: {
  trade: DraftTradeReview
  onChange: (patch: Partial<DraftTradeReview>) => void
}) {
  const pnl = numOrNull(trade.pnl) ?? estimateTradePnl(trade)
  const pts = pointsCaptured(trade)
  const roi = roiPct(trade)
  const score = trade.starRating ? `${num2(trade.starRating)}/5.00` : "—"

  return (
    <div className="tr-mini-card">
      <h4 className="tr-mini-title">Performance</h4>
      <div className="tr-perf-grid">
        <label className="tr-field">
          <span className="tr-field-label">PnL</span>
          <input
            className="cj-input"
            type="number"
            step="0.01"
            value={trade.pnl}
            placeholder={
              pnl != null ? `Auto ${formatMoney2(pnl)} (pts × qty)` : "Points × quantity"
            }
            title="Auto: points captured × quantity (editable override)"
            onChange={(e) => onChange({ pnl: e.target.value })}
            onBlur={() => {
              if (trade.pnl.trim() === "") {
                const auto = estimateTradePnl(trade)
                if (auto != null) onChange({ pnl: toDec2(auto) })
                return
              }
              onChange({ pnl: toDec2(trade.pnl) })
            }}
          />
        </label>
        <Stat
          label="Points Captured"
          value={pts != null ? num2(pts) : "—"}
          tone={pts != null ? (pts >= 0 ? "pos" : "neg") : undefined}
        />
        <Stat
          label="ROI"
          value={roi != null ? `${num2(roi)}%` : "—"}
          tone={roi != null ? (roi >= 0 ? "pos" : "neg") : undefined}
        />
        <div className="tr-field">
          <span className="tr-field-label">Execution Score</span>
          <div className="tr-star-picker">
            {Array.from({ length: 5 }, (_, i) => {
              const n = i + 1
              return (
                <button
                  key={n}
                  type="button"
                  className={n <= trade.starRating ? "on" : ""}
                  aria-label={`${n} stars`}
                  onClick={() => onChange({ starRating: trade.starRating === n ? 0 : n })}
                >
                  <Star size={16} fill={n <= trade.starRating ? "currentColor" : "none"} />
                </button>
              )
            })}
            <span className="tv2-caption">{score}</span>
          </div>
        </div>
        <label className="tr-field">
          <span className="tr-field-label">Result</span>
          <select
            className="cj-select"
            value={trade.result || ""}
            onChange={(e) => onChange({ result: e.target.value || null })}
          >
            <option value="">Auto</option>
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="BE">Flat / BE</option>
          </select>
        </label>
        <label className="tr-field">
          <span className="tr-field-label">Setup</span>
          <input
            className="cj-input"
            value={trade.setup || ""}
            placeholder="Breakout"
            onChange={(e) => onChange({ setup: e.target.value || null })}
          />
        </label>
        <label className="tr-field">
          <span className="tr-field-label">Grade</span>
          <select
            className="cj-select"
            value={trade.grade || ""}
            onChange={(e) => onChange({ grade: e.target.value || null })}
          >
            <option value="">—</option>
            {["A+", "A", "B+", "B", "C", "D", "F"].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
