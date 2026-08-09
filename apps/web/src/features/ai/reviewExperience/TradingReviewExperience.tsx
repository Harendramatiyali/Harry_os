/**
 * Phase 3 — Trading Review Experience connected to live import draft.
 */
import { useMemo, useState } from "react"
import { CandlestickChart, CheckCircle2 } from "lucide-react"

import type { ImportReviewDraft, ReviewDaySection, ReviewTrade } from "@/features/ai/importReviewTypes"
import { ReviewBottomBar } from "@/features/ai/reviewExperience/ReviewBottomBar"
import { ReviewExperienceShell } from "@/features/ai/reviewExperience/ReviewExperienceShell"
import { ReviewHeader } from "@/features/ai/reviewExperience/ReviewHeader"
import { ReviewNotebookViewer } from "@/features/ai/reviewExperience/ReviewNotebookViewer"
import { ReviewSectionCard } from "@/features/ai/reviewExperience/ReviewSectionCard"
import { ReviewSectionSidebar } from "@/features/ai/reviewExperience/ReviewSectionSidebar"
import {
  formatReviewDate,
  resolveContentSections,
  sectionToCardModel,
  sessionCardModel,
  tradeCardModels,
} from "@/features/ai/reviewExperience/mapDraftToCards"
import type {
  ReviewNotebookPage,
  ReviewSectionCardModel,
  ReviewSectionItem,
} from "@/features/ai/reviewExperience/types"
import { TRADING_SECTIONS } from "@/features/modules/manifests/reviewSections"
import { resolveModuleIcon } from "@/features/modules/moduleIcons"
import { Button } from "@/shared/ui/button"

const TRADING_NAV: ReviewSectionItem[] = [
  ...TRADING_SECTIONS.filter((s) => s.kind !== "images").map((s) => ({
    id: s.id,
    label: s.label,
    icon: resolveModuleIcon(s.icon),
  })),
  { id: "notebook", label: "Notebook", icon: resolveModuleIcon("Notebook") },
]

function applyLabeledSessionEdit(value: string, draft: ImportReviewDraft): Partial<ImportReviewDraft> {
  const patch: Partial<ImportReviewDraft> = {}
  const map: Record<string, keyof ImportReviewDraft> = {
    title: "title",
    date: "journal_date",
    market: "market",
    instrument: "primary_instrument",
    bias: "day_bias",
    grade: "overall_grade",
    result: "day_result",
  }
  for (const line of value.split("\n")) {
    const m = line.match(/^([A-Za-z]+):\s*(.*)$/)
    if (!m) continue
    const key = map[m[1]!.toLowerCase()]
    if (key && typeof draft[key] === "string") {
      ;(patch as Record<string, string>)[key] = m[2] ?? ""
    }
  }
  if (Object.keys(patch).length === 0) {
    patch.title = value.trim()
  }
  return patch
}

