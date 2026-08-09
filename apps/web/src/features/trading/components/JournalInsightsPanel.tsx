import { useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  money,
  useJournalAnalytics,
  useTradingAnalytics,
  useTradingMutations,
} from "@/features/trading/hooks"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"

function ExplainCard({
  title,
  value,
  meaning,
  tone,
}: {
  title: string
  value: string
  meaning: string
  tone?: "up" | "down" | "neutral"
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 px-4 py-3 backdrop-blur-xl">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{title}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "up" && "text-emerald-300",
          tone === "down" && "text-rose-300",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{meaning}</p>
    </div>
  )
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string
  blurb: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{blurb}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function JournalInsightsPanel() {
  const journalQuery = useJournalAnalytics()
  const ledgerQuery = useTradingAnalytics()
  const { promoteJournalTrades } = useTradingMutations()
  const [msg, setMsg] = useState<string | null>(null)

  const data = journalQuery.data
  const ledger = ledgerQuery.data

  async function onPromote() {
    setMsg(null)
    try {
      const report = await promoteJournalTrades.mutateAsync({ dry_run: false })
      setMsg(
        report.created > 0
          ? `Copied ${report.created} trade(s) into Trade Log. ${report.skipped} were skipped (already copied or missing entry details).`
          : report.skipped > 0
            ? `Nothing new to copy — ${report.skipped} already linked or incomplete.`
            : "No trades to copy.",
      )
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not copy trades")
    }
  }

  if (journalQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-[1.35rem]" />
        <Skeleton className="h-48 w-full rounded-[1.35rem]" />
      </div>
    )
  }

  if (journalQuery.isError || !data) {
    return (
      <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 text-sm text-muted-foreground backdrop-blur-xl md:p-5">
        Could not load analytics
        {journalQuery.error instanceof Error ? `: ${journalQuery.error.message}` : "."}
      </section>
    )
  }

  const known = data.wins + data.losses
  const setupChart = data.by_setup.slice(0, 8).map((s) => ({
    name: s.setup.length > 16 ? `${s.setup.slice(0, 14)}…` : s.setup,
    full: s.setup,
    count: s.count,
    wins: s.wins,
    losses: s.losses,
  }))
  const gradeChart = data.by_grade.map((g) => ({ name: g.key, count: g.count }))
  const equityData = (ledger?.equity_curve ?? []).map((p) => ({
    date: String(p.date).slice(5),
    total: Number(p.equity),
  }))
  const longCount = data.by_direction.find((d) => d.key === "long")?.count ?? 0
  const shortCount = data.by_direction.find((d) => d.key === "short")?.count ?? 0

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
        <p className="text-sm text-muted-foreground">Trading Analytics</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl">
          How you traded — in plain English
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          These numbers come from your <span className="text-foreground/90">Day Journals</span>{" "}
          (the notes you wrote after each session). We read wins/losses from what you wrote in
          “result” (and any P&amp;L if present). If a result is unclear, it counts as{" "}
          <span className="text-foreground/90">unknown</span> — that keeps the win rate honest.
        </p>
      </section>

      <Section
        title="1. The big picture"
        blurb="Start here. Four numbers that answer: how much did you journal, and how often did you win when we could tell?"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ExplainCard
            title="Journal days"
            value={String(data.days_count)}
            meaning="How many trading days you have written up so far."
          />
          <ExplainCard
            title="Trades logged"
            value={String(data.trades_count)}
            meaning="Total trades found inside those day journals."
          />
          <ExplainCard
            title="Wins vs losses"
            value={`${data.wins} · ${data.losses}`}
            meaning={`${data.unknowns} trade(s) still unclear from the notes, so they are not counted as win or loss yet.`}
            tone={data.wins > data.losses ? "up" : data.losses > data.wins ? "down" : "neutral"}
          />
          <ExplainCard
            title="Win rate"
            value={data.classified_win_rate != null ? `${data.classified_win_rate}%` : "—"}
            meaning={
              known > 0
                ? `Of the ${known} trades with a clear outcome, you won ${data.wins}. Formula: wins ÷ (wins + losses).`
                : "Need clearer win/loss wording in journal results to calculate this."
            }
            tone={
              data.classified_win_rate == null
                ? "neutral"
                : data.classified_win_rate >= 50
                  ? "up"
                  : "down"
            }
          />
        </div>
      </Section>

      <Section
        title="2. Which setups you used"
        blurb="A “setup” is the pattern or reason you took the trade (e.g. gap down, resistance rejection). This shows which ideas you trade most — and how those usually end."
      >
        {setupChart.length === 0 ? (
          <p className="text-sm text-muted-foreground">No setups parsed from journals yet.</p>
        ) : (
          <>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setupChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,24,32,0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                    }}
                    formatter={(value) => [value, "Trades"]}
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.full ?? "")
                    }
                  />
                  <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                    {setupChart.map((row) => (
                      <Cell key={row.full} fill="rgba(125,211,252,0.75)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {data.by_setup.slice(0, 8).map((s) => (
                <li
                  key={s.setup}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2 text-sm last:border-0"
                >
                  <span className="font-medium text-foreground/90">{s.setup}</span>
                  <span className="text-muted-foreground">
                    {s.count} trade{s.count === 1 ? "" : "s"}
                    {s.wins + s.losses > 0
                      ? ` · ${s.wins} win${s.wins === 1 ? "" : "s"}, ${s.losses} loss${s.losses === 1 ? "" : "es"}`
                      : " · outcomes still unclear"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="3. Process grades"
          blurb="These are the grades you gave yourself in the journal (A / B / C…). They score how well you followed the plan — not only whether you made money."
        >
          {gradeChart.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trade grades found yet.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,24,32,0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="rgba(110,231,183,0.75)" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Long vs short</dt>
              <dd className="font-medium">
                {longCount} long · {shortCount} short
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trades with a “mistakes” write-up</dt>
              <dd className="font-medium">{data.mistake_sections}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Average day-quality score (DQS)</dt>
              <dd className="font-medium">{data.avg_dqs != null ? data.avg_dqs : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Day overall grades</dt>
              <dd className="font-medium">
                {data.by_day_grade.map((g) => `${g.key} (${g.count})`).join(", ") || "—"}
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          title="4. Running score (approx.)"
          blurb="This line adds up rough P&L over time. When journals mention points (e.g. “−14 points”), we treat that as a number so you can see the trend. It is approximate — not a broker statement."
        >
          {equityData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough numeric results yet to draw a curve. Add clearer point/P&amp;L results in
              journals, or keep promoting trades into Trade Log with exits.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Approx. net: </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      Number(ledger?.net_pnl) > 0 && "text-emerald-300",
                      Number(ledger?.net_pnl) < 0 && "text-rose-300",
                    )}
                  >
                    {money(ledger?.net_pnl)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Built from {equityData.length} trade(s) with readable numbers.
                </p>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData}>
                    <defs>
                      <linearGradient id="simpleEq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(110,231,183,0.45)" />
                        <stop offset="100%" stopColor="rgba(110,231,183,0)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={44} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(20,24,32,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="rgba(110,231,183,0.95)"
                      fill="url(#simpleEq)"
                      name="Running total"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Section>
      </div>

      <Section
        title="5. Trade Log sync"
        blurb="Day Journals are your written review. Trade Log is the formal list used for detailed P&L tracking. Copying links each journal trade into Trade Log once (safe to click again — already-copied trades are skipped)."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={promoteJournalTrades.isPending || data.promote_ready === 0}
            onClick={() => void onPromote()}
          >
            {promoteJournalTrades.isPending
              ? "Copying…"
              : data.promote_ready > 0
                ? `Copy ${data.promote_ready} ready trade(s) to Trade Log`
                : "All ready trades already copied"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already in Trade Log: <span className="text-foreground">{data.already_linked}</span>
          </p>
        </div>
        {msg ? <p className="mt-3 text-sm text-muted-foreground">{msg}</p> : null}
      </Section>
    </div>
  )
}
