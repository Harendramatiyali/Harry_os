import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { tradingApi } from "@/features/trading/api"
import {
  money,
  useJournalDay,
  useJournalDays,
  useTradingMutations,
} from "@/features/trading/hooks"
import type {
  JournalAttachment,
  JournalDay,
  JournalDayFilters,
  JournalTrade,
} from "@/features/trading/types"
import { OriginalNotebookViewer } from "@/features/trading/components/OriginalNotebookViewer"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"

function formatDateLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function sectionLabel(key: string, heading: string | null) {
  if (heading?.trim()) return heading.replace(/^[#\s]+/, "").trim()
  return key.replace(/_/g, " ")
}

function fmtNum(v: number | string | null | undefined, digits = 2) {
  if (v == null || v === "") return "—"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(digits, 2),
  })
}

function isLossResult(result: string | null | undefined) {
  if (!result) return false
  const r = result.toLowerCase()
  return /stop loss|sl hit|loss|loser|stopped/.test(r)
}

function isWinResult(result: string | null | undefined) {
  if (!result) return false
  const r = result.toLowerCase()
  return /profit|winner|target|booked/.test(r)
}

function GradePill({ grade }: { grade: string | null | undefined }) {
  if (!grade) return null
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-sm font-semibold text-emerald-300">
      {grade}
    </span>
  )
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null
  const loss = isLossResult(result)
  const win = isWinResult(result)
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium",
        loss && "bg-rose-500/15 text-rose-300",
        win && "bg-emerald-500/15 text-emerald-300",
        !loss && !win && "bg-white/10 text-foreground/80",
      )}
    >
      {result}
    </span>
  )
}

function MdBody({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-muted-foreground italic">Empty</p>
  }
  return (
    <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground/85">
      {text}
    </pre>
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(blob)
  })
}

function AuthImage({
  attachmentId,
  className,
  onOpen,
}: {
  attachmentId: string
  className?: string
  onOpen?: (url: string) => void
}) {
  const token = useAuthStore((s) => s.accessToken)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Sign in required")
      return
    }
    let cancelled = false
    setError(null)
    setDataUrl(null)
    tradingApi
      .fetchJournalAttachmentBlob(attachmentId, token)
      .then((blob) => {
        if (!blob.type.startsWith("image/") && blob.size < 32) {
          throw new Error("Not an image")
        }
        return blobToDataUrl(blob)
      })
      .then((next) => {
        if (!cancelled) setDataUrl(next)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed")
      })
    return () => {
      cancelled = true
    }
  }, [attachmentId, token])

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-950 text-[10px] text-red-300/80", className)}>
        {error}
      </div>
    )
  }
  if (!dataUrl) return <Skeleton className={cn("rounded-lg", className)} />
  return (
    <button type="button" className={cn("block overflow-hidden", className)} onClick={() => onOpen?.(dataUrl)}>
      <img src={dataUrl} alt="" className="h-full w-full object-cover" />
    </button>
  )
}

function ScreenshotThumbs({
  items,
  emptyLabel = "No charts attached to this trade.",
}: {
  items: JournalAttachment[]
  emptyLabel?: string
}) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const copied = items.filter((a) => a.import_status === "copied")
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }
  const shown = copied.slice(0, 3)
  const extra = Math.max(0, copied.length - 3)

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((a, i) => (
          <div key={a.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
            <AuthImage attachmentId={a.id} className="h-full w-full" onOpen={setLightbox} />
            {i === shown.length - 1 && extra > 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold">
                +{extra}
              </div>
            ) : null}
          </div>
        ))}
        {copied.length === 0
          ? items.slice(0, 1).map((a) => (
              <div
                key={a.id}
                className="col-span-3 flex aspect-[16/7] items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-muted-foreground"
              >
                {a.import_status === "missing" ? "Missing in vault" : "Sync media to load charts"}
              </div>
            ))
          : null}
      </div>
      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[95vw] object-contain" />
        </button>
      ) : null}
    </>
  )
}

function AccordionRow({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/8 last:border-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-foreground/90">{title}</span>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="pb-3 animate-in fade-in duration-200">{children}</div> : null}
    </div>
  )
}

