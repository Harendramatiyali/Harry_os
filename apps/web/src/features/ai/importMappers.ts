import type { ImportReviewDraft } from "@/features/ai/importReviewTypes"
import type {
  ConfidenceMap,
  ImportPageOut,
  JournalDraft,
  JournalDraftTrade,
} from "@/features/ai/importTypes"

function numOrEmpty(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return ""
  return String(v)
}

function parseOptionalNumber(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  return t
}

export function pageFileUrl(pageId: string, accessToken: string): string {
  return `/api/v1/ai/imports/pages/${pageId}/file?access_token=${encodeURIComponent(accessToken)}`
}

export function cloneImportReviewDraft(draft: ImportReviewDraft): ImportReviewDraft {
  return structuredClone(draft)
}

function normalizeDirection(v: string | null | undefined): "long" | "short" | "" {
  const s = (v ?? "").trim().toLowerCase()
  if (s === "long" || s === "short") return s
  return ""
}

export function mapApiToReviewDraft(opts: {
  jobId: string
  draft: JournalDraft
  confidence: ConfidenceMap | null | undefined
  pages: ImportPageOut[]
  accessToken: string
}): ImportReviewDraft {
  const { jobId, draft, confidence, pages, accessToken } = opts
  const sortedPages = [...pages].sort((a, b) => a.page_index - b.page_index)

  return {
    job_id: jobId,
    title: draft.title ?? "",
    journal_date: draft.journal_date,
    market: draft.market ?? "",
    primary_instrument: draft.primary_instrument ?? "",
    day_bias: draft.day_bias ?? "",
    day_result: draft.day_result ?? "",
    overall_grade: draft.overall_grade ?? "",
    confidence: {
      overall: confidence?.overall ?? 0,
      journal_date: confidence?.journal_date ?? 0,
      fields: { ...(confidence?.fields ?? {}) },
      notes: confidence?.notes ?? "",
    },
    images: sortedPages.map((p) => ({
      id: p.id,
      page_index: p.page_index,
      file_name: p.original_file_name ?? `page-${p.page_index + 1}`,
      src: pageFileUrl(p.id, accessToken),
    })),
    sections: [...draft.sections]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s, i) => ({
        id: `sec-${s.section_key}-${i}`,
        section_key: s.section_key,
        heading: s.heading_original ?? s.section_key,
        body: s.body_markdown ?? "",
        confidence: s.confidence ?? 0.5,
      })),
    trades: [...draft.trades]
      .sort((a, b) => a.trade_index - b.trade_index)
      .map((t) => ({
        id: `tr-${t.trade_index}`,
        trade_index: t.trade_index,
        instrument: t.instrument ?? "",
        direction: normalizeDirection(t.direction),
        quantity: numOrEmpty(t.quantity),
        entry_price: numOrEmpty(t.entry_price),
        exit_price: numOrEmpty(t.exit_price),
        result: t.result ?? "",
        pnl: numOrEmpty(t.pnl),
        grade: t.grade ?? "",
        confidence: t.confidence ?? 0.5,
        attachment_page_ids: [...(t.attachment_page_ids ?? [])],
        sections: [...(t.sections ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((s, i) => ({
            id: `tr-${t.trade_index}-sec-${s.section_key}-${i}`,
            section_key: s.section_key,
            heading: s.heading_original ?? s.section_key,
            body: s.body_markdown ?? "",
            confidence: s.confidence ?? 0.5,
          })),
      })),
    day_attachment_page_ids: [...(draft.day_attachment_page_ids ?? [])],
    tags: [...(draft.tags ?? [])],
    uncategorized_markdown: draft.uncategorized_markdown ?? null,
    day_pnl: numOrEmpty(draft.day_pnl) || null,
  }
}

export function mapReviewDraftToApi(draft: ImportReviewDraft): JournalDraft {
  const dayAttachmentIds =
    draft.day_attachment_page_ids?.length
      ? draft.day_attachment_page_ids
      : draft.images.map((i) => i.id)

  const trades: JournalDraftTrade[] = draft.trades.map((t) => ({
    trade_index: t.trade_index,
    title_suffix: null,
    instrument: t.instrument.trim() || null,
    direction: t.direction || null,
    quantity: parseOptionalNumber(t.quantity),
    entry_price: parseOptionalNumber(t.entry_price),
    exit_price: parseOptionalNumber(t.exit_price),
    stop_price: null,
    result: t.result.trim() || null,
    pnl: parseOptionalNumber(t.pnl),
    setup: null,
    grade: t.grade.trim() || null,
    dqs_score: null,
    dqs_max: null,
    raw_markdown: "",
    sections: t.sections.map((s, i) => ({
      section_key: s.section_key,
      heading_original: s.heading.trim() || null,
      body_markdown: s.body,
      sort_order: i,
      confidence: s.confidence,
    })),
    attachment_page_ids: t.attachment_page_ids ?? [],
    confidence: t.confidence,
  }))

  return {
    journal_date: draft.journal_date,
    title: draft.title.trim() || null,
    market: draft.market.trim() || null,
    primary_instrument: draft.primary_instrument.trim() || null,
    day_bias: draft.day_bias.trim() || null,
    day_result: draft.day_result.trim() || null,
    day_pnl: draft.day_pnl ?? null,
    daily_rating: null,
    overall_grade: draft.overall_grade.trim() || null,
    tags: draft.tags ?? [],
    uncategorized_markdown: draft.uncategorized_markdown ?? null,
    sections: draft.sections.map((s, i) => ({
      section_key: s.section_key,
      heading_original: s.heading.trim() || null,
      body_markdown: s.body,
      sort_order: i,
      confidence: s.confidence,
    })),
    trades,
    day_attachment_page_ids: dayAttachmentIds,
  }
}
