/**
 * Dynamic Review Workspace — mockup-accurate single card:
 * Left sections | Center content + actions | Right Original Pages
 */
import { useEffect, useMemo, useState, type ComponentType } from "react"
import {
  CheckCircle2,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Pencil,
  RefreshCw,
  Save,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import type {
  ImportReviewDraft,
  ReviewDaySection,
  ReviewTrade,
} from "@/features/ai/importReviewTypes"
import type { ReviewEngineHandlers } from "@/features/ai/review/DynamicReviewEngine"
import { resolveModuleIcon } from "@/features/modules/moduleIcons"
import type { ReviewSectionDef } from "@/features/modules/types"
import { useModuleManifest } from "@/features/modules"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"

function matchDraftSections(def: ReviewSectionDef, sections: ReviewDaySection[]): ReviewDaySection[] {
  if (def.kind !== "content") return []
  const keys = def.matchKeys.map((k) => k.toLowerCase())
  const matched = sections.filter((s) => {
    const hay = `${s.section_key} ${s.heading}`.toLowerCase()
    return keys.some((k) => hay.includes(k))
  })
  if (matched.length) return matched
  if (keys.includes("uncategorized") && sections.length) return sections
  return []
}

export type DynamicReviewWorkspaceProps = {
  draft: ImportReviewDraft
  destination: string
  parserType: string
  dirty: boolean
  saving: boolean
  committed: boolean
  regeneratingId: string | null
  handlers: ReviewEngineHandlers
  onBack: () => void
  onSaveDraft: () => void
  onSave: () => void
  onChangeDestination: () => void
  jobId?: string
}

export function DynamicReviewWorkspace({
  draft,
  dirty,
  saving,
  committed,
  regeneratingId,
  handlers,
  onBack,
  onSaveDraft,
  onSave,
}: DynamicReviewWorkspaceProps) {
  const manifest = useModuleManifest()
  const sections = useMemo(
    () => [...(manifest.review.sections ?? [])].sort((a, b) => a.order - b.order),
    [manifest.review.sections],
  )
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "")
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set())
  const [selectedImageId, setSelectedImageId] = useState(draft.images[0]?.id ?? "")
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenZoom, setFullscreenZoom] = useState(1)

  useEffect(() => {
    if (!sections.some((s) => s.id === activeSectionId) && sections[0]) {
      setActiveSectionId(sections[0].id)
    }
  }, [sections, activeSectionId])

  useEffect(() => {
    if (!draft.images.some((i) => i.id === selectedImageId)) {
      setSelectedImageId(draft.images[0]?.id ?? "")
    }
  }, [draft.images, selectedImageId])

  const activeDef = sections.find((s) => s.id === activeSectionId) ?? sections[0]
  const selectedImage = draft.images.find((i) => i.id === selectedImageId) ?? draft.images[0]

  function toggleEdit(id: string) {
    setEditingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      {/* ONE card — matches mockup Review & Edit column */}
      <section
        className="overflow-hidden border shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
        style={{
          background: "var(--module-card)",
          borderColor: "var(--module-border)",
          borderRadius: "var(--module-radius)",
        }}
      >
        <div className="grid min-h-[32rem] lg:grid-cols-[11.5rem_minmax(0,1fr)_10.5rem]">
          {/* LEFT — section nav */}
          <aside className="border-b border-white/[0.06] p-3 lg:border-r lg:border-b-0">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {sections.map((sec) => {
                const Icon = resolveModuleIcon(sec.icon)
                const active = sec.id === activeDef?.id
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSectionId(sec.id)}
                    className={cn(
                      "flex min-w-[8.5rem] items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] transition-all duration-200 lg:min-w-0",
                      active ? "font-medium" : "text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      active
                        ? {
                            background: "var(--module-accent-soft)",
                            color: "var(--module-accent)",
                          }
                        : undefined
                    }
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                      style={
                        active
                          ? { background: "var(--module-accent)", color: "#0a0a0a" }
                          : { background: "rgba(255,255,255,0.04)" }
                      }
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="truncate">{sec.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* CENTER — content + bottom actions */}
          <main className="flex min-h-[24rem] flex-col border-b border-white/[0.06] p-4 md:p-5 lg:border-b-0 lg:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              {activeDef ? (
                <SectionCenter
                  def={activeDef}
                  draft={draft}
                  editingIds={editingIds}
                  regeneratingId={regeneratingId}
                  handlers={handlers}
                  onToggleEdit={toggleEdit}
                />
              ) : null}
            </div>

            {/* Bottom actions inside center — mockup */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg border-white/15 bg-transparent"
                onClick={onBack}
              >
                <ChevronLeft className="size-3.5" />
                Back
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-white/15 bg-transparent"
                  onClick={onSaveDraft}
                  disabled={!dirty}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 rounded-lg font-semibold"
                  onClick={onSave}
                  disabled={saving || committed}
                  style={{ background: "var(--module-accent)", color: "#0a0a0a" }}
                >
                  <Save className="size-3.5" />
                  {saving ? "Saving…" : manifest.import.review.saveLabel}
                </Button>
              </div>
            </div>
          </main>

          {/* RIGHT — Original Pages */}
          <aside className="flex flex-col gap-3 p-3 md:p-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              Original Pages ({draft.images.length})
            </p>
            {draft.images.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No pages</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {draft.images.map((img) => {
                  const active = img.id === selectedImage?.id
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedImageId(img.id)}
                      className={cn(
                        "aspect-[3/4] overflow-hidden rounded-lg border transition-all",
                        active ? "ring-1" : "opacity-85 hover:opacity-100",
                      )}
                      style={
                        active
                          ? {
                              borderColor: "var(--module-accent)",
                              boxShadow: `0 0 0 1px var(--module-accent)`,
                            }
                          : { borderColor: "rgba(255,255,255,0.1)" }
                      }
                    >
                      <img src={img.src} alt={img.file_name} className="h-full w-full object-cover" />
                    </button>
                  )
                })}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-auto w-full gap-1.5 rounded-lg border-white/15 text-xs"
              disabled={!selectedImage}
              onClick={() => {
                setFullscreenZoom(1)
                setFullscreen(true)
              }}
            >
              <Maximize2 className="size-3.5" />
              View Fullscreen
            </Button>
          </aside>
        </div>
      </section>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[95vh] w-[min(96vw,1100px)] max-w-none overflow-hidden border-white/[0.08] bg-[#0f1115] p-5 sm:rounded-2xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
            <div>
              <DialogTitle>{selectedImage?.file_name ?? "Notebook page"}</DialogTitle>
              <DialogDescription>Inspect the original scan.</DialogDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl"
                onClick={() => setFullscreenZoom(Math.max(0.5, Number((fullscreenZoom - 0.25).toFixed(2))))}
              >
                <ZoomOut />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl"
                onClick={() => setFullscreenZoom(Math.min(3, Number((fullscreenZoom + 0.25).toFixed(2))))}
              >
                <ZoomIn />
              </Button>
              <Button type="button" size="icon" variant="outline" className="rounded-xl" onClick={() => setFullscreen(false)}>
                <Minimize2 />
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[78vh] overflow-auto rounded-2xl border border-white/[0.08] bg-black/50">
            <div
              className="flex min-h-[60vh] items-center justify-center p-6 transition-transform duration-300"
              style={{ transform: `scale(${fullscreenZoom})`, transformOrigin: "center top" }}
            >
              {selectedImage ? (
                <img src={selectedImage.src} alt={selectedImage.file_name} className="max-w-full rounded-lg shadow-2xl" />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SectionCenter({
  def,
  draft,
  editingIds,
  regeneratingId,
  handlers,
  onToggleEdit,
}: {
  def: ReviewSectionDef
  draft: ImportReviewDraft
  editingIds: Set<string>
  regeneratingId: string | null
  handlers: ReviewEngineHandlers
  onToggleEdit: (id: string) => void
}) {
  const Icon = resolveModuleIcon(def.icon)
  const { setDraft, updateSection, updateTrade, regenerateSection } = handlers

  if (def.kind === "images") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p>Use Original Pages on the right to inspect scans.</p>
      </div>
    )
  }

  if (def.kind === "session") {
    const editing = editingIds.has("session")
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        <SectionTitle icon={Icon} label={def.label} />
        {!editing ? (
          <AiContentCard
            body={[
              draft.title && `Title: ${draft.title}`,
              draft.journal_date && `Date: ${draft.journal_date}`,
              draft.market && `Market: ${draft.market}`,
              draft.primary_instrument && `Instrument: ${draft.primary_instrument}`,
              draft.day_bias && `Bias: ${draft.day_bias}`,
              draft.overall_grade && `Grade: ${draft.overall_grade}`,
            ]
              .filter(Boolean)
              .join("\n") || "Session details not detected yet."}
            onEdit={() => onToggleEdit("session")}
          />
        ) : (
          <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/25 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["title", "Title", "text"],
                  ["journal_date", "Date", "date"],
                  ["market", "Market", "text"],
                  ["primary_instrument", "Instrument", "text"],
                  ["day_bias", "Bias", "text"],
                  ["overall_grade", "Grade", "text"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{label}</Label>
                  <Input
                    type={type}
                    value={draft[key]}
                    onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
                    className="h-9 rounded-lg border-white/10 bg-black/20"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => onToggleEdit("session")}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (def.kind === "trades") {
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        <SectionTitle icon={Icon} label={def.label} />
        {draft.trades.length === 0 ? (
          <EmptyBlock label="No trades detected" />
        ) : (
          draft.trades.map((trade) => (
            <TradeBlock
              key={trade.id}
              trade={trade}
              editing={editingIds.has(trade.id)}
              onToggleEdit={() => onToggleEdit(trade.id)}
              onUpdate={(patch) => updateTrade(trade.id, patch)}
            />
          ))
        )}
      </div>
    )
  }

  const matched = matchDraftSections(def, draft.sections)

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <SectionTitle icon={Icon} label={def.label} />
      {matched.length === 0 ? (
        <EmptyBlock label={`No ${def.label.toLowerCase()} content yet`} />
      ) : (
        matched.map((section) => {
          const editing = editingIds.has(section.id)
          const regenerating = regeneratingId === section.id
          if (editing) {
            return (
              <div key={section.id} className="space-y-3 rounded-xl border border-white/[0.08] bg-black/25 p-4">
                <Input
                  value={section.heading}
                  onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                  className="h-9 rounded-lg border-white/10 bg-transparent font-medium"
                />
                <textarea
                  value={section.body}
                  onChange={(e) => updateSection(section.id, { body: e.target.value })}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-white/20"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-lg"
                    disabled={regenerating}
                    onClick={() => regenerateSection("day", section.id)}
                  >
                    <RefreshCw className={cn("size-3.5", regenerating && "animate-spin")} />
                    Regenerate
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => onToggleEdit(section.id)}>
                    Done
                  </Button>
                </div>
              </div>
            )
          }
          return (
            <AiContentCard
              key={section.id}
              body={section.body.trim() || "No content detected yet."}
              onEdit={() => onToggleEdit(section.id)}
            />
          )
        })
      )}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Icon className="size-4" style={{ color: "var(--module-accent)" }} />
      <h2 className="text-base font-semibold tracking-tight">{label}</h2>
      <span
        className="rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
        style={{ background: "var(--module-accent-soft)", color: "var(--module-accent)" }}
      >
        AI Extracted
      </span>
    </div>
  )
}

/** Center content block with Edit control — matches mockup. */
function AiContentCard({ body, onEdit }: { body: string; onEdit: () => void }) {
  return (
    <div className="relative rounded-xl border border-white/[0.08] bg-black/30 p-4 md:p-5">
      <p className="whitespace-pre-wrap pr-16 text-sm leading-relaxed text-foreground/90">{body}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="absolute right-3 bottom-3 gap-1 rounded-lg border-white/15 bg-[#12151c]/90 text-xs"
        onClick={onEdit}
      >
        <Pencil className="size-3" />
        Edit
      </Button>
    </div>
  )
}

function TradeBlock({
  trade,
  editing,
  onToggleEdit,
  onUpdate,
}: {
  trade: ReviewTrade
  editing: boolean
  onToggleEdit: () => void
  onUpdate: (patch: Partial<ReviewTrade>) => void
}) {
  if (!editing) {
    return (
      <AiContentCard
        body={[
          `Trade ${trade.trade_index} · ${trade.instrument || "Untitled"}`,
          trade.direction && `Direction: ${trade.direction}`,
          trade.entry_price && `Entry: ${trade.entry_price}`,
          trade.exit_price && `Exit: ${trade.exit_price}`,
          trade.result && `Result: ${trade.result}`,
          trade.pnl && `PnL: ${trade.pnl}`,
        ]
          .filter(Boolean)
          .join("\n")}
        onEdit={onToggleEdit}
      />
    )
  }
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/25 p-4">
      <div className="grid gap-2 sm:grid-cols-3">
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
            <Label className="text-[11px] text-muted-foreground">{label}</Label>
            <Input
              value={trade[key]}
              onChange={(e) => onUpdate({ [key]: e.target.value })}
              className="h-9 rounded-lg border-white/10 bg-black/15"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={onToggleEdit}>
          Done
        </Button>
      </div>
    </div>
  )
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export function ReviewSuccessScreen({
  moduleName,
  title,
  ctaLabel,
  onContinue,
}: {
  moduleName: string
  title: string
  ctaLabel: string
  onContinue: () => void
}) {
  return (
    <section
      className="mx-auto flex max-w-md flex-col items-center gap-5 border px-8 py-12 text-center animate-in fade-in zoom-in-95 duration-500"
      style={{
        background: "var(--module-card)",
        borderColor: "var(--module-border)",
        borderRadius: "var(--module-radius)",
      }}
    >
      <div
        className="flex size-20 items-center justify-center rounded-full"
        style={{ background: "var(--module-accent-soft)", color: "var(--module-accent)" }}
      >
        <CheckCircle2 className="size-10" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm" style={{ color: "var(--module-muted)" }}>
          Your {moduleName.toLowerCase()} {moduleName.toLowerCase().endsWith("s") ? "have" : "has"} been saved.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        className="rounded-xl px-8 font-semibold"
        style={{ background: "var(--module-accent)", color: "#0a0a0a" }}
        onClick={onContinue}
      >
        {ctaLabel}
      </Button>
    </section>
  )
}