function TradeSummaryCard({ trade, dayBias }: { trade: JournalTrade; dayBias?: string | null }) {
  const stopLabel =
    trade.stop_price != null
      ? Number(trade.stop_price) < 5
        ? `${fmtNum(trade.stop_price)} pts`
        : fmtNum(trade.stop_price)
      : "—"

  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: "Instrument", value: trade.instrument ?? "—" },
    {
      label: "Direction",
      value: trade.direction ? (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase",
            trade.direction === "short" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300",
          )}
        >
          {trade.direction}
        </span>
      ) : (
        "—"
      ),
    },
    { label: "Entry", value: fmtNum(trade.entry_price) },
    { label: "Quantity", value: fmtNum(trade.quantity, 0) },
    { label: "Stop Loss", value: stopLabel },
    {
      label: "Result",
      value: (
        <span className={cn(isLossResult(trade.result) && "text-rose-300", isWinResult(trade.result) && "text-emerald-300")}>
          {trade.result ?? "—"}
        </span>
      ),
    },
    { label: "Setup", value: trade.setup ?? "—" },
    { label: "Market Bias", value: dayBias ?? "—" },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
      <h4 className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
        Trade Summary
      </h4>
      <dl className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="max-w-[60%] text-right font-medium leading-snug">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function TradeBlock({
  trade,
  dayBias,
  defaultOpen,
}: {
  trade: JournalTrade
  dayBias?: string | null
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? trade.trade_index === 1)
  const { promoteJournalTrades } = useTradingMutations()
  const canPromote = !trade.ledger_trade_id && trade.instrument && trade.direction && trade.entry_price

  const sections = useMemo(() => {
    return trade.sections.filter((s) => {
      const isShots =
        s.section_key === "screenshots" || /screenshot/i.test(s.heading_original ?? "")
      if (!isShots) return Boolean(s.body_markdown?.trim())
      const body = s.body_markdown.replace(/!\[\[[^\]]+\]\]/g, "").trim()
      return Boolean(body)
    })
  }, [trade.sections])

  const riskLabel =
    trade.stop_price != null
      ? Number(trade.stop_price) < 5
        ? `${Number(trade.stop_price) > 0 ? "−" : ""}${fmtNum(Math.abs(Number(trade.stop_price)))} pts`
        : fmtNum(trade.stop_price)
      : "—"

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-card/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-4 text-left md:px-5"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">Trade {trade.trade_index}</h3>
            {trade.ledger_trade_id ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                In Trade Log
              </span>
            ) : null}
            {trade.grade ? <GradePill grade={trade.grade} /> : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {[trade.instrument, trade.direction, trade.setup].filter(Boolean).join(" · ") ||
              "No instrument parsed"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ResultBadge result={trade.result} />
          <span className="text-[11px] text-muted-foreground">{open ? "Collapse" : "Expand"}</span>
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/10 px-4 py-4 md:px-5 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Entry" value={fmtNum(trade.entry_price)} />
            <Metric label="Qty" value={fmtNum(trade.quantity, 0)} />
            <Metric label="Risk" value={riskLabel} />
            <Metric
              label="Result"
              value={trade.result ?? "—"}
              tone={isLossResult(trade.result) ? "down" : isWinResult(trade.result) ? "up" : undefined}
            />
          </div>

          {canPromote ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={promoteJournalTrades.isPending}
              onClick={() =>
                void promoteJournalTrades.mutateAsync({
                  journal_trade_ids: [trade.id],
                  dry_run: false,
                })
              }
            >
              {promoteJournalTrades.isPending ? "Adding…" : "Add to Trade Log"}
            </Button>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.85fr)]">
            <div className="rounded-2xl border border-white/10 bg-background/30 px-4">
              {sections.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No written sections for this trade.</p>
              ) : (
                sections.map((s, i) => (
                  <AccordionRow
                    key={s.id}
                    title={sectionLabel(s.section_key, s.heading_original)}
                    defaultOpen={i < 2}
                  >
                    <MdBody
                      text={
                        /screenshot/i.test(s.heading_original ?? "") || s.section_key === "screenshots"
                          ? s.body_markdown.replace(/!\[\[[^\]]+\]\]/g, "").trim()
                          : s.body_markdown
                      }
                    />
                  </AccordionRow>
                ))
              )}
            </div>

            <aside className="space-y-3">
              <TradeSummaryCard trade={trade} dayBias={dayBias} />
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <h4 className="mb-3 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Charts & Screenshots
                </h4>
                <ScreenshotThumbs items={trade.attachments} />
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "up" | "down"
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-background/35 px-3 py-2.5">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-semibold tabular-nums",
          tone === "up" && "text-emerald-300",
          tone === "down" && "text-rose-300",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function DayHero({
  day,
  showRaw,
  onToggleRaw,
}: {
  day: JournalDay
  showRaw: boolean
  onToggleRaw: () => void
}) {
  return (
    <header className="rounded-[1.35rem] border border-white/10 bg-card/80 p-4 backdrop-blur-xl md:p-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-muted-foreground">Trading Journals</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl">
              {formatDateLabel(day.journal_date)}
            </h2>
            <GradePill grade={day.overall_grade} />
            {day.daily_rating != null ? (
              <span className="text-sm font-semibold text-sky-300 tabular-nums">
                {Number(day.daily_rating).toFixed(2)}/10
              </span>
            ) : null}
          </div>
          {day.title ? <p className="max-w-2xl text-sm text-muted-foreground">{day.title}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={showRaw ? "default" : "outline"} onClick={onToggleRaw}>
            {showRaw ? "Structured view" : "Raw markdown"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <HeroChip label="Instrument" value={day.primary_instrument ?? "—"} />
        <HeroChip label="Trades" value={String(day.trade_count)} />
        <HeroChip label="Bias" value={day.day_bias ?? "—"} />
        <HeroChip label="Status" value={day.parse_status} />
        {day.day_pnl != null ? <HeroChip label="Day PnL" value={money(day.day_pnl)} /> : null}
      </div>
    </header>
  )
}

function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-background/40 px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground/90">{value}</span>
    </div>
  )
}

