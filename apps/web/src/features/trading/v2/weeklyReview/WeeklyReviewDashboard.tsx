import { useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Ban,
  BookMarked,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  GitCompare,
  Lightbulb,
  Pin,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { tradingApi } from "@/features/trading/api"
import { useAuthStore } from "@/features/auth/store"
import { useJournalAnalytics, useJournalDays } from "@/features/trading/hooks"
import { resolveDayPnl } from "@/features/trading/v2/mapJournalToV2"
import { mapWeeklyReview } from "@/features/trading/v2/weeklyReview/mapWeeklyReview"
import {
  shiftTradingWeek,
  tradingWeekBounds,
} from "@/features/trading/v2/weeklyReview/weekRange"
import type {
  WeeklyChecklistItem,
  WeeklyInsightItem,
  WeeklyKpi,
  WeeklyLessonItem,
  WeeklyMistakeItem,
  WeeklyPriorityItem,
  WeeklyReviewModel,
} from "@/features/trading/v2/weeklyReview/types"
import { cn } from "@/shared/lib/utils"
import { toIsoDate } from "@/features/trading/v2/dateRange"
import "@/features/trading/v2/weeklyReview/weeklyReview.css"

function Sparkline({ values, tone }: { values: number[]; tone: WeeklyKpi["tone"] }) {
  const stroke =
    tone === "positive"
      ? "#22c55e"
      : tone === "negative"
        ? "#f43f5e"
        : tone === "purple"
          ? "#a855f7"
          : tone === "blue"
            ? "#3b82f6"
            : tone === "amber"
              ? "#f59e0b"
              : "#8b929e"
  const w = 72
  const h = 28
  const pts = values.length
    ? values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w
        const y = h - v * (h - 4) - 2
        return `${x},${y}`
      })
    : [`0,${h}`, `${w},4`]
  return (
    <svg className="wr-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts.join(" ")}
      />
    </svg>
  )
}

