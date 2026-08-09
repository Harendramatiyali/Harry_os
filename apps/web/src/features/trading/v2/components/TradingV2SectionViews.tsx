/**
 * Trading V2 secondary-nav section panels (Analytics, Calendar, Trades, placeholders).
 */
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BookMarked,
  CalendarDays,
  CandlestickChart,
  FileText,
  LineChart,
  ListChecks,
  NotebookPen,
  Target,
  Trash2,
} from "lucide-react"

import { money, useJournalAnalytics, useJournalDays, useTrades, useTradingAnalytics } from "@/features/trading/hooks"
import type { JournalDaySummary } from "@/features/trading/types"
import { monthCursorFromRange } from "@/features/trading/v2/dateRange"
import { formatJournalDate, formatMoney2, num2 } from "@/features/trading/v2/mapJournalToV2"
import {
  dateRangeToApiParams,
  dateRangeToDateTimeParams,
  useTradingDateRangeStore,
} from "@/features/trading/v2/tradingDateRangeStore"

export function SectionPlaceholder({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string
  body: string
  ctaLabel?: string
  onCta?: () => void
}) {
  return (
    <div className="tv2-card flex min-h-[40rem] flex-col items-start justify-center gap-4 p-6 md:p-8">
      <h2 className="tv2-title text-[1.5rem]">{title}</h2>
      <p className="tv2-body max-w-xl text-[color:var(--tv2-muted)]">{body}</p>
      {ctaLabel && onCta ? (
        <button type="button" className="tv2-btn tv2-btn-primary" onClick={onCta}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  )
}

export function TradesSection({
  journalTrades,
  onDeleteJournalTrade,
  deletingJournalTradeId,
  onDeleteLedgerTrade,
  deletingLedgerTradeId,
}: {
  journalTrades: Array<{
    id: string
    time: string
    name: string
    qty: string
    entry: string
    exit: string
    pnl: number
    direction?: string | null
    setup?: string | null
    grade?: string | null
  }>
  onDeleteJournalTrade?: (tradeId: string) => void
  deletingJournalTradeId?: string | null
  onDeleteLedgerTrade?: (tradeId: string) => void
  deletingLedgerTradeId?: string | null
}) {
  const range = useTradingDateRangeStore((s) => s.range)
  const apiRange = dateRangeToDateTimeParams(range)
  const ledgerQuery = useTrades(apiRange)
  const ledger = ledgerQuery.data ?? []

  return (
    <div className="tv2-card min-h-[40rem] space-y-6 p-4 md:p-5">
      <div>
        <h2 className="tv2-h2">Trade log</h2>
        <p className="tv2-caption mt-1">
          Selected journal trades, plus ledger entries for {range.label}.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="tv2-h3">This journal</h3>
        {journalTrades.length === 0 ? (
          <p className="tv2-caption">No trades linked on the selected journal.</p>
        ) : (
          <ul className="space-y-2">
            {journalTrades.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[color:var(--tv2-border)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{t.name}</p>
                  <p className="tv2-caption">
                    {[t.time, t.direction, t.setup, t.grade ? `Grade ${t.grade}` : null, `Qty ${t.qty}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="tv2-caption">
                    {t.entry} → {t.exit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={t.pnl >= 0 ? "tv2-positive text-[13px] font-semibold" : "tv2-negative text-[13px] font-semibold"}>
                    {formatMoney2(t.pnl)}
                  </span>
                  {onDeleteJournalTrade ? (
                    <button
                      type="button"
                      className="tv2-btn tv2-btn-sm"
                      style={{ color: "#f87171", borderColor: "rgba(248, 113, 113, 0.35)" }}
                      disabled={deletingJournalTradeId === t.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete trade ${t.name}? This removes it from the journal and trade log.`,
                          )
                        ) {
                          onDeleteJournalTrade(t.id)
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      {deletingJournalTradeId === t.id ? "Deleting…" : "Delete"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="tv2-h3">Ledger · {range.label}</h3>
        {ledgerQuery.isLoading ? (
          <p className="tv2-caption">Loading ledger…</p>
        ) : ledger.length === 0 ? (
          <p className="tv2-caption">No ledger trades in this period.</p>
        ) : (
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {ledger.slice(0, 40).map((t) => {
              const pnl = Number(t.pnl_net ?? 0)
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[color:var(--tv2-border)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{t.instrument}</p>
                    <p className="tv2-caption">
                      {[t.direction, t.setup, t.status, t.grade ? `Grade ${t.grade}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="tv2-caption">
                      {num2(t.entry_price)} → {num2(t.exit_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={pnl >= 0 ? "tv2-positive text-[13px] font-semibold" : "tv2-negative text-[13px] font-semibold"}>
                      {formatMoney2(pnl)}
                    </span>
                    {onDeleteLedgerTrade ? (
                      <button
                        type="button"
                        className="tv2-btn tv2-btn-sm"
                        style={{ color: "#f87171", borderColor: "rgba(248, 113, 113, 0.35)" }}
                        disabled={deletingLedgerTradeId === t.id}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete ledger trade ${t.instrument}? This cannot be undone easily.`,
                            )
                          ) {
                            onDeleteLedgerTrade(t.id)
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {deletingLedgerTradeId === t.id ? "Deleting…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export function AnalyticsSection() {
  const range = useTradingDateRangeStore((s) => s.range)
  const ledgerRange = dateRangeToDateTimeParams(range)
  const journalRange = dateRangeToApiParams(range)
  const analytics = useTradingAnalytics(ledgerRange)
  const journalAnalytics = useJournalAnalytics(journalRange)
  const journalsQuery = useJournalDays(journalRange)
  const a = analytics.data
  const j = journalAnalytics.data

  const journalNetPnl = useMemo(
    () => (journalsQuery.data ?? []).reduce((sum, d) => sum + Number(d.day_pnl ?? 0), 0),
    [journalsQuery.data],
  )
  const hasJournalDays = (journalsQuery.data?.length ?? 0) > 0
  // Match Overview / journal cards: day_pnl rollup is the source of truth
  const netPnl = hasJournalDays ? journalNetPnl : Number(a?.net_pnl ?? 0)
  const tradesCount = j?.trades_count ?? a?.trades_count ?? 0
  const winRate =
    j?.classified_win_rate != null
      ? Number(j.classified_win_rate)
      : a
        ? a.win_rate * (a.win_rate <= 1 ? 100 : 1)
        : 0

  const equity = useMemo(() => {
    if (hasJournalDays && (journalsQuery.data?.length ?? 0) > 0) {
      const days = [...(journalsQuery.data ?? [])].sort((x, y) =>
        x.journal_date.localeCompare(y.journal_date),
      )
      let running = 0
      return days.map((d) => {
        const pnl = Number(d.day_pnl ?? 0)
        running += pnl
        return {
          date: String(d.journal_date).slice(5),
          equity: running,
          pnl,
        }
      })
    }
    return (a?.equity_curve ?? []).map((p) => ({
      date: String(p.date).slice(5),
      equity: Number(p.equity ?? 0),
      pnl: Number(p.pnl ?? 0),
    }))
  }, [a?.equity_curve, hasJournalDays, journalsQuery.data])

  if ((analytics.isLoading || journalsQuery.isLoading) && !a && !journalsQuery.data) {
    return (
      <div className="tv2-card min-h-[40rem] p-5">
        <p className="tv2-caption">Loading analytics for {range.label}…</p>
      </div>
    )
  }

  return (
    <div className="tv2-card min-h-[40rem] space-y-6 p-4 md:p-5">
      <div>
        <h2 className="tv2-h2">Analytics</h2>
        <p className="tv2-caption mt-1">
          Performance for {range.label} ({range.startDate} → {range.endDate}).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Net P&L",
            value: formatMoney2(netPnl),
            tone: netPnl >= 0 ? "up" : "down",
          },
          { label: "Win rate", value: `${winRate.toFixed(2)}%`, tone: "neutral" },
          { label: "Trades", value: String(tradesCount), tone: "neutral" },
          {
            label: "Avg R",
            value: a?.avg_r != null ? Number(a.avg_r).toFixed(2) : "—",
            tone: "neutral",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-[14px] border border-[color:var(--tv2-border)] p-3">
            <p className="tv2-caption">{card.label}</p>
            <p
              className={
                card.tone === "up"
                  ? "tv2-value tv2-positive mt-1 text-[1.35rem]"
                  : card.tone === "down"
                    ? "tv2-value tv2-negative mt-1 text-[1.35rem]"
                    : "tv2-value mt-1 text-[1.35rem]"
              }
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>
      <p className="tv2-caption">
        Net P&amp;L uses journal day totals for this period (same as Overview).
      </p>

      <section className="space-y-2">
        <h3 className="tv2-h3">Equity curve</h3>
        {equity.length === 0 ? (
          <p className="tv2-caption">No equity curve for this period yet.</p>
        ) : (
          <div className="h-56 rounded-[14px] border border-[color:var(--tv2-border)] bg-[#0a0c0f] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="tv2Eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#8b929e", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b929e", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  contentStyle={{
                    background: "#161a21",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => money(Number(v))}
                />
                <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#tv2Eq)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-[color:var(--tv2-border)] p-3">
          <p className="tv2-caption">Journal days</p>
          <p className="tv2-value mt-1 text-[1.25rem]">{j?.days_count ?? "—"}</p>
        </div>
        <div className="rounded-[14px] border border-[color:var(--tv2-border)] p-3">
          <p className="tv2-caption">Journal trades</p>
          <p className="tv2-value mt-1 text-[1.25rem]">{j?.trades_count ?? "—"}</p>
        </div>
        <div className="rounded-[14px] border border-[color:var(--tv2-border)] p-3">
          <p className="tv2-caption">Profit factor</p>
          <p className="tv2-value mt-1 text-[1.25rem]">
            {a?.profit_factor != null ? Number(a.profit_factor).toFixed(2) : "—"}
          </p>
        </div>
      </section>
    </div>
  )
}

export function CalendarSection({
  days,
  selectedId,
  onSelectDay,
}: {
  days: JournalDaySummary[]
  selectedId: string | null
  onSelectDay: (id: string) => void
}) {
  const range = useTradingDateRangeStore((s) => s.range)
  const shiftMonth = useTradingDateRangeStore((s) => s.shiftMonth)
  const setMonth = useTradingDateRangeStore((s) => s.setMonth)
  const cursor = monthCursorFromRange(range)

  const byDate = useMemo(() => {
    const map = new Map<string, JournalDaySummary[]>()
    for (const d of days) {
      const key = d.journal_date
      const list = map.get(key) ?? []
      list.push(d)
      map.set(key, list)
    }
    return map
  }, [days])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ day: number | null; iso?: string }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({ day: d, iso })
  }

  const monthLabel = range.label

  return (
    <div className="tv2-card min-h-[40rem] space-y-5 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="tv2-h2">Calendar</h2>
          <p className="tv2-caption mt-1">
            Global period filter — changing the month updates journals, stats, and charts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="tv2-btn tv2-btn-sm"
            onClick={() => shiftMonth(-1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="tv2-h3 min-w-[9rem] text-center"
            onClick={() => setMonth(year, month)}
            title="Reset to this month view"
          >
            {monthLabel}
          </button>
          <button
            type="button"
            className="tv2-btn tv2-btn-sm"
            onClick={() => shiftMonth(1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="tv2-caption py-1">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.day || !cell.iso) {
            return <div key={`e-${i}`} className="min-h-[4.5rem] rounded-[12px]" />
          }
          const entries = byDate.get(cell.iso) ?? []
          const pnl = entries.reduce((s, e) => s + Number(e.day_pnl ?? 0), 0)
          const active = entries.some((e) => e.id === selectedId)
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={!entries.length}
              onClick={() => entries[0] && onSelectDay(entries[0].id)}
              className="min-h-[4.5rem] rounded-[12px] border border-[color:var(--tv2-border)] p-1.5 text-left transition-colors hover:bg-white/[0.03] disabled:cursor-default disabled:opacity-45"
              data-active={active}
              style={
                active
                  ? { borderColor: "rgba(34,197,94,0.45)", background: "var(--tv2-accent-soft)" }
                  : undefined
              }
            >
              <span className="tv2-caption text-[color:var(--tv2-fg)]">{cell.day}</span>
              {entries.length ? (
                <div className="mt-1 space-y-0.5">
                  <p className={pnl >= 0 ? "tv2-caption tv2-positive" : "tv2-caption tv2-negative"}>
                    {formatMoney2(pnl)}
                  </p>
                  <p className="tv2-caption line-clamp-1 text-[10px]">
                    {entries[0]?.title || formatJournalDate(cell.iso)}
                  </p>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const PLACEHOLDER_META: Record<
  string,
  { title: string; body: string; icon: typeof Target; classicTab?: string; knowledge?: boolean }
> = {
  watchlist: {
    title: "Watchlist",
    body: "Instrument watchlists will live here. For now, track setups in your Obsidian trading notes or classic tools.",
    icon: ListChecks,
    classicTab: "journal",
  },
  notes: {
    title: "Notes",
    body: "Quick trading notes and scratchpads are coming to this tab. You can still capture notes via Quick Note or Knowledge.",
    icon: NotebookPen,
    classicTab: "entry",
  },
  strategies: {
    title: "Strategies",
    body: "Strategy playbooks will show here. Import strategy docs from Obsidian into Knowledge for now.",
    icon: Target,
    knowledge: true,
  },
  rules: {
    title: "Rules",
    body: "Trading rules and checklists will sit here. Your Obsidian rules notes remain the source of truth until this ships.",
    icon: FileText,
    knowledge: true,
  },
}

export function ComingSoonSection({ sectionId }: { sectionId: string }) {
  const navigate = useNavigate()
  const meta = PLACEHOLDER_META[sectionId]
  if (!meta) {
    return (
      <SectionPlaceholder
        title="Coming soon"
        body="This Trading section is not available yet."
      />
    )
  }
  const Icon = meta.icon
  return (
    <div className="tv2-card flex min-h-[40rem] flex-col items-start justify-center gap-4 p-6 md:p-8">
      <div
        className="flex size-12 items-center justify-center rounded-[14px]"
        style={{ background: "var(--tv2-accent-soft)", color: "var(--tv2-accent)" }}
      >
        <Icon className="size-6" />
      </div>
      <h2 className="tv2-title text-[1.5rem]">{meta.title}</h2>
      <p className="tv2-body max-w-xl text-[color:var(--tv2-muted)]">{meta.body}</p>
      <div className="flex flex-wrap gap-2">
        {meta.classicTab ? (
          <button
            type="button"
            className="tv2-btn tv2-btn-primary"
            onClick={() => navigate(`/trading/classic?tab=${meta.classicTab}`)}
          >
            Open classic tools
          </button>
        ) : null}
        {meta.knowledge ? (
          <button type="button" className="tv2-btn" onClick={() => navigate("/knowledge")}>
            Open Knowledge
          </button>
        ) : null}
        <button type="button" className="tv2-btn" onClick={() => navigate("/ai/imports")}>
          <BookMarked className="size-3.5" />
          Import notes
        </button>
      </div>
    </div>
  )
}

export const SECTION_ICONS = {
  overview: LineChart,
  journal: BookMarked,
  trades: CandlestickChart,
  analytics: LineChart,
  calendar: CalendarDays,
}
