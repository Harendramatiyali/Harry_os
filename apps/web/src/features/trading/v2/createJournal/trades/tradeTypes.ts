/** Trade review types, section keys, and helpers for Create Journal */

export type MistakeItem = {
  id: string
  label: string
  checked: boolean
  notes: string
  severity: "low" | "medium" | "high"
  custom?: boolean
}

export type ScreenshotItem = {
  id: string
  name: string
  previewUrl: string
  caption: string
  file?: File
  attachmentId?: string
  importStatus?: string
}

export type TradeMood =
  | "calm"
  | "confident"
  | "neutral"
  | "fear"
  | "revenge"
  | "fomo"
  | ""

export type TradePsychology = {
  mood: TradeMood
  confidence: number
  discipline: number
  patience: number
  executionFocus: number
  emotionNotes: string
}

export type TradeReviewSections = {
  thesis: string
  setupType: string
  whatHappened: string
  whatWentWell: string
  lessons: string
  notes: string
}

export type DraftTradeReview = {
  id: string
  tradeIndex: number
  /** Full instrument e.g. NIFTY 25000 CE */
  instrument: string
  /** Group key e.g. NIFTY */
  instrumentGroup: string
  direction: string | null
  quantity: string
  entry: string
  exit: string
  stop: string
  target: string
  /** Best favorable price after exit (high for long, low for short). */
  highestAfterExit: string
  pnl: string
  grade: string | null
  result: string | null
  setup: string | null
  timeframe: string
  tradeDate: string
  source: string
  entryTime: string
  exitTime: string
  holdingTime: string
  starRating: number
  screenshots: ScreenshotItem[]
  psychology: TradePsychology
  mistakes: MistakeItem[]
  review: TradeReviewSections
  sectionIds: Partial<Record<TradeSectionUiKey, string>>
}

export type TradeSectionUiKey =
  | "thesis"
  | "setupType"
  | "whatHappened"
  | "whatWentWell"
  | "lessons"
  | "notes"
  | "mistakes"
  | "psychology"

/** UI section → API TradeSectionKey */
export const TRADE_SECTION_API: Record<
  Exclude<TradeSectionUiKey, "psychology">,
  { key: string; heading: string }
> = {
  thesis: { key: "entry_logic", heading: "Trade Thesis" },
  setupType: { key: "trade_setup", heading: "Setup Type" },
  whatHappened: { key: "trade_management", heading: "What Happened" },
  whatWentWell: { key: "what_went_well", heading: "What Went Well" },
  lessons: { key: "next_time", heading: "Lessons Learned" },
  notes: { key: "uncategorized", heading: "Trade Notes" },
  mistakes: { key: "mistakes", heading: "Mistakes" },
}

export const SETUP_EXAMPLES = [
  "Breakout",
  "Retest",
  "VWAP Reclaim",
  "EMA Bounce",
  "Supply Rejection",
  "Demand Rejection",
  "Momentum",
  "Trend Continuation",
] as const

export const TRADE_MISTAKE_PRESETS: Array<{ id: string; label: string; severity: MistakeItem["severity"] }> = [
  { id: "early_entry", label: "Early Entry", severity: "medium" },
  { id: "early_exit", label: "Early Exit", severity: "medium" },
  { id: "fomo", label: "FOMO", severity: "high" },
  { id: "overtrading", label: "Overtrading", severity: "high" },
  { id: "no_stop", label: "No Stop Loss", severity: "high" },
  { id: "revenge", label: "Revenge Trading", severity: "high" },
  { id: "position_sizing", label: "Position Sizing", severity: "medium" },
  { id: "averaging", label: "Averaging", severity: "medium" },
  { id: "ignored_trend", label: "Ignored Trend", severity: "medium" },
  { id: "ignored_htf", label: "Ignored Higher Timeframe", severity: "medium" },
  { id: "exited_too_early", label: "Exited Too Early", severity: "low" },
  { id: "held_losing", label: "Held Losing Trade", severity: "high" },
  { id: "emotional_exit", label: "Emotional Exit", severity: "high" },
]

export const MOOD_OPTIONS: Array<{ id: TradeMood; label: string; emoji: string }> = [
  { id: "calm", label: "Calm", emoji: "😀" },
  { id: "confident", label: "Confident", emoji: "🙂" },
  { id: "neutral", label: "Neutral", emoji: "😐" },
  { id: "fear", label: "Fear", emoji: "😟" },
  { id: "revenge", label: "Revenge", emoji: "😡" },
  { id: "fomo", label: "FOMO", emoji: "😫" },
]

