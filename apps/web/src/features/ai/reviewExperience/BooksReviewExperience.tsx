/**
 * Phase 4 — Books Review Experience connected to live import draft.
 */
import { useMemo, useState } from "react"
import { BookOpen, CheckCircle2 } from "lucide-react"

import type { ImportReviewDraft, ReviewDaySection, ReviewTrade } from "@/features/ai/importReviewTypes"
import { ReviewBottomBar } from "@/features/ai/reviewExperience/ReviewBottomBar"
import { ReviewExperienceShell } from "@/features/ai/reviewExperience/ReviewExperienceShell"
import { ReviewHeader } from "@/features/ai/reviewExperience/ReviewHeader"
import { ReviewNotebookViewer } from "@/features/ai/reviewExperience/ReviewNotebookViewer"
import { ReviewSectionCard } from "@/features/ai/reviewExperience/ReviewSectionCard"
import { ReviewSectionSidebar } from "@/features/ai/reviewExperience/ReviewSectionSidebar"
import {
  applyLabeledBookInfoEdit,
  bookInfoCardModel,
  formatReviewDate,
  resolveContentSections,
  sectionToCardModel,
} from "@/features/ai/reviewExperience/mapDraftToCards"
import type {
  ReviewNotebookPage,
  ReviewSectionCardModel,
  ReviewSectionItem,
} from "@/features/ai/reviewExperience/types"
import { BOOKS_SECTIONS } from "@/features/modules/manifests/reviewSections"
import { resolveModuleIcon } from "@/features/modules/moduleIcons"
import { Button } from "@/shared/ui/button"

const BOOKS_NAV: ReviewSectionItem[] = [
  ...BOOKS_SECTIONS.filter((s) => s.kind !== "images").map((s) => ({
    id: s.id,
    label: s.label,
    icon: resolveModuleIcon(s.icon),
  })),
  { id: "notebook", label: "Notebook", icon: resolveModuleIcon("Notebook") },
]

export function BooksReviewExperience({
  draft,
  saving,
  committed,
  regeneratingId,
  onBack,
  onChangeDestination,
  onKeepForLater,
  onAddToHarryOs,
  onUpdateSection,
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
  onUpdateTrade?: (id: string, patch: Partial<ReviewTrade>) => void
  onPatchDraft: (patch: Partial<ImportReviewDraft>) => void
  onRegenerate: (kind: "day" | "trade", id: string, tradeId?: string) => void
}) {
  const [activeSectionId, setActiveSectionId] = useState(BOOKS_NAV[0]?.id ?? "session")
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

  const activeDef = BOOKS_SECTIONS.find((s) => s.id === activeSectionId)

  const centerCards: ReviewSectionCardModel[] = useMemo(() => {
    if (activeSectionId === "notebook") return []
    if (activeSectionId === "session") return [bookInfoCardModel(draft)]
    if (!activeDef || activeDef.kind !== "content") return []

    const matched = resolveContentSections(activeDef, BOOKS_SECTIONS, draft.sections)
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
    return matched.map((section) => ({
      ...sectionToCardModel(section),
      title: section.heading || activeDef.label,
      icon: resolveModuleIcon(activeDef.icon),
    }))
  }, [activeSectionId, activeDef, draft])

  return (
    <ReviewExperienceShell
      moduleId="books"
      header={
        <ReviewHeader
          model={{
            moduleId: "books",
            moduleName: "Books",
            moduleIcon: BookOpen,
            title: draft.title || "Untitled book notes",
            dateLabel: formatReviewDate(draft.journal_date),
            confidence: draft.confidence.overall,
            destinationLabel: "Books",
          }}
          onChangeDestination={onChangeDestination}
        />
      }
      sidebar={
        <ReviewSectionSidebar
          moduleName="Books"
          moduleIcon={BookOpen}
          sections={BOOKS_NAV}
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
            const isEmpty = card.id.endsWith("-empty")
            const daySection = draft.sections.find((s) => s.id === card.id)
            const summaryValue = isSession
              ? bookInfoCardModel(draft).summary
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
                  if (isSession) {
                    onRegenerate("day", draft.sections[0]?.id ?? "session")
                    return
                  }
                  onRegenerate("day", card.id)
                }}
                onSummaryChange={(value) => {
                  if (isEmpty) return
                  if (isSession) {
                    onPatchDraft(applyLabeledBookInfoEdit(value, draft))
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

export function BooksReviewSuccess({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="review-experience" data-module="books">
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
            Your book notes have been saved.
          </p>
        </div>
        <Button
          type="button"
          className="h-11 rounded-[12px] px-8 font-semibold"
          style={{ background: "var(--re-accent)", color: "#0a0a0a" }}
          onClick={onContinue}
        >
          View in Books
        </Button>
      </div>
    </div>
  )
}