export function TradingReviewExperience({
  draft,
  saving,
  committed,
  regeneratingId,
  onBack,
  onChangeDestination,
  onKeepForLater,
  onAddToHarryOs,
  onUpdateSection,
  onUpdateTrade,
  onPatchDraft,
  onRegenerate,
}: {
  draft: ImportReviewDraft
  saving: boolean
  committed: boolean
  regeneratingId: string | null
  onBack: () => void
  onChangeDestination: () => void
  onKeepForLater: () => void
  onAddToHarryOs: () => void
  onUpdateSection: (id: string, patch: Partial<ReviewDaySection>) => void
  onUpdateTrade: (id: string, patch: Partial<ReviewTrade>) => void
  onPatchDraft: (patch: Partial<ImportReviewDraft>) => void
  onRegenerate: (kind: "day" | "trade", id: string, tradeId?: string) => void
}) {
  const [activeSectionId, setActiveSectionId] = useState(TRADING_NAV[0]?.id ?? "market_context")
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  const notebookPages: ReviewNotebookPage[] = useMemo(
    () =>
      draft.images.map((img) => ({
        id: img.id,
        label: img.file_name || `Page ${img.page_index + 1}`,
        src: img.src,
      })),
    [draft.images],
  )

  const activeDef = TRADING_SECTIONS.find((s) => s.id === activeSectionId)

  const centerCards: ReviewSectionCardModel[] = useMemo(() => {
    if (activeSectionId === "notebook") return []
    if (activeSectionId === "session") return [sessionCardModel(draft)]
    if (activeSectionId === "trades") return tradeCardModels(draft)
    if (!activeDef || activeDef.kind !== "content") return []

    const matched = resolveContentSections(activeDef, TRADING_SECTIONS, draft.sections)
    if (!matched.length) {
      return [
        {
          id: `${activeDef.id}-empty`,
          title: activeDef.label,
          summary: `No ${activeDef.label.toLowerCase()} content detected yet.`,
          confidence: draft.confidence.overall,
          icon: resolveModuleIcon(activeDef.icon),
        },
      ]
    }
    return matched.map((section) => {
      const model = sectionToCardModel(section)
      return {
        ...model,
        title: section.heading || activeDef.label,
        icon: resolveModuleIcon(activeDef.icon),
      }
    })
  }, [activeSectionId, activeDef, draft])

  return (
    <ReviewExperienceShell
      moduleId="trading"
      header={
        <ReviewHeader
          model={{
            moduleId: "trading",
            moduleName: "Trading",
            moduleIcon: CandlestickChart,
            title: draft.title || "Untitled session",
            dateLabel: formatReviewDate(draft.journal_date),
            confidence: draft.confidence.overall,
            destinationLabel: "Trading",
          }}
          onChangeDestination={onChangeDestination}
        />
      }
      sidebar={
        <ReviewSectionSidebar
          moduleName="Trading"
          moduleIcon={CandlestickChart}
          sections={TRADING_NAV}
          activeSectionId={activeSectionId}
          onSelectSection={setActiveSectionId}
        />
      }
      center={
        activeSectionId === "notebook" ? (
          <div className="re-card flex min-h-[240px] items-center justify-center p-8">
            <p className="re-caption text-center">
              Use the Original Notebook panel on the right to inspect pages.
            </p>
          </div>
        ) : (
          centerCards.map((card) => {
            const isSession = card.id === "session"
            const isTrade = draft.trades.some((t) => t.id === card.id)
            const isEmpty = card.id.endsWith("-empty") || card.id === "trades-empty"
            const daySection = draft.sections.find((s) => s.id === card.id)

            const summaryValue = isSession
              ? sessionCardModel(draft).summary
              : isTrade
                ? tradeCardModels(draft).find((t) => t.id === card.id)?.summary ?? card.summary
                : (daySection?.body ?? card.summary)

            return (
              <ReviewSectionCard
                key={card.id}
                model={{ ...card, accepted: Boolean(accepted[card.id]) }}
                summaryValue={summaryValue}
                regenerating={regeneratingId === card.id}
                onAccept={() => setAccepted((prev) => ({ ...prev, [card.id]: true }))}
                onRegenerate={() => {
                  if (isEmpty) return
                  if (isTrade) {
                    const trade = draft.trades.find((t) => t.id === card.id)
                    onRegenerate("trade", trade?.sections[0]?.id ?? card.id, card.id)
                    return
                  }
                  if (isSession) {
                    onRegenerate("day", draft.sections[0]?.id ?? "session")
                    return
                  }
                  onRegenerate("day", card.id)
                }}
                onSummaryChange={(value) => {
                  if (isEmpty) return
                  if (isSession) {
                    onPatchDraft(applyLabeledSessionEdit(value, draft))
                    return
                  }
                  if (isTrade) {
                    onUpdateTrade(card.id, { result: value })
                    return
                  }
                  onUpdateSection(card.id, { body: value })
                }}
              />
            )
          })
        )
      }
      notebook={<ReviewNotebookViewer pages={notebookPages} />}
      bottomBar={
        <ReviewBottomBar
          onBack={onBack}
          onKeepForLater={onKeepForLater}
          onAddToHarryOs={onAddToHarryOs}
          busy={saving || committed}
          primaryLabel="Add To Harry OS"
          keepLabel="Keep For Later"
        />
      }
    />
  )
}

export function TradingReviewSuccess({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="review-experience" data-module="trading">
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-16 text-center">
        <div
          className="flex size-20 items-center justify-center rounded-full"
          style={{ background: "var(--re-accent-soft)", color: "var(--re-accent)" }}
        >
          <CheckCircle2 className="size-10" />
        </div>
        <div className="space-y-2">
          <h1 className="re-title text-[28px]">Successfully Saved!</h1>
          <p className="re-body" style={{ color: "var(--re-muted)" }}>
            Your trading journal has been saved.
          </p>
        </div>
        <Button
          type="button"
          className="h-11 rounded-[12px] px-8 font-semibold"
          style={{ background: "var(--re-accent)", color: "#0a0a0a" }}
          onClick={onContinue}
        >
          View in Trading
        </Button>
      </div>
    </div>
  )
}
