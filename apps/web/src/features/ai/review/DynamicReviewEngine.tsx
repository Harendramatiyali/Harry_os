/**
 * Metadata-driven Review Engine — one shell, parser-specific field renderers.
 * Named DynamicReviewEngine to avoid colliding with reviewEngine.ts on case-insensitive FS.
 */
import type { ReactNode } from "react"

import type { ImportReviewDraft, ReviewDaySection, ReviewTrade, ReviewTradeSection } from "@/features/ai/importReviewTypes"
import type { ReviewFieldOut } from "@/features/ai/importTypes"
import {
  fieldsByGroup,
  isTradingReviewSchema,
  type ReviewFieldMeta,
} from "@/features/ai/review/reviewEngine"
import { TradingReviewFields } from "@/features/ai/review/TradingReviewFields"
import { GenericReviewFields } from "@/features/ai/review/GenericReviewFields"

export type ReviewEngineHandlers = {
  setDraft: (updater: (prev: ImportReviewDraft | null) => ImportReviewDraft | null) => void
  updateSection: (id: string, patch: Partial<ReviewDaySection>) => void
  updateTrade: (id: string, patch: Partial<ReviewTrade>) => void
  updateTradeSection: (
    tradeId: string,
    sectionId: string,
    patch: Partial<ReviewTradeSection>,
  ) => void
  regenerateSection: (kind: "day" | "trade", id: string, tradeId?: string) => void
  regeneratingId: string | null
}

export function ReviewEngine({
  draft,
  reviewFields,
  parserType,
  handlers,
  confidenceSlot,
}: {
  draft: ImportReviewDraft
  reviewFields?: ReviewFieldOut[] | ReviewFieldMeta[] | null
  parserType?: string | null
  handlers: ReviewEngineHandlers
  confidenceSlot?: ReactNode
}) {
  const fields = (reviewFields ?? []) as ReviewFieldMeta[]
  const trading =
    parserType === "trading" || isTradingReviewSchema(fields) || fields.length === 0

  return (
    <div className="space-y-6">
      {confidenceSlot}
      {trading ? (
        <TradingReviewFields draft={draft} handlers={handlers} />
      ) : (
        <GenericReviewFields
          draft={draft}
          fields={fields}
          groups={fieldsByGroup(fields)}
          handlers={handlers}
        />
      )}
    </div>
  )
}
