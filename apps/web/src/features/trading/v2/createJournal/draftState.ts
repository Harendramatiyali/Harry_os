export type {
  DraftTradeReview as DraftTradeSummary,
  MistakeItem,
  ScreenshotItem,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

import {
  createEmptyTradeReview,
  estimateTradePnl as estimateTradePnlReview,
  numOrNull,
  serializeMistakesMd,
  TRADE_SECTION_API,
  type DraftTradeReview,
  type MistakeItem,
  type ScreenshotItem,
  type TradeMetaPersist,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { stripAutoSectionHeadings } from "@/features/trading/v2/createJournal/sectionText"

export function estimateTradePnl(
  trade: Pick<DraftTradeReview, "entry" | "exit" | "quantity" | "direction">,
): number | null {
  return estimateTradePnlReview(trade)
}

export type BiasOption = "Bullish" | "Bearish" | "Neutral" | ""
export type SessionOption = "Normal" | "Expiry" | "High Volatility" | "News Day" | ""
export type GradeOption = "A+" | "A" | "B+" | "B" | "C" | "D" | "F" | ""

export type JournalDraftState = {
  journalId: string | null
  journalDate: string
  title?: string | null
  market: string
  instrumentFocus: string
  bias: BiasOption
  /** Full bias sentence from journal when longer than Bullish/Bearish/Neutral */
  biasDetail?: string | null
  session: SessionOption
  dayGrade: GradeOption
  netPnl: string
  tradeCount: number
  marketContext: string
  preMarketPlan: string
  tradingPlan: string
  psychology: string
  lessons: string
  actionItems: string
  mistakes: MistakeItem[]
  screenshots: ScreenshotItem[]
  tags: string[]
  publishStatus: "draft" | "published"
  trades: DraftTradeReview[]
}

export type ProgressItemId =
  | "market_context"
  | "trading_plan"
  | "psychology"
  | "lessons"
  | "screenshots"
  | "trades"
  | "summary"

export type ProgressItem = {
  id: ProgressItemId
  label: string
  pendingLabel: string
  done: boolean
  sectionId: string
}

export const DEFAULT_MISTAKES: MistakeItem[] = [
  { id: "early_entry", label: "Early Entry", checked: false, notes: "", severity: "medium" },
  { id: "early_exit", label: "Early Exit", checked: false, notes: "", severity: "medium" },
  { id: "fomo", label: "FOMO", checked: false, notes: "", severity: "high" },
  { id: "overtrading", label: "Overtrading", checked: false, notes: "", severity: "high" },
  { id: "no_stop", label: "No Stop Loss", checked: false, notes: "", severity: "high" },
  { id: "revenge", label: "Revenge Trading", checked: false, notes: "", severity: "high" },
]

export const POPULAR_TAGS = [
  "breakout",
  "reversal",
  "bullish",
  "bearish",
  "scalp",
  "swing",
  "expiry",
  "gap",
]

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function createEmptyTrade(index: number, journalDate = todayISO()) {
  return createEmptyTradeReview(index, journalDate)
}

export function createEmptyDraft(date = todayISO()): JournalDraftState {
  return {
    journalId: null,
    journalDate: date,
    market: "NIFTY",
    instrumentFocus: "NIFTY Options",
    bias: "",
    session: "Normal",
    dayGrade: "",
    netPnl: "",
    tradeCount: 0,
    marketContext: "",
    preMarketPlan: "",
    tradingPlan: "",
    psychology: "",
    lessons: "",
    actionItems: "",
    mistakes: DEFAULT_MISTAKES.map((m) => ({ ...m })),
    screenshots: [],
    tags: [],
    publishStatus: "draft",
    trades: [],
    title: null,
    biasDetail: null,
  }
}

function filled(text: string, min = 12): boolean {
  return text.trim().length >= min
}

export function computeProgress(draft: JournalDraftState): {
  pct: number
  items: ProgressItem[]
} {
  const items: ProgressItem[] = [
    {
      id: "summary",
      label: "Session Summary",
      pendingLabel: "Summary Pending",
      done: Boolean(draft.market && draft.bias && draft.dayGrade),
      sectionId: "section-summary",
    },
    {
      id: "market_context",
      label: "Market Context",
      pendingLabel: "Market Context Pending",
      done: filled(draft.marketContext),
      sectionId: "section-market-context",
    },
    {
      id: "trading_plan",
      label: "Trading Plan",
      pendingLabel: "Trading Plan Pending",
      done: filled(draft.tradingPlan),
      sectionId: "section-trading-plan",
    },
    {
      id: "psychology",
      label: "Psychology",
      pendingLabel: "Psychology Pending",
      done: filled(draft.psychology),
      sectionId: "section-psychology",
    },
    {
      id: "lessons",
      label: "Lessons",
      pendingLabel: "Lessons Pending",
      done: filled(draft.lessons),
      sectionId: "section-lessons",
    },
    {
      id: "screenshots",
      label: "Screenshots",
      pendingLabel: "Screenshots Pending",
      done: draft.screenshots.length > 0,
      sectionId: "section-screenshots",
    },
    {
      id: "trades",
      label: "Trades",
      pendingLabel: "Trades Pending",
      done: draft.tradeCount > 0,
      sectionId: "section-trades",
    },
  ]

  const doneCount = items.filter((i) => i.done).length
  const pct = Math.round((doneCount / items.length) * 100)
  return { pct, items }
}

export function formatJournalDateLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  })
}

