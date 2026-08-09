import type { ImportReviewDraft, ReviewDaySection, ReviewTrade, ReviewTradeSection } from "@/features/ai/importReviewTypes"
import type { ReviewEngineHandlers } from "@/features/ai/review/DynamicReviewEngine"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { RefreshCw } from "lucide-react"

function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const tone =
    value >= 0.75 ? "text-emerald-300" : value >= 0.5 ? "text-amber-200" : "text-rose-300"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tone,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {pct}%
    </span>
  )
}

function SectionEditor({
  heading,
  body,
  confidence,
  regenerating,
  onHeadingChange,
  onBodyChange,
  onRegenerate,
}: {
  heading: string
  body: string
  confidence: number
  regenerating: boolean
  onHeadingChange: (v: string) => void
  onBodyChange: (v: string) => void
  onRegenerate: () => void
}) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition-all duration-300 hover:border-white/15 hover:bg-black/25">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Input
          value={heading}
          onChange={(e) => onHeadingChange(e.target.value)}
          className="h-9 max-w-md rounded-xl border-white/10 bg-transparent font-medium"
          aria-label="Section heading"
        />
        <div className="flex items-center gap-2">
          <ConfidenceChip value={confidence} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={regenerating}
            onClick={onRegenerate}
            className="gap-1.5 rounded-xl"
          >
            <RefreshCw className={cn("size-3.5", regenerating && "animate-spin")} />
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={4}
        className={cn(
          "w-full resize-y rounded-xl border border-white/[0.08] bg-card/30 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition duration-200",
          "focus:border-white/20 focus:ring-2 focus:ring-white/10",
          regenerating && "opacity-60",
        )}
        aria-label={`${heading} body`}
      />
    </article>
  )
}

export function TradingReviewFields({
  draft,
  handlers,
}: {
  draft: ImportReviewDraft
  handlers: ReviewEngineHandlers
}) {
  const { setDraft, updateSection, updateTrade, updateTradeSection, regenerateSection, regeneratingId } =
    handlers

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rev-title" className="text-[11px] tracking-wide text-muted-foreground">
            Title
          </Label>
          <Input
            id="rev-title"
            value={draft.title}
            onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rev-date" className="text-[11px] tracking-wide text-muted-foreground">
            Journal date
          </Label>
          <Input
            id="rev-date"
            type="date"
            value={draft.journal_date}
            onChange={(e) => setDraft((d) => (d ? { ...d, journal_date: e.target.value } : d))}
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rev-market" className="text-[11px] tracking-wide text-muted-foreground">
            Market
          </Label>
          <Input
            id="rev-market"
            value={draft.market}
            onChange={(e) => setDraft((d) => (d ? { ...d, market: e.target.value } : d))}
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rev-instrument" className="text-[11px] tracking-wide text-muted-foreground">
            Primary instrument
          </Label>
          <Input
            id="rev-instrument"
            value={draft.primary_instrument}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, primary_instrument: e.target.value } : d))
            }
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rev-bias" className="text-[11px] tracking-wide text-muted-foreground">
            Day bias
          </Label>
          <Input
            id="rev-bias"
            value={draft.day_bias}
            onChange={(e) => setDraft((d) => (d ? { ...d, day_bias: e.target.value } : d))}
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rev-grade" className="text-[11px] tracking-wide text-muted-foreground">
            Overall grade
          </Label>
          <Input
            id="rev-grade"
            value={draft.overall_grade}
            onChange={(e) => setDraft((d) => (d ? { ...d, overall_grade: e.target.value } : d))}
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
      </div>

      <div className="space-y-3.5">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          Day sections
        </h3>
        {draft.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No day sections in this draft.</p>
        ) : (
          draft.sections.map((section: ReviewDaySection) => (
            <SectionEditor
              key={section.id}
              heading={section.heading}
              body={section.body}
              confidence={section.confidence}
              regenerating={regeneratingId === section.id}
              onHeadingChange={(heading) => updateSection(section.id, { heading })}
              onBodyChange={(body) => updateSection(section.id, { body })}
              onRegenerate={() => regenerateSection("day", section.id)}
            />
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          Trades
        </h3>
        {draft.trades.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trades detected in this draft.</p>
        ) : (
          draft.trades.map((trade: ReviewTrade) => (
            <div
              key={trade.id}
              className="space-y-3.5 rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition-colors duration-300 hover:border-white/12"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold tracking-tight">
                  Trade {trade.trade_index}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {trade.instrument || "Untitled"}
                  </span>
                </p>
                <ConfidenceChip value={trade.confidence} />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {(
                  [
                    ["instrument", "Instrument"],
                    ["direction", "Direction"],
                    ["quantity", "Qty"],
                    ["entry_price", "Entry"],
                    ["exit_price", "Exit"],
                    ["result", "Result"],
                    ["pnl", "PnL"],
                    ["grade", "Grade"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[11px] tracking-wide text-muted-foreground">{label}</Label>
                    <Input
                      value={trade[key]}
                      onChange={(e) => updateTrade(trade.id, { [key]: e.target.value })}
                      className="h-9 rounded-xl border-white/10 bg-black/15"
                    />
                  </div>
                ))}
              </div>
              {trade.sections.map((section: ReviewTradeSection) => (
                <SectionEditor
                  key={section.id}
                  heading={section.heading}
                  body={section.body}
                  confidence={section.confidence}
                  regenerating={regeneratingId === section.id}
                  onHeadingChange={(heading) =>
                    updateTradeSection(trade.id, section.id, { heading })
                  }
                  onBodyChange={(body) => updateTradeSection(trade.id, section.id, { body })}
                  onRegenerate={() => regenerateSection("trade", section.id, trade.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  )
}
