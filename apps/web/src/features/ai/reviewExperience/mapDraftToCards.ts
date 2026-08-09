import type { ImportReviewDraft, ReviewDaySection } from "@/features/ai/importReviewTypes"
import type { ReviewSectionCardModel } from "@/features/ai/reviewExperience/types"
import { resolveModuleIcon } from "@/features/modules/moduleIcons"
import type { ReviewSectionDef } from "@/features/modules/types"

export function formatReviewDate(value: string | null | undefined): string {
  if (!value) return "No date"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function matchSectionsForDef(
  def: ReviewSectionDef,
  sections: ReviewDaySection[],
): ReviewDaySection[] {
  if (def.kind !== "content") return []
  const keys = def.matchKeys.map((k) => k.toLowerCase())
  const matched = sections.filter((s) => {
    const hay = `${s.section_key} ${s.heading}`.toLowerCase()
    return keys.some((k) => hay.includes(k))
  })
  if (matched.length) return matched
  if (keys.includes("uncategorized") && sections.length) {
    // Catch-all only when no other content section would claim them — used for market_context
    return sections
  }
  return []
}

/** Prefer exact key matches; for catch-all sections exclude ones claimed by sibling defs. */
export function resolveContentSections(
  def: ReviewSectionDef,
  allDefs: ReviewSectionDef[],
  sections: ReviewDaySection[],
): ReviewDaySection[] {
  if (def.kind !== "content") return []
  const keys = def.matchKeys.map((k) => k.toLowerCase())
  const exact = sections.filter((s) => {
    const hay = `${s.section_key} ${s.heading}`.toLowerCase()
    return keys.filter((k) => k !== "uncategorized").some((k) => hay.includes(k))
  })
  if (exact.length) return exact

  if (!keys.includes("uncategorized")) return []

  const claimed = new Set<string>()
  for (const other of allDefs) {
    if (other.id === def.id || other.kind !== "content") continue
    const otherKeys = other.matchKeys
      .filter((k) => k !== "uncategorized")
      .map((k) => k.toLowerCase())
    for (const s of sections) {
      const hay = `${s.section_key} ${s.heading}`.toLowerCase()
      if (otherKeys.some((k) => hay.includes(k))) claimed.add(s.id)
    }
  }
  return sections.filter((s) => !claimed.has(s.id))
}

export function sectionToCardModel(section: ReviewDaySection): ReviewSectionCardModel {
  return {
    id: section.id,
    title: section.heading || "Untitled",
    summary: section.body?.trim() || "No content detected yet.",
    confidence: section.confidence ?? 0.5,
    icon: resolveModuleIcon("AlignLeft"),
  }
}

export function sessionCardModel(draft: ImportReviewDraft): ReviewSectionCardModel {
  const lines = [
    draft.title && `Title: ${draft.title}`,
    draft.journal_date && `Date: ${draft.journal_date}`,
    draft.market && `Market: ${draft.market}`,
    draft.primary_instrument && `Instrument: ${draft.primary_instrument}`,
    draft.day_bias && `Bias: ${draft.day_bias}`,
    draft.overall_grade && `Grade: ${draft.overall_grade}`,
    draft.day_result && `Result: ${draft.day_result}`,
  ].filter(Boolean)

  return {
    id: "session",
    title: "Session",
    summary: lines.join("\n") || "Session details not detected yet.",
    confidence: draft.confidence.overall,
    icon: resolveModuleIcon("Calendar"),
  }
}

/** Book Info card — same draft fields, reading-oriented labels. */
export function bookInfoCardModel(draft: ImportReviewDraft): ReviewSectionCardModel {
  const lines = [
    draft.title && `Book: ${draft.title}`,
    draft.market && `Author: ${draft.market}`,
    draft.journal_date && `Date: ${draft.journal_date}`,
    draft.primary_instrument && `Chapter: ${draft.primary_instrument}`,
    draft.day_bias && `Theme: ${draft.day_bias}`,
    draft.overall_grade && `Rating: ${draft.overall_grade}`,
  ].filter(Boolean)

  return {
    id: "session",
    title: "Book Info",
    summary: lines.join("\n") || "Book details not detected yet.",
    confidence: draft.confidence.overall,
    icon: resolveModuleIcon("BookOpen"),
  }
}

export function applyLabeledBookInfoEdit(
  value: string,
  draft: ImportReviewDraft,
): Partial<ImportReviewDraft> {
  const patch: Partial<ImportReviewDraft> = {}
  const map: Record<string, keyof ImportReviewDraft> = {
    book: "title",
    title: "title",
    author: "market",
    date: "journal_date",
    chapter: "primary_instrument",
    theme: "day_bias",
    rating: "overall_grade",
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

/** Finance Overview card — ledger-oriented labels. */
export function financeOverviewCardModel(draft: ImportReviewDraft): ReviewSectionCardModel {
  const lines = [
    draft.title && `Title: ${draft.title}`,
    draft.journal_date && `Date: ${draft.journal_date}`,
    draft.market && `Market: ${draft.market}`,
    draft.primary_instrument && `Asset: ${draft.primary_instrument}`,
    draft.day_bias && `Bias: ${draft.day_bias}`,
    draft.overall_grade && `Conviction: ${draft.overall_grade}`,
  ].filter(Boolean)

  return {
    id: "session",
    title: "Overview",
    summary: lines.join("\n") || "Finance overview not detected yet.",
    confidence: draft.confidence.overall,
    icon: resolveModuleIcon("Wallet"),
  }
}

export function applyLabeledFinanceOverviewEdit(
  value: string,
  draft: ImportReviewDraft,
): Partial<ImportReviewDraft> {
  const patch: Partial<ImportReviewDraft> = {}
  const map: Record<string, keyof ImportReviewDraft> = {
    title: "title",
    date: "journal_date",
    market: "market",
    asset: "primary_instrument",
    bias: "day_bias",
    conviction: "overall_grade",
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

/** Career Meeting Info card. */
export function careerMeetingCardModel(draft: ImportReviewDraft): ReviewSectionCardModel {
  const lines = [
    draft.title && `Meeting: ${draft.title}`,
    draft.journal_date && `Date: ${draft.journal_date}`,
    draft.market && `Team: ${draft.market}`,
    draft.primary_instrument && `Project: ${draft.primary_instrument}`,
    draft.day_bias && `Focus: ${draft.day_bias}`,
    draft.overall_grade && `Priority: ${draft.overall_grade}`,
  ].filter(Boolean)

  return {
    id: "session",
    title: "Meeting Info",
    summary: lines.join("\n") || "Meeting details not detected yet.",
    confidence: draft.confidence.overall,
    icon: resolveModuleIcon("Briefcase"),
  }
}

export function applyLabeledCareerMeetingEdit(
  value: string,
  draft: ImportReviewDraft,
): Partial<ImportReviewDraft> {
  const patch: Partial<ImportReviewDraft> = {}
  const map: Record<string, keyof ImportReviewDraft> = {
    meeting: "title",
    title: "title",
    date: "journal_date",
    team: "market",
    project: "primary_instrument",
    focus: "day_bias",
    priority: "overall_grade",
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

export function tradeCardModels(draft: ImportReviewDraft): ReviewSectionCardModel[] {
  if (!draft.trades.length) {
    return [
      {
        id: "trades-empty",
        title: "Trades",
        summary: "No trades detected in this draft.",
        confidence: draft.confidence.overall,
        icon: resolveModuleIcon("CandlestickChart"),
      },
    ]
  }
  return draft.trades.map((trade) => ({
    id: trade.id,
    title: `Trade ${trade.trade_index} · ${trade.instrument || "Untitled"}`,
    summary: [
      trade.direction && `Direction: ${trade.direction}`,
      trade.quantity && `Qty: ${trade.quantity}`,
      trade.entry_price && `Entry: ${trade.entry_price}`,
      trade.exit_price && `Exit: ${trade.exit_price}`,
      trade.result && `Result: ${trade.result}`,
      trade.pnl && `PnL: ${trade.pnl}`,
      trade.grade && `Grade: ${trade.grade}`,
      ...trade.sections.map((s) => (s.body ? `${s.heading}: ${s.body}` : null)).filter(Boolean),
    ]
      .filter(Boolean)
      .join("\n") || "Trade fields incomplete.",
    confidence: trade.confidence,
    icon: resolveModuleIcon("CandlestickChart"),
  }))
}
