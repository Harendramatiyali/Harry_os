import { Check } from "lucide-react"

import type { PerformanceMetric } from "@/features/trading/v2/types"

export function PerformanceCard({
  title = "AI Performance Review",
  score,
  checklist,
  metrics,
  beta = true,
}: {
  title?: string
  score: number
  checklist: string[]
  metrics: PerformanceMetric[]
  beta?: boolean
}) {
  const r = 26
  const c = 2 * Math.PI * r
  const rounded = Math.round(score)
  return (
    <section className="tv2-card space-y-3 p-4" aria-label={title}>
      <div className="flex items-center gap-2">
        <h3 className="tv2-h3">{title}</h3>
        {beta ? <span className="tv2-badge tv2-badge-beta">BETA</span> : null}
      </div>
      <div className="flex items-center gap-4">
        <div
          className="relative flex size-16 items-center justify-center"
          role="img"
          aria-label={`Performance score ${rounded} percent`}
        >
          <svg viewBox="0 0 64 64" className="absolute inset-0" aria-hidden>
            <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="var(--tv2-accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - score / 100)}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <span className="text-sm font-bold" aria-hidden>
            {rounded}%
          </span>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 tv2-positive" aria-hidden />
              <span className="tv2-caption text-[12px] text-[color:var(--tv2-fg)]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2 pt-1">
        {metrics.map((row) => {
          const labelId = `tv2-metric-${row.label.replace(/\s+/g, "-").toLowerCase()}`
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex justify-between">
                <span className="tv2-caption" id={labelId}>
                  {row.label}
                </span>
                <span className="tv2-caption">{row.value}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-valuenow={row.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-labelledby={labelId}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${row.value}%`, background: "var(--tv2-accent)" }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
