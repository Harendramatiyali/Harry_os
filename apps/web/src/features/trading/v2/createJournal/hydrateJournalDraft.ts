import type { JournalAttachment, JournalDay, JournalTrade } from "@/features/trading/types"
import {
  type BiasOption,
  type GradeOption,
  type JournalDraftState,
  type MistakeItem,
  type ScreenshotItem,
  type WorkspaceMeta,
  DEFAULT_MISTAKES,
  createEmptyDraft,
} from "@/features/trading/v2/createJournal/draftState"
import { stripAutoSectionHeadings } from "@/features/trading/v2/createJournal/sectionText"
import {
  createEmptyTradeReview,
  defaultPsychology,
  defaultReview,
  defaultTradeMistakes,
  instrumentGroupOf,
  parseMistakesMd,
  toDec2,
  type DraftTradeReview,
  type TradeMetaPersist,
  type TradePsychology,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

function clean(text: string | null | undefined): string {
  return (text || "").trim()
}

function sectionMap(day: JournalDay): Map<string, string> {
  const map = new Map<string, string>()
  for (const s of day.sections ?? []) {
    const key = s.section_key
    const body = clean(s.body_markdown)
    if (!body) continue
    const prev = map.get(key)
    map.set(key, prev ? `${prev}\n\n${body}` : body)
  }
  return map
}

/**
 * Merge Obsidian sections for a UI field.
 * - One matching section → plain body (no synthetic heading) for clean typing.
 * - Multiple sections → keep headings + separators for readability.
 */
function joinSections(
  map: Map<string, string>,
  keys: string[],
  headings?: Record<string, string>,
): string {
  const present = keys.filter((key) => Boolean(map.get(key)?.trim()))
  if (!present.length) return ""

  if (present.length === 1) {
    const key = present[0]!
    return stripAutoSectionHeadings(map.get(key) || "", headings?.[key])
  }

  const parts: string[] = []
  for (const key of present) {
    const raw = map.get(key)
    if (!raw) continue
    const heading = headings?.[key]
    const body = stripAutoSectionHeadings(raw, heading)
    if (!body) continue
    parts.push(heading ? `## ${heading}\n\n${body}` : body)
  }
  return parts.join("\n\n---\n\n").trim()
}

function extractBias(day: JournalDay, map: Map<string, string>): BiasOption {
  const candidates = [
    day.day_bias || "",
    map.get("pre_market") || "",
    map.get("market_context") || "",
  ].join("\n")

  if (/\bbearish\b/i.test(candidates)) return "Bearish"
  if (/\bbullish\b/i.test(candidates)) return "Bullish"
  if (/\bneutral\b|\brange\s*bound\b/i.test(candidates)) return "Neutral"

  const short = (day.day_bias || "").trim()
  if (short === "Bullish" || short === "Bearish" || short === "Neutral") return short
  return ""
}

function extractGrade(day: JournalDay, map: Map<string, string>): GradeOption {
  const direct = (day.overall_grade || "").trim().toUpperCase()
  const allowed = new Set(["A+", "A", "A-", "B+", "B", "B-", "C", "D", "F"])
  if (direct === "A-" || direct === "B-") return direct[0] as GradeOption
  if (allowed.has(direct)) return direct.replace("-", "") as GradeOption

  const blob = [map.get("other") || "", map.get("iq200_evaluation") || "", map.get("closing_note") || ""].join(
    "\n",
  )
  const m = blob.match(/\*\*\s*([A-F][+-]?)\s*\*\*/)
  if (m) {
    const g = m[1].toUpperCase()
    if (g === "A-" || g === "B-") return g[0] as GradeOption
    if (allowed.has(g)) return g.replace("-", "") as GradeOption
  }
  return ""
}

function inferMarket(day: JournalDay): string {
  if (day.market) return day.market.toUpperCase()
  const blob = [
    day.primary_instrument || "",
    ...(day.trades ?? []).map((t) => t.instrument || ""),
  ].join(" ")
  if (/banknifty/i.test(blob)) return "BANKNIFTY"
  if (/finnifty/i.test(blob)) return "FINNIFTY"
  if (/sensex/i.test(blob)) return "SENSEX"
  return "NIFTY"
}

function inferInstrumentFocus(day: JournalDay): string {
  if (day.primary_instrument && !/^index:/i.test(day.primary_instrument)) {
    return day.primary_instrument
  }
  const instruments = (day.trades ?? []).map((t) => t.instrument).filter(Boolean) as string[]
  if (instruments.some((i) => /\b(CE|PE)\b/i.test(i))) return "NIFTY Options"
  if (instruments[0]) return instruments[0]
  return "NIFTY Options"
}

function parseMistakes(markdown: string): MistakeItem[] {
  const base = DEFAULT_MISTAKES.map((m) => ({ ...m }))
  if (!markdown.trim()) return base

  const lines = markdown
    .split(/\n+/)
    .map((l) => l.replace(/^[-*]\s+(\[[ xX]\]\s*)?/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean)

  const notesBlob = lines.join("\n")

  for (const item of base) {
    const needle = item.label.toLowerCase()
    const hit = lines.find((l) => l.toLowerCase().includes(needle))
    if (hit) {
      item.checked = true
      item.notes = hit
    } else if (
      (item.id === "early_exit" && /exit(ed|ing)?\s+(too\s+)?early|early\s+exit/i.test(notesBlob)) ||
      (item.id === "early_entry" && /enter(ed)?\s+early|early\s+entry/i.test(notesBlob)) ||
      (item.id === "fomo" && /\bfomo\b/i.test(notesBlob)) ||
      (item.id === "overtrading" && /over\s*trad/i.test(notesBlob)) ||
      (item.id === "revenge" && /revenge/i.test(notesBlob)) ||
      (item.id === "no_stop" && /no\s+stop|without\s+stop|stop-loss/i.test(notesBlob))
    ) {
      item.checked = true
    }
  }

  for (const line of lines) {
    const already = base.some(
      (m) => m.checked && (m.notes === line || line.toLowerCase().includes(m.label.toLowerCase())),
    )
    if (already || line.length < 4) continue
    base.push({
      id: `imported-${base.length}-${Math.random().toString(36).slice(2, 6)}`,
      label: line.slice(0, 64),
      checked: true,
      notes: line,
      severity: "medium",
      custom: true,
    })
  }

  if (!base.some((m) => m.checked) && notesBlob) {
    base[0].checked = true
    base[0].notes = notesBlob
  }

  return base
}

function collectAttachments(day: JournalDay): ScreenshotItem[] {
  const seenIds = new Set<string>()
  const seenFiles = new Set<string>()
  const out: ScreenshotItem[] = []

  const push = (a: JournalAttachment, prefix?: string) => {
    if (!a.id || seenIds.has(a.id)) return
    const fileKey = (a.file_name || "").toLowerCase()
    if (fileKey && seenFiles.has(fileKey)) return
    seenIds.add(a.id)
    if (fileKey) seenFiles.add(fileKey)
    out.push({
      id: a.id,
      name: a.file_name || "Screenshot",
      previewUrl: "",
      caption: prefix ? `${prefix}${a.caption ? ` · ${a.caption}` : ""}` : a.caption || "",
      attachmentId: a.id,
      importStatus: a.import_status,
    })
  }

  for (const a of [...(day.attachments ?? [])].sort((x, y) => x.sort_order - y.sort_order)) {
    push(a, "Day")
  }
  for (const trade of [...(day.trades ?? [])].sort((a, b) => a.trade_index - b.trade_index)) {
    for (const a of [...(trade.attachments ?? [])].sort((x, y) => x.sort_order - y.sort_order)) {
      push(a, `T${trade.trade_index}`)
    }
  }
  return out
}

function mapTrades(
  trades: JournalTrade[],
  journalDate: string,
  tradesMeta: Record<string, TradeMetaPersist> | undefined,
): DraftTradeReview[] {
  return [...trades]
    .sort((a, b) => a.trade_index - b.trade_index)
    .map((t, displayIndex) => {
      const base = createEmptyTradeReview(displayIndex + 1, journalDate)
      const meta = tradesMeta?.[t.id] ?? {}
      const byKey = new Map(
        (t.sections ?? []).map((s) => [s.section_key, s] as const),
      )
      const body = (key: string) => byKey.get(key)?.body_markdown || ""
      const sectionIds: DraftTradeReview["sectionIds"] = {}
      const setId = (ui: keyof DraftTradeReview["sectionIds"], apiKey: string) => {
        const row = byKey.get(apiKey)
        if (row) sectionIds[ui] = row.id
      }
      setId("thesis", "entry_logic")
      setId("setupType", "trade_setup")
      setId("whatHappened", "trade_management")
      setId("whatWentWell", "what_went_well")
      setId("lessons", "next_time")
      setId("notes", "uncategorized")
      setId("mistakes", "mistakes")

      const psychFromMeta = meta.psychology
      const psych: TradePsychology = psychFromMeta
        ? { ...defaultPsychology(), ...psychFromMeta }
        : defaultPsychology()

      const screenshots: ScreenshotItem[] = [...(t.attachments ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((a) => ({
          id: a.id,
          name: a.file_name || a.obsidian_ref,
          previewUrl: "",
          caption: a.caption || "",
          attachmentId: a.id,
          importStatus: a.import_status,
        }))

      const instrument = t.instrument || ""
      return {
        ...base,
        id: t.id,
        // Always show contiguous Trade #1..n even if DB indices have gaps from deletes
        tradeIndex: displayIndex + 1,
        instrument,
        instrumentGroup: meta.instrumentGroup || instrumentGroupOf(instrument),
        direction: t.direction,
        quantity: t.quantity != null ? toDec2(t.quantity) : "",
        entry: t.entry_price != null ? toDec2(t.entry_price) : "",
        exit: t.exit_price != null ? toDec2(t.exit_price) : "",
        stop: t.stop_price != null ? toDec2(t.stop_price) : "",
        target: meta.target ? toDec2(meta.target) : "",
        highestAfterExit: meta.highestAfterExit ? toDec2(meta.highestAfterExit) : "",
        pnl: t.pnl != null ? toDec2(t.pnl) : "",
        grade: t.grade,
        result: t.result,
        setup: t.setup || base.setup,
        timeframe: meta.timeframe || base.timeframe,
        tradeDate: meta.tradeDate || journalDate,
        source: meta.source || "Manual",
        entryTime: meta.entryTime || "",
        exitTime: meta.exitTime || "",
        holdingTime: meta.holdingTime || "",
        starRating: meta.starRating ?? 0,
        screenshots,
        psychology: psych,
        mistakes: parseMistakesMd(body("mistakes"), defaultTradeMistakes()),
        review: {
          ...defaultReview(),
          thesis: body("entry_logic"),
          setupType: body("trade_setup"),
          whatHappened: body("trade_management"),
          whatWentWell: body("what_went_well"),
          lessons: body("next_time"),
          notes: body("uncategorized") || body("other"),
        },
        sectionIds,
      }
    })
}

/**
 * HTJ v2 often nests the plan inside Pre-Market as:
 *   - **My Trading Plan:**
 *       - Wait for …
 * Extract that block when there is no dedicated trading_plan section.
 */
function extractNestedTradingPlan(preMarket: string): { plan: string; remainder: string } {
  if (!preMarket.trim()) return { plan: "", remainder: "" }

  const planHeader =
    /(?:^|\n)([ \t]*[-*]?\s*\*\*My Trading Plan:\*\*[ \t]*\n?)([\s\S]*?)(?=\n[ \t]*[-*]?\s*\*\*[^*]+?\*\*|\n#{1,3}\s|\n---\s*$|$)/i
  const m = preMarket.match(planHeader)
  if (m) {
    const header = m[1] || ""
    const body = (m[2] || "").trim()
    const plan = `**My Trading Plan:**\n${body}`.trim()
    const remainder = preMarket.replace(m[0], "\n").replace(/\n{3,}/g, "\n\n").trim()
    return { plan, remainder: remainder || preMarket.replace(header + body, "").trim() }
  }

  // Softer fallback: lines after "My Trading Plan" / "My plan was" / "Initial Trading Plan"
  const soft = preMarket.match(
    /(?:My Trading Plan|Initial Trading Plan|My plan was|The plan was)\s*[:\-]*\s*([\s\S]+)/i,
  )
  if (soft && soft.index != null && soft.index > 0) {
    const plan = soft[0].trim()
    // Only treat as nested plan if it looks like a list of rules
    if (/- /.test(plan) || plan.length < 800) {
      const remainder = preMarket.slice(0, soft.index).trim()
      return { plan, remainder }
    }
  }

  return { plan: "", remainder: preMarket }
}

function resolveTradingPlan(
  map: Map<string, string>,
  preMarket: string,
): { tradingPlan: string; preMarketWithoutPlan: string } {
  const dedicated = joinSections(map, ["trading_plan"]).trim()
  if (dedicated) {
    return { tradingPlan: dedicated, preMarketWithoutPlan: preMarket }
  }

  const nested = extractNestedTradingPlan(preMarket)
  if (nested.plan) {
    return { tradingPlan: nested.plan, preMarketWithoutPlan: nested.remainder || preMarket }
  }

  // Last resort: plan-like bullets from pre_market ("My plan was to…")
  const planish = preMarket
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /plan was|trading plan|wait for|execute only|respect the/i.test(l))
  if (planish.length >= 2) {
    return {
      tradingPlan: planish.join("\n"),
      preMarketWithoutPlan: preMarket,
    }
  }

  return { tradingPlan: "", preMarketWithoutPlan: preMarket }
}

/** Map a full API journal day (Obsidian or native) into the Create/Edit workspace draft. */
export function hydrateJournalDraft(day: JournalDay): JournalDraftState {
  const base = createEmptyDraft(day.journal_date)
  const map = sectionMap(day)

  const marketContext = joinSections(
    map,
    ["market_context", "market_observation", "intraday_observation"],
    {
      market_context: "Market Overview",
      market_observation: "Market Observation",
      intraday_observation: "Intraday Observation",
    },
  )

  const preMarketRaw = map.get("pre_market") || ""
  const { tradingPlan, preMarketWithoutPlan } = resolveTradingPlan(map, preMarketRaw)

  // Obsidian HTJ often stores overview under Pre-Market when Market Context is empty
  const marketContextFilled = stripAutoSectionHeadings(
    marketContext || preMarketWithoutPlan || preMarketRaw,
    "Market Overview",
  )
  const preMarketFilled = stripAutoSectionHeadings(preMarketWithoutPlan || preMarketRaw)

  const psychology = joinSections(
    map,
    ["psychology", "iq200_evaluation"],
    { psychology: "Psychology", iq200_evaluation: "IQ-200 Daily Evaluation" },
  )
  const lessons = joinSections(
    map,
    ["lessons", "daily_learning", "what_went_well", "rules_reinforced", "closing_note"],
    {
      lessons: "Lessons Learned",
      daily_learning: "Daily Learning",
      what_went_well: "What Went Well",
      rules_reinforced: "Rules Reinforced",
      closing_note: "Closing Note",
    },
  )
  const actionItems = map.get("action_items") || ""
  const mistakesMd = map.get("mistakes") || ""

  let workspaceMeta: WorkspaceMeta = {}
  if (day.workspace_meta_json) {
    try {
      workspaceMeta = JSON.parse(day.workspace_meta_json) as WorkspaceMeta
    } catch {
      workspaceMeta = {}
    }
  }

  const trades = mapTrades(day.trades ?? [], day.journal_date, workspaceMeta.tradesMeta)
  const screenshots = collectAttachments(day)

  const pnl =
    day.day_pnl != null && day.day_pnl !== ""
      ? toDec2(day.day_pnl)
      : trades.length
        ? toDec2((day.trades ?? []).reduce((sum, t) => sum + Number(t.pnl ?? 0), 0))
        : ""

  return {
    ...base,
    journalId: day.id,
    journalDate: day.journal_date,
    title: day.title,
    market: inferMarket(day),
    instrumentFocus: workspaceMeta.instrumentFocus || inferInstrumentFocus(day),
    bias: extractBias(day, map),
    biasDetail: (day.day_bias || "").trim() || null,
    session: (workspaceMeta.session as JournalDraftState["session"]) || "Normal",
    dayGrade: extractGrade(day, map),
    netPnl: pnl,
    tradeCount: day.trade_count || trades.length,
    marketContext: marketContextFilled,
    preMarketPlan: preMarketFilled,
    tradingPlan: stripAutoSectionHeadings(tradingPlan),
    psychology: stripAutoSectionHeadings(psychology, "Psychology"),
    lessons: stripAutoSectionHeadings(lessons, "Lessons Learned"),
    actionItems: stripAutoSectionHeadings(actionItems),
    mistakes: workspaceMeta.mistakes?.length ? workspaceMeta.mistakes : parseMistakes(mistakesMd),
    screenshots,
    tags: day.tags?.length ? day.tags : workspaceMeta.tags || [],
    publishStatus: day.publish_status === "published" ? "published" : "draft",
    trades,
  }
}