function GradeRing({ grade, stars }: { grade: string; stars: number }) {
  return (
    <div className="wr-kpi wr-kpi--grade" data-tone="amber">
      <p className="wr-kpi__label">Overall Grade</p>
      <svg className="wr-grade-ring" viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r="28"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, stars / 5) * 176} 176`}
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="41" textAnchor="middle" className="wr-grade-letter" fill="#f59e0b" fontSize="18" fontWeight="750">
          {grade}
        </text>
      </svg>
      <div className="wr-stars" aria-label={`${stars} stars`}>
        {"★".repeat(stars)}
        {"☆".repeat(Math.max(0, 5 - stars))}
      </div>
    </div>
  )
}

function KpiCard({ kpi }: { kpi: WeeklyKpi }) {
  const Icon =
    kpi.id === "pnl"
      ? Wallet
      : kpi.id === "wr"
        ? Target
        : kpi.id === "trades"
          ? TrendingUp
          : kpi.id === "rr"
            ? GitCompare
            : Star
  return (
    <motion.article
      className="wr-kpi"
      data-tone={kpi.tone}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="wr-kpi__top">
        <span className="wr-kpi__icon">
          <Icon size={14} strokeWidth={1.75} />
        </span>
      </div>
      <p className="wr-kpi__label">{kpi.label}</p>
      <p className="wr-kpi__value">{kpi.value}</p>
      <p className="wr-kpi__cmp">{kpi.comparison}</p>
      <Sparkline values={kpi.spark} tone={kpi.tone} />
    </motion.article>
  )
}

function InsightList({ items }: { items: WeeklyInsightItem[] }) {
  if (!items.length) return <p className="wr-item__desc">No strengths logged this week yet.</p>
  return (
    <>
      {items.map((it) => (
        <div key={it.id} className="wr-item">
          <span className="wr-item__icon wr-item__icon--green">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <p className="wr-item__title">{it.title}</p>
            <p className="wr-item__desc">{it.description}</p>
            <div className="wr-item__meta">
              <span className="wr-badge wr-badge--green">{it.impact} impact</span>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function MistakeList({ items }: { items: WeeklyMistakeItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null)
  if (!items.length) return <p className="wr-item__desc">No mistakes tagged this week — nice.</p>
  return (
    <>
      {items.map((m) => {
        const open = openId === m.id
        return (
          <div key={m.id} className="wr-item">
            <span className="wr-item__icon wr-item__icon--red">
              <AlertTriangle size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                className="wr-item__title"
                style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", padding: 0 }}
                onClick={() => setOpenId(open ? null : m.id)}
              >
                {m.title}
              </button>
              <p className="wr-item__desc">{m.description}</p>
              <div className="wr-item__meta">
                <span className="wr-money">{m.moneyLostLabel}</span>
                <span className={cn("wr-badge", m.severity === "high" ? "wr-badge--red" : "wr-badge--amber")}>
                  {m.severity}
                </span>
                <span className="wr-badge wr-badge--amber">{m.count}×</span>
              </div>
              {open && m.relatedTradeLabels.length ? (
                <p className="wr-item__desc" style={{ marginTop: 8 }}>
                  Related: {m.relatedTradeLabels.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </>
  )
}

function LessonList({ items }: { items: WeeklyLessonItem[] }) {
  const [fav, setFav] = useState<Record<string, boolean>>({})
  const [pin, setPin] = useState<Record<string, boolean>>({})
  if (!items.length) return <p className="wr-item__desc">Add lessons in daily journals to unlock this.</p>
  return (
    <>
      {items.map((l) => (
        <div key={l.id} className="wr-item">
          <span className="wr-item__icon wr-item__icon--purple">
            <Lightbulb size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <p className="wr-item__title">{l.title}</p>
            <p className="wr-item__desc">{l.body}</p>
            <div className="wr-item__meta">
              <span className="wr-badge wr-badge--purple">{l.source}</span>
            </div>
            <div className="wr-lesson-actions">
              <button
                type="button"
                className="wr-icon-btn"
                data-on={pin[l.id] || undefined}
                title="Pin"
                onClick={() => setPin((p) => ({ ...p, [l.id]: !p[l.id] }))}
              >
                <Pin size={12} />
              </button>
              <button
                type="button"
                className="wr-icon-btn"
                data-on={fav[l.id] || undefined}
                title="Favorite"
                onClick={() => setFav((p) => ({ ...p, [l.id]: !p[l.id] }))}
              >
                <Star size={12} />
              </button>
              <button type="button" className="wr-icon-btn" title="Convert to rule (soon)" disabled>
                <BookMarked size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function Checklist({
  items,
  tone,
}: {
  items: WeeklyChecklistItem[]
  tone: "green" | "red"
}) {
  return (
    <>
      {items.map((it) => (
        <div key={it.id} className="wr-check">
          <div className="wr-check__left">
            {tone === "green" ? (
              <CheckCircle2 size={16} color="#22c55e" />
            ) : (
              <Ban size={16} color="#f43f5e" />
            )}
            <span>{it.label}</span>
          </div>
          <span className={cn("wr-badge", tone === "green" ? "wr-badge--green" : "wr-badge--red")}>
            {tone === "green" ? "Keep It Up" : "Stop It"}
          </span>
        </div>
      ))}
    </>
  )
}

function Priorities({ items }: { items: WeeklyPriorityItem[] }) {
  if (!items.length) return <p className="wr-item__desc">Focus areas appear after a few journaled sessions.</p>
  return (
    <>
      {items.map((p) => (
        <div key={p.id} className="wr-priority">
          <span className="wr-priority__num">{String(p.number).padStart(2, "0")}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <p className="wr-item__title">{p.title}</p>
              <span className={cn("wr-badge", p.priority === "high" ? "wr-badge--blue" : "wr-badge--amber")}>
                {p.priority}
              </span>
            </div>
            <p className="wr-item__desc">{p.description}</p>
          </div>
        </div>
      ))}
    </>
  )
}

function AnalyticsBlock({ model }: { model: WeeklyReviewModel }) {
  return (
    <div className="wr-card">
      <div className="wr-card__head">
        <TrendingUp size={16} color="#93c5fd" />
        <h3>Weekly Performance Analytics</h3>
      </div>
      <div className="wr-analytics">
        <div className="wr-chart-box">
          <p className="wr-chart-title">Daily P&L</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={model.dailyPnl}>
              <XAxis dataKey="dayLabel" tick={{ fill: "#8b929e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#161a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
                formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "P&L"]}
              />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                {model.dailyPnl.map((d) => (
                  <Cell key={d.date} fill={d.pnl >= 0 ? "#22c55e" : "#f43f5e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="wr-chart-box">
          <p className="wr-chart-title">Trade Outcome</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={model.outcomes} dataKey="value" nameKey="name" innerRadius={36} outerRadius={56} paddingAngle={3}>
                {model.outcomes.map((o) => (
                  <Cell key={o.name} fill={o.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#161a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {model.outcomes.map((o) => (
              <span key={o.name} className="wr-badge wr-badge--amber" style={{ borderLeft: `3px solid ${o.color}` }}>
                {o.name} {o.value}
              </span>
            ))}
          </div>
        </div>

        <div className="wr-chart-box">
          <p className="wr-chart-title">Setup Performance</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={model.setups} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="setup"
                width={72}
                tick={{ fill: "#8b929e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: "#161a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
                formatter={(v, _n, item) => {
                  const wr = (item?.payload as { winRate: number | null })?.winRate
                  return [`${v} trades${wr != null ? ` · ${wr}% WR` : ""}`, "Count"]
                }}
              />
              <Bar dataKey="count" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="wr-chart-box">
          <p className="wr-chart-title">Time Analysis</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={model.timeBuckets}>
              <XAxis dataKey="label" tick={{ fill: "#8b929e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#161a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
              />
              <Area type="monotone" dataKey="pnl" stroke="#3b82f6" fill="rgba(59,130,246,0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function CoachCard({ model }: { model: WeeklyReviewModel["coach"] }) {
  return (
    <section className="wr-coach">
      <Sparkles className="wr-coach__quote" size={64} />
      <div className="wr-coach__head">
        <div className="wr-coach__avatar">H</div>
        <div>
          <p className="wr-coach__name">Harry AI Coach</p>
          <p className="wr-coach__role">Weekly performance mentor</p>
        </div>
      </div>
      <p className="wr-coach__summary">{model.summary}</p>
      <div className="wr-coach__grid">
        <div className="wr-coach__panel">
          <h4>Strengths</h4>
          <ul>
            {model.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="wr-coach__panel">
          <h4>Weaknesses</h4>
          <ul>
            {model.weaknesses.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="wr-coach__panel">
          <h4>Main Advice</h4>
          <p style={{ margin: 0, fontSize: "0.8125rem", lineHeight: 1.45 }}>{model.advice}</p>
        </div>
      </div>
      <div className="wr-coach__challenge">
        <strong>Challenge for next week</strong>
        <p style={{ margin: 0, fontSize: "0.875rem" }}>{model.challenge}</p>
      </div>
    </section>
  )
}

export function WeeklyReviewDashboard() {
  const token = useAuthStore((s) => s.accessToken)
  const [anchor, setAnchor] = useState(() => toIsoDate(new Date()))
  const week = useMemo(() => tradingWeekBounds(anchor), [anchor])
  const prevAnchor = shiftTradingWeek(anchor, -1)
  const prevWeek = useMemo(() => tradingWeekBounds(prevAnchor), [prevAnchor])

  const journalsQuery = useJournalDays(
    { date_from: week.startDate, date_to: week.endDate },
    { enabled: Boolean(token) },
  )
  const prevJournalsQuery = useJournalDays(
    { date_from: prevWeek.startDate, date_to: prevWeek.endDate },
    { enabled: Boolean(token) },
  )
  const analyticsQuery = useJournalAnalytics({
    date_from: week.startDate,
    date_to: week.endDate,
  })

  const summaries = journalsQuery.data ?? []
  const detailQueries = useQueries({
    queries: summaries.map((j) => ({
      queryKey: ["trading", "journals", "detail", j.id, "weekly"],
      queryFn: () => tradingApi.getJournal(j.id, token!),
      enabled: Boolean(token && j.id),
      staleTime: 60_000,
    })),
  })

  const days = useMemo(
    () => detailQueries.map((q) => q.data).filter(Boolean) as NonNullable<(typeof detailQueries)[0]["data"]>[],
    [detailQueries],
  )

  const detailsLoading = summaries.length > 0 && detailQueries.some((q) => q.isLoading && !q.data)

  const previousSnap = useMemo(() => {
    const items = prevJournalsQuery.data ?? []
    if (!items.length) return null
    const netPnl = items.reduce((s, j) => s + resolveDayPnl(j), 0)
    const trades = items.reduce((s, j) => s + (j.trade_count ?? 0), 0)
    return { netPnl, trades, winRate: null as number | null }
  }, [prevJournalsQuery.data])

  const model = useMemo(
    () =>
      mapWeeklyReview({
        weekStart: week.startDate,
        weekEnd: week.endDate,
        weekLabel: week.label,
        days,
        analytics: analyticsQuery.data,
        previous: previousSnap,
      }),
    [week, days, analyticsQuery.data, previousSnap],
  )

  const loading = journalsQuery.isLoading || detailsLoading

  const exportText = () => {
    const lines = [
      `Weekly Review — ${model.weekLabel}`,
      `Net P&L: ${model.kpis[0]?.value}`,
      `Grade: ${model.grade}`,
      "",
      "What worked:",
      ...model.whatWorked.map((w) => `- ${w.title}`),
      "",
      "Mistakes:",
      ...model.mistakes.map((m) => `- ${m.title} (${m.severity})`),
      "",
      "Focus:",
      ...model.focusAreas.map((f) => `${f.number}. ${f.title}`),
      "",
      model.coach.summary,
      model.coach.advice,
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `weekly-review-${model.weekStart}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="wr-root">
      <header className="wr-header">
        <div>
          <h1 className="wr-header__title">
            <Sparkles size={20} color="#a855f7" />
            Weekly Review
          </h1>
          <p className="wr-header__sub">Complete performance analysis of your trading week</p>
        </div>
        <div className="wr-header__actions">
          <div className="wr-week-nav" aria-label="Week selector">
            <button type="button" aria-label="Previous week" onClick={() => setAnchor(shiftTradingWeek(anchor, -1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="wr-week-nav__label">{week.label}</span>
            <button type="button" aria-label="Next week" onClick={() => setAnchor(shiftTradingWeek(anchor, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button type="button" className="wr-btn wr-btn--ghost" onClick={() => setAnchor(prevAnchor)}>
            <GitCompare size={14} />
            Compare Week
          </button>
          <button type="button" className="wr-btn" onClick={exportText}>
            <Download size={14} />
            Export Report
          </button>
        </div>
      </header>

      {loading ? (
        <div className="wr-loading" aria-busy>
          <div className="wr-skel" />
          <div className="wr-skel" style={{ height: 220 }} />
          <div className="wr-skel" style={{ height: 180 }} />
        </div>
      ) : model.empty ? (
        <div className="wr-empty">
          <p>No journals found for {week.label}.</p>
          <p style={{ marginTop: 8, fontSize: "0.8125rem" }}>
            Create daily journals Mon–Fri and this dashboard will build itself from your week.
          </p>
        </div>
      ) : (
        <>
          <div className="wr-kpi-grid">
            {model.kpis.map((k) => (
              <KpiCard key={k.id} kpi={k} />
            ))}
            <GradeRing grade={model.grade} stars={model.gradeStars} />
            <div className="wr-kpi wr-kpi--chart" data-tone="neutral">
              <p className="wr-kpi__label">Daily P&L This Week</p>
              <ResponsiveContainer width="100%" height={70}>
                <BarChart data={model.dailyPnl}>
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {model.dailyPnl.map((d) => (
                      <Cell key={d.date} fill={d.pnl >= 0 ? "#22c55e" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="wr-section-title">Weekly Insights</p>
          <div className="wr-grid-3">
            <section className="wr-card wr-card--green">
              <div className="wr-card__head">
                <CheckCircle2 size={16} color="#22c55e" />
                <h3>What Worked Well</h3>
              </div>
              <InsightList items={model.whatWorked} />
            </section>
            <section className="wr-card wr-card--red">
              <div className="wr-card__head">
                <AlertTriangle size={16} color="#f43f5e" />
                <h3>Biggest Mistakes</h3>
              </div>
              <MistakeList items={model.mistakes} />
            </section>
            <section className="wr-card wr-card--purple">
              <div className="wr-card__head">
                <Lightbulb size={16} color="#a855f7" />
                <h3>Key Lessons Learned</h3>
              </div>
              <LessonList items={model.lessons} />
            </section>
          </div>

          <p className="wr-section-title">Action Dashboard</p>
          <div className="wr-grid-3">
            <section className="wr-card wr-card--green">
              <div className="wr-card__head">
                <CheckCircle2 size={16} color="#22c55e" />
                <h3>Continue Doing</h3>
              </div>
              <Checklist items={model.continueDoing} tone="green" />
            </section>
            <section className="wr-card wr-card--red">
              <div className="wr-card__head">
                <Ban size={16} color="#f43f5e" />
                <h3>Stop Doing</h3>
              </div>
              <Checklist items={model.stopDoing} tone="red" />
            </section>
            <section className="wr-card wr-card--blue">
              <div className="wr-card__head">
                <Target size={16} color="#3b82f6" />
                <h3>Focus Areas For Next Week</h3>
              </div>
              <Priorities items={model.focusAreas} />
            </section>
          </div>

          <p className="wr-section-title">Analytics</p>
          <AnalyticsBlock model={model} />

          <p className="wr-section-title">Harry AI Coach</p>
          <CoachCard model={model.coach} />

          <p className="wr-section-title">Week Snapshot</p>
          <div className="wr-footer">
            <div className="wr-card">
              <div className="wr-footer-stat">
                Best Day
                <strong style={{ color: "#22c55e" }}>
                  {model.footer.bestDayLabel} ({model.footer.bestDayPnl})
                </strong>
              </div>
              <div className="wr-footer-stat" style={{ marginTop: 12 }}>
                Worst Day
                <strong style={{ color: "#f43f5e" }}>
                  {model.footer.worstDayLabel} ({model.footer.worstDayPnl})
                </strong>
              </div>
            </div>
            <div className="wr-card">
              <div className="wr-footer-stat">
                Best Trade
                <strong style={{ color: "#22c55e" }}>
                  {model.footer.bestTradeLabel} ({model.footer.bestTradePnl})
                </strong>
              </div>
              <div className="wr-footer-stat" style={{ marginTop: 12 }}>
                Worst Trade
                <strong style={{ color: "#f43f5e" }}>
                  {model.footer.worstTradeLabel} ({model.footer.worstTradePnl})
                </strong>
              </div>
            </div>
            <div className="wr-card">
              {model.footer.scores.map((s) => (
                <div key={s.id} className="wr-score-row">
                  <span>{s.label}</span>
                  <div className="wr-score-track">
                    <motion.div
                      className="wr-score-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <strong style={{ fontSize: "0.75rem", width: 36, textAlign: "right" }}>{s.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
