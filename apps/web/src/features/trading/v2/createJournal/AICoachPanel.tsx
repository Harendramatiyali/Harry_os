import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  Star,
  Upload,
  Copy,
  FileText,
  Image as ImageIcon,
} from "lucide-react"

const METRICS = [
  { label: "Discipline", value: 92 },
  { label: "Strategy", value: 88 },
  { label: "Risk Management", value: 85 },
  { label: "Execution", value: 90 },
  { label: "Patience", value: 94 },
]

export function AICoachPanel({
  open,
  onClose,
}: {
  open?: boolean
  onClose?: () => void
}) {
  const score = 9.1
  const pct = (score / 10) * 100
  const r = 46
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <aside className="cj-right" data-open={open ? "true" : undefined} aria-label="Harry AI Coach">
      {open && onClose ? (
        <button type="button" className="cj-btn cj-btn-ghost" onClick={onClose}>
          Close
        </button>
      ) : null}

      <section className="cj-card">
        <div className="cj-card-head">
          <h3 className="cj-card-title">
            <Sparkles size={15} />
            Harry AI Coach
          </h3>
          <span className="tv2-badge tv2-badge-beta">BETA</span>
        </div>

        <div className="cj-score-ring" aria-label={`Daily score ${score} out of 10`}>
          <svg width="108" height="108" viewBox="0 0 108 108">
            <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="54"
              cy="54"
              r={r}
              fill="none"
              stroke="var(--tv2-accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="cj-score-label">
            <strong>{score.toFixed(2)}</strong>
            <span>/10.00 Daily Score</span>
          </div>
        </div>

        {METRICS.map((m) => (
          <div key={m.label} className="cj-metric">
            <span>{m.label}</span>
            <span>{m.value.toFixed(2)}%</span>
            <div className="cj-metric-bar">
              <div className="cj-metric-fill" style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="cj-card">
        <h3 className="cj-card-title" style={{ marginBottom: 8 }}>
          Key Insights
        </h3>
        <div className="cj-insight">
          <Info size={14} color="var(--tv2-accent)" />
          <div>
            <strong>Market Condition</strong>
            <p>Trend day — favour continuation over mean reversion.</p>
          </div>
        </div>
        <div className="cj-insight">
          <CheckCircle2 size={14} color="var(--tv2-accent)" />
          <div>
            <strong>Your Strength</strong>
            <p>Waiting for confirmation before entry.</p>
          </div>
        </div>
        <div className="cj-insight">
          <AlertTriangle size={14} color="var(--tv2-amber)" />
          <div>
            <strong>Area to Improve</strong>
            <p>Holding winners longer on strong trend days.</p>
          </div>
        </div>
        <div className="cj-insight">
          <Star size={14} color="#60a5fa" />
          <div>
            <strong>Top Pattern</strong>
            <p>Day low breakdown → retracement → price action.</p>
          </div>
        </div>
      </section>

      <section className="cj-card">
        <h3 className="cj-card-title" style={{ marginBottom: 10 }}>
          Quick Actions
        </h3>
        <button type="button" className="cj-qa">
          <Upload size={15} /> Import Trades
        </button>
        <button type="button" className="cj-qa">
          <ImageIcon size={15} /> Import Screenshots
        </button>
        <button type="button" className="cj-qa">
          <FileText size={15} /> Generate Daily Report
        </button>
        <button type="button" className="cj-qa">
          <Copy size={15} /> Duplicate Previous Journal
        </button>
      </section>

      <section className="cj-card">
        <h3 className="cj-card-title" style={{ marginBottom: 10 }}>
          Journal Tips
        </h3>
        <p className="cj-tip">
          “Protect the process, not the P&amp;L. A perfect journal day is one where every decision
          followed your rules — even if the market disagreed.”
          <cite>— Harry OS</cite>
        </p>
      </section>
    </aside>
  )
}