export function formatTimelineDate(iso: string): { top: string; weekday: string } {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return { top: iso, weekday: "" }
  const top = d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" })
  return { top, weekday }
}

export type WorkspaceMeta = {
  session?: string
  instrumentFocus?: string
  mistakes?: MistakeItem[]
  tags?: string[]
  screenshots?: Array<{ id: string; name: string; caption: string }>
  tradesMeta?: Record<string, TradeMetaPersist>
}

export function serializeWorkspaceMeta(draft: JournalDraftState): string {
  const tradesMeta: Record<string, TradeMetaPersist> = {}
  for (const t of draft.trades) {
    tradesMeta[t.id] = {
      instrumentGroup: t.instrumentGroup,
      timeframe: t.timeframe,
      tradeDate: t.tradeDate,
      source: t.source,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      holdingTime: t.holdingTime,
      target: t.target,
      highestAfterExit: t.highestAfterExit,
      starRating: t.starRating,
      psychology: t.psychology,
    }
  }
  const meta: WorkspaceMeta = {
    session: draft.session || undefined,
    instrumentFocus: draft.instrumentFocus || undefined,
    mistakes: draft.mistakes,
    tags: draft.tags,
    screenshots: draft.screenshots.map(({ id, name, caption }) => ({ id, name, caption })),
    tradesMeta,
  }
  return JSON.stringify(meta)
}

