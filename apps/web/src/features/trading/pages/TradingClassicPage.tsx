import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"

import {
  money,
  useMistakes,
  usePsychology,
  useReviews,
  useTrades,
  useTradingMutations,
} from "@/features/trading/hooks"
import { DayJournalsPanel } from "@/features/trading/components/DayJournalsPanel"
import { JournalInsightsPanel } from "@/features/trading/components/JournalInsightsPanel"
import type { TradeFilters } from "@/features/trading/types"
import { ModuleHomeShell } from "@/features/modules/ModuleHomeShell"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"

type Tab = "days" | "journal" | "entry" | "analytics" | "reviews" | "mind"

function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5",
        className,
      )}
    >
      <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function TradingClassicPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const initialTab: Tab =
    tabParam === "days" ||
    tabParam === "journal" ||
    tabParam === "entry" ||
    tabParam === "analytics" ||
    tabParam === "reviews" ||
    tabParam === "mind"
      ? tabParam
      : "days"
  const [tab, setTab] = useState<Tab>(initialTab)
  const [filters, setFilters] = useState<TradeFilters>({})
  const [draftFilters, setDraftFilters] = useState<TradeFilters>({})

  useEffect(() => {
    if (
      tabParam === "days" ||
      tabParam === "journal" ||
      tabParam === "entry" ||
      tabParam === "analytics" ||
      tabParam === "reviews" ||
      tabParam === "mind"
    ) {
      setTab(tabParam)
    }
  }, [tabParam])

  const tradesQuery = useTrades(filters)
  const mistakesQuery = useMistakes()
  const psychQuery = usePsychology()
  const weeklyReviews = useReviews("weekly")
  const monthlyReviews = useReviews("monthly")
  const m = useTradingMutations()

  // Entry form state
  const [instrument, setInstrument] = useState("NIFTY")
  const [direction, setDirection] = useState<"long" | "short">("long")
  const [qty, setQty] = useState("1")
  const [entry, setEntry] = useState("")
  const [exit, setExit] = useState("")
  const [risk, setRisk] = useState("")
  const [fees, setFees] = useState("0")
  const [setup, setSetup] = useState("")
  const [thesis, setThesis] = useState("")
  const [tags, setTags] = useState("")
  const [grade, setGrade] = useState("")
  const [emotionBefore, setEmotionBefore] = useState("")
  const [emotionAfter, setEmotionAfter] = useState("")
  const [mistakeText, setMistakeText] = useState("")
  const [status, setStatus] = useState<"open" | "closed">("closed")
  const [entryError, setEntryError] = useState<string | null>(null)

  // Review form
  const [reviewType, setReviewType] = useState<"weekly" | "monthly">("weekly")
  const [reviewTitle, setReviewTitle] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [wentWell, setWentWell] = useState("")
  const [improve, setImprove] = useState("")
  const [focusNext, setFocusNext] = useState("")

  // Psychology / mistake quick add
  const [mood, setMood] = useState("focused")
  const [psychNotes, setPsychNotes] = useState("")
  const [mistakeCat, setMistakeCat] = useState("fomo")
  const [mistakeDesc, setMistakeDesc] = useState("")

  async function onCreateTrade(e: FormEvent) {
    e.preventDefault()
    setEntryError(null)
    try {
      const now = new Date().toISOString()
      const body: Record<string, unknown> = {
        instrument,
        direction,
        quantity: Number(qty),
        entry_price: Number(entry),
        exit_price: exit ? Number(exit) : null,
        opened_at: now,
        closed_at: status === "closed" ? now : null,
        fees: Number(fees || 0),
        risk_amount: risk ? Number(risk) : null,
        setup: setup || null,
        thesis: thesis || null,
        status,
        grade: grade || null,
        emotion_before: emotionBefore || null,
        emotion_after: emotionAfter || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        mistakes: mistakeText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
      }
      const trade = await m.createTrade.mutateAsync(body)
      setTab("journal")
      setEntry("")
      setExit("")
      setThesis("")
      setMistakeText("")
      return trade
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Failed to save trade")
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "days", label: "Day Journals" },
    { id: "journal", label: "Trade Log" },
    { id: "entry", label: "Trade Entry" },
    { id: "analytics", label: "Analytics" },
    { id: "reviews", label: "Reviews" },
    { id: "mind", label: "Mind & Mistakes" },
  ]

  return (
    <ModuleHomeShell moduleId="trading">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "days" && <DayJournalsPanel />}

      {tab === "journal" && (
        <div className="space-y-4">
          <Panel title="Search & Filters">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
              <Input
                className="md:col-span-2"
                placeholder="Search instrument, thesis, tags…"
                value={draftFilters.q ?? ""}
                onChange={(e) => setDraftFilters((f) => ({ ...f, q: e.target.value }))}
              />
              <Input
                placeholder="Instrument"
                value={draftFilters.instrument ?? ""}
                onChange={(e) => setDraftFilters((f) => ({ ...f, instrument: e.target.value }))}
              />
              <Input
                placeholder="Setup"
                value={draftFilters.setup ?? ""}
                onChange={(e) => setDraftFilters((f) => ({ ...f, setup: e.target.value }))}
              />
              <Input
                placeholder="Tag"
                value={draftFilters.tag ?? ""}
                onChange={(e) => setDraftFilters((f) => ({ ...f, tag: e.target.value }))}
              />
              <div className="flex gap-2">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={draftFilters.status ?? ""}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value || undefined }))}
                >
                  <option value="">All status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
                <Button type="button" onClick={() => setFilters(draftFilters)}>
                  Apply
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Trade History">
            {tradesQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (tradesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet. Add your first entry.</p>
            ) : (
              <ul className="space-y-2">
                {(tradesQuery.data ?? []).map((trade) => {
                  const pnl = Number(trade.pnl_net ?? 0)
                  return (
                    <li
                      key={trade.id}
                      className="flex flex-col gap-2 rounded-2xl bg-foreground/[0.03] p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{trade.instrument}</span>
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] uppercase">
                            {trade.direction}
                          </span>
                          <span className="text-xs text-muted-foreground">{trade.status}</span>
                          {trade.setup ? (
                            <span className="text-xs text-sky-200/90">{trade.setup}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(trade.opened_at).toLocaleString()} · qty {String(trade.quantity)} ·
                          entry {String(trade.entry_price)}
                          {trade.exit_price ? ` → ${String(trade.exit_price)}` : ""}
                          {trade.r_multiple != null ? ` · ${Number(trade.r_multiple).toFixed(2)}R` : ""}
                        </p>
                        {trade.tags.length > 0 ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {trade.tags.map((t) => `#${t}`).join(" ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            pnl > 0 && "text-emerald-300",
                            pnl < 0 && "text-rose-300",
                          )}
                        >
                          {trade.pnl_net != null ? money(trade.pnl_net) : "—"}
                        </span>
                        <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) m.uploadScreenshot.mutate({ tradeId: trade.id, file })
                            }}
                          />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => m.deleteTrade.mutate(trade.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "entry" && (
        <Panel title="New Trade Entry">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreateTrade}>
            <Field label="Instrument">
              <Input value={instrument} onChange={(e) => setInstrument(e.target.value)} required />
            </Field>
            <Field label="Direction">
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={direction}
                onChange={(e) => setDirection(e.target.value as "long" | "short")}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </Field>
            <Field label="Quantity">
              <Input value={qty} onChange={(e) => setQty(e.target.value)} required />
            </Field>
            <Field label="Status">
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as "open" | "closed")}
              >
                <option value="closed">Closed</option>
                <option value="open">Open</option>
              </select>
            </Field>
            <Field label="Entry price">
              <Input value={entry} onChange={(e) => setEntry(e.target.value)} required />
            </Field>
            <Field label="Exit price">
              <Input value={exit} onChange={(e) => setExit(e.target.value)} />
            </Field>
            <Field label="Risk amount">
              <Input value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="For R-multiple" />
            </Field>
            <Field label="Fees">
              <Input value={fees} onChange={(e) => setFees(e.target.value)} />
            </Field>
            <Field label="Setup">
              <Input value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="ORB, VWAP…" />
            </Field>
            <Field label="Grade">
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="">—</option>
                {["A", "B", "C", "D", "F"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Emotion before">
              <Input value={emotionBefore} onChange={(e) => setEmotionBefore(e.target.value)} />
            </Field>
            <Field label="Emotion after">
              <Input value={emotionAfter} onChange={(e) => setEmotionAfter(e.target.value)} />
            </Field>
            <Field label="Tags (comma separated)" className="md:col-span-2">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="breakout, news" />
            </Field>
            <Field label="Thesis" className="md:col-span-2">
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-transparent p-2 text-sm"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
              />
            </Field>
            <Field label="Mistakes (one per line)" className="md:col-span-2">
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-transparent p-2 text-sm"
                value={mistakeText}
                onChange={(e) => setMistakeText(e.target.value)}
              />
            </Field>
            {entryError ? <p className="text-sm text-destructive md:col-span-2">{entryError}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={m.createTrade.isPending}>
                {m.createTrade.isPending ? "Saving…" : "Save trade"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {tab === "analytics" && <JournalInsightsPanel />}

      {tab === "reviews" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Create Weekly / Monthly Review">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                m.createReview.mutate({
                  period_type: reviewType,
                  period_start: periodStart,
                  period_end: periodEnd,
                  title: reviewTitle,
                  what_went_well: wentWell || null,
                  what_to_improve: improve || null,
                  focus_next: focusNext || null,
                })
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={reviewType}
                  onChange={(e) => setReviewType(e.target.value as "weekly" | "monthly")}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <Input
                  placeholder="Title"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  required
                />
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
              </div>
              <textarea
                className="min-h-16 w-full rounded-md border border-input bg-transparent p-2 text-sm"
                placeholder="What went well"
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
              />
              <textarea
                className="min-h-16 w-full rounded-md border border-input bg-transparent p-2 text-sm"
                placeholder="What to improve"
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
              />
              <textarea
                className="min-h-16 w-full rounded-md border border-input bg-transparent p-2 text-sm"
                placeholder="Focus next period"
                value={focusNext}
                onChange={(e) => setFocusNext(e.target.value)}
              />
              <Button type="submit">Save review</Button>
            </form>
          </Panel>

          <div className="space-y-4">
            <Panel title="Weekly Reviews">
              <ReviewList
                rows={weeklyReviews.data ?? []}
                onDelete={(id) => m.deleteReview.mutate(id)}
              />
            </Panel>
            <Panel title="Monthly Reviews">
              <ReviewList
                rows={monthlyReviews.data ?? []}
                onDelete={(id) => m.deleteReview.mutate(id)}
              />
            </Panel>
          </div>
        </div>
      )}

      {tab === "mind" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Psychology Tracker">
            <form
              className="mb-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                m.createPsychology.mutate({
                  entry_date: new Date().toISOString().slice(0, 10),
                  mood,
                  confidence: 3,
                  stress: 3,
                  discipline: 3,
                  notes: psychNotes || null,
                })
                setPsychNotes("")
              }}
            >
              <Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood" />
              <Input value={psychNotes} onChange={(e) => setPsychNotes(e.target.value)} placeholder="Notes" />
              <Button type="submit" size="sm">
                Log psychology
              </Button>
            </form>
            <ul className="space-y-2 text-sm">
              {(psychQuery.data ?? []).map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 rounded-xl bg-foreground/[0.03] p-2">
                  <div>
                    <p className="font-medium">{p.mood}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.entry_date} · C{p.confidence} S{p.stress} D{p.discipline}
                    </p>
                    {p.notes ? <p className="mt-1 text-muted-foreground">{p.notes}</p> : null}
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => m.deletePsychology.mutate(p.id)}>
                    ×
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Mistake Tracker">
            <form
              className="mb-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                m.createMistake.mutate({
                  category: mistakeCat,
                  description: mistakeDesc,
                  severity: 2,
                  occurred_on: new Date().toISOString().slice(0, 10),
                })
                setMistakeDesc("")
              }}
            >
              <Input value={mistakeCat} onChange={(e) => setMistakeCat(e.target.value)} placeholder="Category" />
              <Input
                value={mistakeDesc}
                onChange={(e) => setMistakeDesc(e.target.value)}
                placeholder="What went wrong"
                required
              />
              <Button type="submit" size="sm">
                Log mistake
              </Button>
            </form>
            <ul className="space-y-2 text-sm">
              {(mistakesQuery.data ?? []).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2 rounded-xl bg-foreground/[0.03] p-2">
                  <div>
                    <p className="font-medium">{item.category}</p>
                    <p className="text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.occurred_on}</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteMistake.mutate(item.id)}>
                    ×
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </ModuleHomeShell>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn("block space-y-1.5 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function ReviewList({
  rows,
  onDelete,
}: {
  rows: Array<{
    id: string
    title: string
    period_start: string
    period_end: string
    trades_count: number
    win_rate: number | string | null
    net_pnl: number | string | null
    what_went_well: string | null
  }>
  onDelete: (id: string) => void
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl bg-foreground/[0.03] p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">
                {r.period_start} → {r.period_end} · {r.trades_count} trades
                {r.win_rate != null ? ` · ${Number(r.win_rate).toFixed(1)}% WR` : ""}
                {r.net_pnl != null ? ` · ${money(r.net_pnl)}` : ""}
              </p>
              {r.what_went_well ? (
                <p className="mt-1 text-muted-foreground">{r.what_went_well}</p>
              ) : null}
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(r.id)}>
              ×
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