export function defaultTradeMistakes(): MistakeItem[] {
  return TRADE_MISTAKE_PRESETS.map((m) => ({
    id: m.id,
    label: m.label,
    checked: false,
    notes: "",
    severity: m.severity,
  }))
}

export function defaultPsychology(): TradePsychology {
  return {
    mood: "",
    confidence: 5,
    discipline: 5,
    patience: 5,
    executionFocus: 5,
    emotionNotes: "",
  }
}

export function defaultReview(): TradeReviewSections {
  return {
    thesis: "",
    setupType: "",
    whatHappened: "",
    whatWentWell: "",
    lessons: "",
    notes: "",
  }
}

/** Derive instrument family for accordion grouping. */
export function instrumentGroupOf(instrument: string): string {
  const raw = (instrument || "").trim().toUpperCase()
  if (!raw) return "OTHER"
  const known = ["MIDCPNIFTY", "BANKNIFTY", "FINNIFTY", "NIFTY", "SENSEX", "BANKEX"]
  for (const k of known) {
    if (raw.startsWith(k) || raw.includes(k)) return k
  }
  const token = raw.split(/[\s/_-]+/)[0] || "OTHER"
  return token.slice(0, 24)
}

export function createEmptyTradeReview(index: number, journalDate: string): DraftTradeReview {
  return {
    id: crypto.randomUUID(),
    tradeIndex: index,
    instrument: "",
    instrumentGroup: "NIFTY",
    direction: "long",
    quantity: "1.00",
    entry: "",
    exit: "",
    stop: "",
    target: "",
    highestAfterExit: "",
    pnl: "",
    grade: null,
    result: null,
    setup: "Breakout",
    timeframe: "5 Min",
    tradeDate: journalDate,
    source: "Manual",
    entryTime: "",
    exitTime: "",
    holdingTime: "",
    starRating: 0,
    screenshots: [],
    psychology: defaultPsychology(),
    mistakes: defaultTradeMistakes(),
    review: defaultReview(),
    sectionIds: {},
  }
}