export function draftToApiPayload(
  draft: JournalDraftState,
  publishStatus: "draft" | "published",
): Record<string, unknown> {
  const tradePnlSum = draft.trades.reduce((sum, t) => {
    const pnl = numOrNull(t.pnl) ?? estimateTradePnl(t)
    return sum + (pnl ?? 0)
  }, 0)
  const pnlRaw = String(draft.netPnl ?? "").replace(/[₹,\s]/g, "")
  const pnlManual = pnlRaw === "" || pnlRaw === "+" || pnlRaw === "-" ? null : Number(pnlRaw)
  // Session Net P&L wins when typed; otherwise roll up trade P&Ls for main journal cards
  const pnlNum =
    pnlManual != null && Number.isFinite(pnlManual)
      ? pnlManual
      : draft.trades.length
        ? tradePnlSum
        : null
  const bias = (draft.biasDetail && draft.biasDetail.trim()) || draft.bias || null
  const instrument = (draft.instrumentFocus || "").trim() || null
  const title =
    (draft.title && draft.title.trim()) ||
    `Trading Journal ${draft.journalDate}`

  const market = (draft.market || "").trim()

  return {
    title: title.slice(0, 255),
    market: market ? market.slice(0, 64) : null,
    primary_instrument: instrument ? instrument.slice(0, 64) : null,
    day_bias: bias ? String(bias).slice(0, 64) : null,
    day_result: draft.session ? String(draft.session).slice(0, 64) : null,
    day_pnl: pnlNum != null && Number.isFinite(pnlNum) ? Number(Number(pnlNum).toFixed(2)) : null,
    overall_grade: draft.dayGrade ? String(draft.dayGrade).slice(0, 4) : null,
    tags: draft.tags,
    publish_status: publishStatus,
    workspace_meta_json: serializeWorkspaceMeta(draft),
    sections: [
      {
        section_key: "market_context",
        heading_original: "Market Context",
        body_markdown: stripAutoSectionHeadings(draft.marketContext, "Market Overview"),
      },
      {
        section_key: "pre_market",
        heading_original: "Pre-Market Plan",
        body_markdown: stripAutoSectionHeadings(draft.preMarketPlan),
      },
      {
        section_key: "trading_plan",
        heading_original: "Trading Plan",
        body_markdown: stripAutoSectionHeadings(draft.tradingPlan),
      },
      {
        section_key: "psychology",
        heading_original: "Psychology",
        body_markdown: stripAutoSectionHeadings(draft.psychology, "Psychology"),
      },
      {
        section_key: "mistakes",
        heading_original: "Mistakes",
        body_markdown: draft.mistakes
          .filter((m) => m.checked)
          .map((m) => `- [x] **${m.label}** (${m.severity})${m.notes ? `: ${m.notes}` : ""}`)
          .join("\n"),
      },
      {
        section_key: "lessons",
        heading_original: "Lessons Learned",
        body_markdown: stripAutoSectionHeadings(draft.lessons, "Lessons Learned"),
      },
      {
        section_key: "action_items",
        heading_original: "Action Items for Tomorrow",
        body_markdown: stripAutoSectionHeadings(draft.actionItems),
      },
    ],
    trades: draft.trades.map((t) => {
      const estimated = estimateTradePnl(t)
      const pnl = numOrNull(t.pnl) ?? estimated
      const direction = (t.direction || "long").toLowerCase()
      const quantity = numOrNull(t.quantity)
      const entry = numOrNull(t.entry)
      const exit = numOrNull(t.exit)
      const stop = numOrNull(t.stop)
      const sections = [
        ...Object.entries(TRADE_SECTION_API).map(([uiKey, meta]) => {
          const body =
            uiKey === "mistakes"
              ? serializeMistakesMd(t.mistakes)
              : uiKey === "thesis"
                ? t.review.thesis
                : uiKey === "setupType"
                  ? t.review.setupType
                  : uiKey === "whatHappened"
                    ? t.review.whatHappened
                    : uiKey === "whatWentWell"
                      ? t.review.whatWentWell
                      : uiKey === "lessons"
                        ? t.review.lessons
                        : t.review.notes
          return {
            ...(t.sectionIds[uiKey as keyof typeof t.sectionIds]
              ? { id: t.sectionIds[uiKey as keyof typeof t.sectionIds] }
              : {}),
            section_key: meta.key,
            heading_original: meta.heading,
            body_markdown: body,
          }
        }),
        {
          section_key: "analysis",
          heading_original: "Psychology",
          body_markdown: [
            t.psychology.mood ? `**Mood:** ${t.psychology.mood}` : null,
            `**Confidence:** ${t.psychology.confidence}/10`,
            `**Discipline:** ${t.psychology.discipline}/10`,
            `**Patience:** ${t.psychology.patience}/10`,
            `**Execution Focus:** ${t.psychology.executionFocus}/10`,
            t.psychology.emotionNotes ? `\n${t.psychology.emotionNotes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ]
      return {
        id: t.id,
        instrument: (t.instrument || "").trim().slice(0, 64) || null,
        direction: direction === "short" ? "short" : "long",
        // API requires quantity/entry > 0 when present — omit invalid/zero values
        quantity: quantity != null && quantity > 0 ? quantity : null,
        entry_price: entry != null && entry > 0 ? entry : null,
        exit_price: exit != null && exit > 0 ? exit : null,
        stop_price: stop != null && stop > 0 ? stop : null,
        result: t.result ? String(t.result).slice(0, 128) : null,
        pnl,
        setup: t.setup ? String(t.setup).slice(0, 128) : null,
        grade: t.grade ? String(t.grade).slice(0, 4) : null,
        sections,
      }
    }),
  }
}