export function DayJournalsPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dayFromUrl = searchParams.get("day")
  const [q, setQ] = useState("")
  const [appliedQ, setAppliedQ] = useState("")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(dayFromUrl)
  const [showRaw, setShowRaw] = useState(false)
  const [migrateMsg, setMigrateMsg] = useState<string | null>(null)

  const filters: JournalDayFilters = useMemo(
    () => ({
      q: appliedQ || undefined,
      favorite_only: favoriteOnly || undefined,
    }),
    [appliedQ, favoriteOnly],
  )

  const listQuery = useJournalDays(filters)
  const detailQuery = useJournalDay(selectedId)
  const { migrateJournals, syncJournalMedia } = useTradingMutations()
  const days = listQuery.data ?? []

  useEffect(() => {
    if (dayFromUrl) {
      setSelectedId(dayFromUrl)
    }
  }, [dayFromUrl])

  useEffect(() => {
    if (!selectedId && days.length) {
      const latest = days[0]
      const withShots = days.find((d) => d.attachment_count > 0)
      setSelectedId(latest?.id ?? withShots?.id ?? null)
    }
  }, [days, selectedId])

  useEffect(() => {
    if (selectedId && days.length && !days.some((d) => d.id === selectedId)) {
      // Keep URL-selected id even while list is still refetching after import save
      if (dayFromUrl && selectedId === dayFromUrl) return
      setSelectedId(days[0]?.id ?? null)
    }
  }, [days, selectedId, dayFromUrl])

  function selectDay(id: string) {
    setSelectedId(id)
    const next = new URLSearchParams(searchParams)
    next.set("day", id)
    setSearchParams(next, { replace: true })
  }

  const day = detailQuery.data

  async function onSync() {
    setMigrateMsg(null)
    try {
      const report = await migrateJournals.mutateAsync({ dry_run: false })
      setMigrateMsg(
        `Synced: ${report.created} created, ${report.updated} updated, ${report.skipped} skipped`,
      )
    } catch (err) {
      setMigrateMsg(err instanceof Error ? err.message : "Sync failed")
    }
  }

  async function onSyncMedia() {
    setMigrateMsg(null)
    try {
      const report = await syncJournalMedia.mutateAsync()
      setMigrateMsg(
        `Media: ${report.copied} copied, ${report.already_copied} already, ${report.missing} missing`,
      )
    } catch (err) {
      setMigrateMsg(err instanceof Error ? err.message : "Media sync failed")
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-card/70 p-3 backdrop-blur-xl md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
              Journal Timeline
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" disabled={migrateJournals.isPending} onClick={onSync}>
                {migrateJournals.isPending ? "Syncing…" : "Sync"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={syncJournalMedia.isPending}
                onClick={onSyncMedia}
              >
                {syncJournalMedia.isPending ? "…" : "Media"}
              </Button>
            </div>
          </div>

          <div className="mb-2 flex gap-2">
            <Input
              placeholder="Search journals…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAppliedQ(q.trim())
              }}
            />
            <Button type="button" size="sm" onClick={() => setAppliedQ(q.trim())}>
              Go
            </Button>
          </div>

          <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(e) => setFavoriteOnly(e.target.checked)}
            />
            Favorites only
          </label>
          {migrateMsg ? <p className="mb-2 text-xs text-muted-foreground">{migrateMsg}</p> : null}

          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : days.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No day journals yet. Import Obsidian notes into Knowledge, then Sync.
            </p>
          ) : (
            <ul className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
              {days.map((d, i) => {
                const active = d.id === selectedId
                return (
                  <li
                    key={d.id}
                    className="animate-in fade-in slide-in-from-left-1 fill-mode-both"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectDay(d.id)
                        setShowRaw(false)
                      }}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                        active
                          ? "border-emerald-500/35 bg-emerald-500/10"
                          : "border-transparent bg-background/30 hover:border-white/10 hover:bg-background/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{formatDateLabel(d.journal_date)}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {d.attachment_count > 0 ? (
                            <span className="text-[10px] text-muted-foreground">{d.attachment_count} img</span>
                          ) : null}
                          <GradePill grade={d.overall_grade} />
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {d.trade_count} trade{d.trade_count === 1 ? "" : "s"}
                        {d.daily_rating != null ? ` · ${Number(d.daily_rating).toFixed(2)}/10` : ""}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        {!selectedId ? (
          <div className="rounded-[1.35rem] border border-white/10 bg-card/70 p-6 text-sm text-muted-foreground backdrop-blur-xl">
            Select a day from the timeline.
          </div>
        ) : detailQuery.isLoading || !day ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-[1.35rem]" />
            <Skeleton className="h-56 w-full rounded-[1.35rem]" />
          </div>
        ) : (
          <>
            <DayHero day={day} showRaw={showRaw} onToggleRaw={() => setShowRaw((v) => !v)} />

            {showRaw ? (
              <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
                <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Raw markdown
                </h3>
                <MdBody text={day.raw_markdown} />
              </section>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                {day.trades.length > 0 ? (
                  <section className="space-y-3">
                    {day.trades.map((t) => (
                      <TradeBlock key={t.id} trade={t} dayBias={day.day_bias} defaultOpen={t.trade_index === 1} />
                    ))}
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">No trades parsed for this day.</p>
                )}

                {day.sections.length > 0 ? (
                  <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
                    <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Day review
                    </h3>
                    <div className="divide-y divide-white/8">
                      {day.sections.map((s) => (
                        <AccordionRow
                          key={s.id}
                          title={sectionLabel(s.section_key, s.heading_original)}
                        >
                          <MdBody text={s.body_markdown} />
                        </AccordionRow>
                      ))}
                    </div>
                  </section>
                ) : null}

                {day.attachments.length > 0 ? (
                  <OriginalNotebookViewer pages={day.attachments} />
                ) : null}

                {day.uncategorized_markdown?.trim() ? (
                  <section className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-4">
                    <h4 className="mb-2 font-semibold">Uncategorized</h4>
                    <MdBody text={day.uncategorized_markdown} />
                  </section>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