export function numOrNull(raw: string): number | null {
  const cleaned = String(raw ?? "").replace(/[₹,\s]/g, "").trim()
  if (!cleaned || cleaned === "+" || cleaned === "-" || cleaned === "—") return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Normalize any numeric string to exactly 2 decimal places (e.g. "130" → "130.00"). */
export function toDec2(raw: string | number | null | undefined): string {
  if (raw == null || raw === "") return ""
  const n = typeof raw === "number" ? raw : numOrNull(String(raw))
  if (n == null) return String(raw)
  return n.toFixed(2)
}

export function estimateTradePnl(
  trade: Pick<DraftTradeReview, "entry" | "exit" | "quantity" | "direction">,
): number | null {
  const pts = pointsCaptured(trade)
  const qty = numOrNull(trade.quantity)
  if (pts == null || qty == null) return null
  // P&L = points captured × quantity
  return pts * qty
}

export function pointsCaptured(trade: Pick<DraftTradeReview, "entry" | "exit" | "direction">): number | null {
  const entry = numOrNull(trade.entry)
  const exit = numOrNull(trade.exit)
  if (entry == null || exit == null) return null
  const long = !trade.direction || trade.direction.toLowerCase() === "long"
  return long ? exit - entry : entry - exit
}

/** Holding duration from entry/exit clock times (HH:MM). Supports overnight (exit < entry). */
export function holdingDuration(entryTime: string, exitTime: string): string | null {
  const toMinutes = (raw: string): number | null => {
    const m = String(raw || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (!m) return null
    const h = Number(m[1])
    const min = Number(m[2])
    const sec = m[3] ? Number(m[3]) : 0
    if (![h, min, sec].every((n) => Number.isFinite(n))) return null
    return h * 60 + min + sec / 60
  }
  const start = toMinutes(entryTime)
  const end = toMinutes(exitTime)
  if (start == null || end == null) return null
  let mins = end - start
  if (mins < 0) mins += 24 * 60
  if (mins < 60) return `${mins.toFixed(2)}m`
  const h = Math.floor(mins / 60)
  const rem = mins - h * 60
  if (rem < 0.01) return `${h}h`
  return `${h}h ${rem.toFixed(2)}m`
}

/** Apply a patch and refresh derived P&L / holding time. */
export function applyTradePatch(
  trade: DraftTradeReview,
  patch: Partial<DraftTradeReview>,
): DraftTradeReview {
  const next = { ...trade, ...patch }

  const priceKeys = ["entry", "exit", "quantity", "direction"] as const
  if (priceKeys.some((k) => k in patch) && !("pnl" in patch)) {
    const estimated = estimateTradePnl(next)
    next.pnl = estimated != null ? toDec2(estimated) : next.pnl
  }

  if (("entryTime" in patch || "exitTime" in patch) && !("holdingTime" in patch)) {
    const hold = holdingDuration(next.entryTime, next.exitTime)
    if (hold != null) next.holdingTime = hold
  }

  return next
}

export function riskReward(trade: Pick<DraftTradeReview, "entry" | "exit" | "stop" | "direction">): number | null {
  const entry = numOrNull(trade.entry)
  const exit = numOrNull(trade.exit)
  const stop = numOrNull(trade.stop)
  if (entry == null || exit == null || stop == null) return null
  const reward = Math.abs(exit - entry)
  const risk = Math.abs(entry - stop)
  if (risk <= 0) return null
  return Number((reward / risk).toFixed(2))
}

export function roiPct(trade: Pick<DraftTradeReview, "entry" | "exit" | "direction">): number | null {
  const entry = numOrNull(trade.entry)
  const pts = pointsCaptured(trade)
  if (entry == null || pts == null || entry === 0) return null
  return Number(((pts / entry) * 100).toFixed(2))
}

export function inferResult(trade: DraftTradeReview): "win" | "loss" | "flat" {
  const r = (trade.result || "").toLowerCase()
  if (/win|profit|green/.test(r)) return "win"
  if (/loss|lose|red/.test(r)) return "loss"
  if (/be|flat|scratch|breakeven/.test(r)) return "flat"
  const pnl = numOrNull(trade.pnl) ?? estimateTradePnl(trade)
  if (pnl == null) return "flat"
  if (pnl > 0) return "win"
  if (pnl < 0) return "loss"
  return "flat"
}

export function serializeMistakesMd(mistakes: MistakeItem[]): string {
  return mistakes
    .filter((m) => m.checked)
    .map((m) => `- [x] **${m.label}** (${m.severity})${m.notes ? `: ${m.notes}` : ""}`)
    .join("\n")
}

export function parseMistakesMd(md: string, base: MistakeItem[]): MistakeItem[] {
  const next = base.map((m) => ({ ...m, checked: false, notes: "" }))
  const byLabel = new Map(next.map((m) => [m.label.toLowerCase(), m]))
  for (const line of md.split("\n")) {
    const m = line.match(/\[(x|X| )\]\s*\*\*([^*]+)\*\*(?:\s*\((\w+)\))?(?::\s*(.*))?/)
    if (!m) continue
    const label = m[2].trim()
    const severity = (m[3] || "medium").toLowerCase() as MistakeItem["severity"]
    const notes = (m[4] || "").trim()
    const row = byLabel.get(label.toLowerCase())
    if (row) {
      row.checked = m[1].toLowerCase() === "x"
      if (severity === "low" || severity === "medium" || severity === "high") row.severity = severity
      row.notes = notes
    } else {
      const custom: MistakeItem = {
        id: `custom_${crypto.randomUUID().slice(0, 8)}`,
        label,
        checked: m[1].toLowerCase() === "x",
        notes,
        severity: severity === "low" || severity === "high" ? severity : "medium",
        custom: true,
      }
      next.push(custom)
      byLabel.set(label.toLowerCase(), custom)
    }
  }
  return next
}

export type TradeMetaPersist = {
  instrumentGroup?: string
  timeframe?: string
  tradeDate?: string
  source?: string
  entryTime?: string
  exitTime?: string
  holdingTime?: string
  target?: string
  /** Best favorable price after exit (high for long, low for short). */
  highestAfterExit?: string
  starRating?: number
  psychology?: TradePsychology
  collapsedSections?: Record<string, boolean>
}

export function groupTradesByInstrument(trades: DraftTradeReview[]): Array<{
  group: string
  trades: DraftTradeReview[]
  pnl: number
  wins: number
  losses: number
}> {
  const map = new Map<string, DraftTradeReview[]>()
  for (const t of trades) {
    const g = t.instrumentGroup || instrumentGroupOf(t.instrument)
    const list = map.get(g) ?? []
    list.push(t)
    map.set(g, list)
  }
  return [...map.entries()].map(([group, list]) => {
    let pnl = 0
    let wins = 0
    let losses = 0
    for (const t of list) {
      const p = numOrNull(t.pnl) ?? estimateTradePnl(t) ?? 0
      pnl += p
      const r = inferResult(t)
      if (r === "win") wins += 1
      if (r === "loss") losses += 1
    }
    return { group, trades: list.sort((a, b) => a.tradeIndex - b.tradeIndex), pnl, wins, losses }
  })
}
