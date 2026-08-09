import { memo } from "react"
import type { ReactNode } from "react"
import { Bot, Sparkles } from "lucide-react"

import type { StatCardModel } from "@/features/trading/v2/types"
import { cn } from "@/shared/lib/utils"

function Sparkline({ tone = "up" }: { tone?: "up" | "down" | "purple" }) {
  const stroke =
    tone === "purple" ? "var(--tv2-purple)" : tone === "down" ? "var(--tv2-negative)" : "var(--tv2-accent)"
  const fill =
    tone === "purple"
      ? "rgba(168,85,247,0.15)"
      : tone === "down"
        ? "rgba(244,63,94,0.15)"
        : "rgba(34,197,94,0.15)"
  return (
    <svg className="tv2-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden>
      <path
        d="M0 28 L12 24 L24 26 L36 18 L48 20 L60 12 L72 14 L84 8 L96 10 L108 6 L120 4 V36 H0 Z"
        fill={fill}
      />
      <path
        d="M0 28 L12 24 L24 26 L36 18 L48 20 L60 12 L72 14 L84 8 L96 10 L108 6 L120 4"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        vectorEffect="nonScalingStroke"
      />
    </svg>
  )
}

function WinRateRing({ pct }: { pct: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg className="tv2-ring" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--tv2-accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
    </svg>
  )
}

export const StatCard = memo(function StatCard({
  model,
  onInsightCta,
  footer,
}: {
  model: StatCardModel
  onInsightCta?: () => void
  footer?: ReactNode
}) {
  if (model.variant === "winRate") {
    return (
      <article className="tv2-card flex items-center gap-4 p-4" aria-label={`${model.title} ${model.value}`}>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="tv2-caption">{model.title}</p>
          <p className="tv2-value">{model.value}</p>
          <div className="flex flex-wrap gap-3">
            <span className="tv2-caption tv2-positive">Wins {model.wins ?? 0}</span>
            <span className="tv2-caption tv2-negative">Losses {model.losses ?? 0}</span>
            {(model.flats ?? 0) > 0 ? (
              <span className="tv2-caption">Flat {model.flats}</span>
            ) : null}
          </div>
        </div>
        <WinRateRing pct={model.winRatePct ?? 0} />
      </article>
    )
  }

  if (model.variant === "aiInsight") {
    return (
      <article className="tv2-card relative overflow-hidden p-4" aria-label={model.title}>
        <div className="relative z-[1] space-y-3 pr-8">
          <div className="flex items-center gap-2">
            <p className="tv2-caption">{model.title}</p>
            {model.badge ? <span className="tv2-badge tv2-badge-beta">{model.badge}</span> : null}
          </div>

          {model.insightRows?.length ? (
            <dl className="space-y-2">
              {model.insightRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[4.5rem_1fr] items-start gap-2">
                  <dt className="tv2-caption pt-0.5">{row.label}</dt>
                  <dd className="text-[13px] font-medium leading-snug text-[color:var(--tv2-fg)]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] leading-relaxed text-[color:var(--tv2-fg)]">{model.insightBody}</p>
          )}

          <button type="button" className="tv2-btn tv2-btn-sm" onClick={onInsightCta}>
            <Sparkles className="size-3.5" aria-hidden />
            {model.insightCta ?? "Ask AI Assistant"}
          </button>
        </div>
        <Bot
          className="pointer-events-none absolute right-3 bottom-3 size-9 opacity-25"
          style={{ color: "var(--tv2-purple)" }}
          aria-hidden
        />
      </article>
    )
  }

  return (
    <article className="tv2-card space-y-3 p-4" aria-label={`${model.title} ${model.value}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="tv2-caption">{model.title}</p>
        {model.badge ? (
          <span
            className={cn(
              "tv2-badge",
              model.badgeTone === "ai" && "tv2-badge-ai",
              model.badgeTone === "beta" && "tv2-badge-beta",
            )}
          >
            {model.badge}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "tv2-value",
          model.valueTone === "positive" && "tv2-positive",
          model.valueTone === "negative" && "tv2-negative",
        )}
        style={model.valueTone === "purple" ? { color: "var(--tv2-purple)" } : undefined}
      >
        {model.value}
      </p>
      {model.trend && model.trend !== "none" ? (
        <Sparkline tone={model.trend === "down" ? "down" : model.trend === "purple" ? "purple" : "up"} />
      ) : null}
      {(model.subtitleLeft || model.subtitleRight || footer) && (
        <div className="flex justify-between gap-2">
          {footer ?? (
            <>
              <span className="tv2-caption">{model.subtitleLeft}</span>
              <span className="tv2-caption">{model.subtitleRight}</span>
            </>
          )}
        </div>
      )}
    </article>
  )
})
