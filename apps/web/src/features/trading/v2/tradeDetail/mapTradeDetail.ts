import type { JournalDay, JournalTrade } from "@/features/trading/types"
import { formatJournalDate, formatMoney2, num2 } from "@/features/trading/v2/mapJournalToV2"
import type { TradeMetaPersist } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import {
  holdingDuration,
  parseMistakesMd,
  TRADE_MISTAKE_PRESETS,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"
import type {
  TradeDetailChip,
  TradeDetailModel,
  TradeDetailMistake,
  TradeDetailStatus,
  TradeDetailTimelineEvent,
} from "@/features/trading/v2/tradeDetail/types"

function stripWikilinks(text: string): string {
  return text
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[[^\]]+\]\]/g, (m) => {
      const inner = m.slice(2, -2)
      const pipe = inner.indexOf("|")
      return pipe >= 0 ? inner.slice(pipe + 1) : inner
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function sectionBody(trade: JournalTrade, keys: string[]): string {
  const hit = [...(trade.sections ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((s) => keys.some((k) => s.section_key.toLowerCase().includes(k)))
  return stripWikilinks(hit?.body_markdown ?? "")
}

function bulletPoints(md: string): string[] {
  const out: string[] = []
  for (const raw of md.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^(?:[-*•]|\d+[.)]|✓|✔|✅)\s+(.+)/)
    if (m) {
      out.push(m[1].replace(/\*\*/g, "").trim())
      continue
    }
    // Treat short standalone lines as points when no bullets exist yet
    if (!/^#{1,3}\s/.test(line) && line.length < 140) {
      out.push(line.replace(/\*\*/g, "").trim())
    }
  }
  return out.filter(Boolean)
}

function parseStrike(instrument: string): string | undefined {
  const m = instrument.match(/(\d{4,6})\s*(CE|PE|CALL|PUT)\b/i)
  if (!m) return undefined
  return `${m[1]} ${m[2].toUpperCase().replace("CALL", "CE").replace("PUT", "PE")}`
}

function inferStatus(trade: JournalTrade): TradeDetailStatus {
  const r = (trade.result || "").toLowerCase()
  if (/win|profit|green/.test(r)) return "win"
  if (/loss|lose|red/.test(r)) return "loss"
  if (/be|flat|scratch|breakeven/.test(r)) return "flat"
  const pnl = Number(trade.pnl ?? 0)
  if (pnl > 0) return "win"
  if (pnl < 0) return "loss"
  return "flat"
}

function riskReward(
  entry: number | null,
  exit: number | null,
  stop: number | null,
  _direction: string | null,
): string {
  if (entry == null || exit == null || stop == null) return "—"
  const risk = Math.abs(entry - stop)
  if (risk <= 0) return "—"
  const reward = Math.abs(exit - entry)
  const rr = reward / risk
  return `1:${rr.toFixed(1)}`
}

const CHIP_TONES: TradeDetailChip["tone"][] = ["blue", "violet", "amber", "emerald", "rose", "slate"]

function setupChips(trade: JournalTrade, setupMd: string): TradeDetailChip[] {
  const labels = new Set<string>()
  if (trade.setup?.trim()) labels.add(trade.setup.trim())
  for (const p of bulletPoints(setupMd)) {
    // Prefer short chip-like tokens
    const cleaned = p.replace(/^[-•]\s*/, "").trim()
    if (cleaned && cleaned.length <= 40) labels.add(cleaned)
  }
  return [...labels].slice(0, 10).map((label, i) => ({
    id: `chip-${i}`,
    label,
    tone: CHIP_TONES[i % CHIP_TONES.length]!,
  }))
}

function parseTimeline(md: string): TradeDetailTimelineEvent[] {
  const events: TradeDetailTimelineEvent[] = []
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.replace(/^[-*•]\s+/, "").replace(/\*\*/g, "")
    const timed = line.match(/^(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*[–\-—:]?\s*(.+)$/i)
    if (timed) {
      events.push({
        id: `ev-${i}`,
        time: timed[1],
        title: timed[2].trim(),
      })
      continue
    }
    const titled = line.match(/^(Entry|Exit|Partial|Stop|Moved|Booked|Reversal|Confirmation|Final)[:\s]+(.+)$/i)
    if (titled) {
      events.push({ id: `ev-${i}`, title: titled[1], detail: titled[2].trim() })
      continue
    }
    if (line.length < 160 && !/^#{1,3}/.test(line)) {
      events.push({ id: `ev-${i}`, title: line })
    }
  }
  return events.slice(0, 12)
}

function parseMistakes(md: string): TradeDetailMistake[] {
  if (!md.trim()) return []
  const base = TRADE_MISTAKE_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    checked: false,
    notes: "",
    severity: p.severity,
  }))
  const parsed = parseMistakesMd(md, base).filter((m) => m.checked)
  if (parsed.length) {
    return parsed.map((m) => ({
      id: m.id,
      label: m.label,
      severity: m.severity,
      description: m.notes || "Marked during trade review.",
    }))
  }
  // Fallback: bullets without checkbox syntax
  return bulletPoints(md).slice(0, 8).map((text, i) => ({
    id: `m-${i}`,
    label: text.split(/[:—-]/)[0]!.trim().slice(0, 48),
    severity: "medium" as const,
    description: text,
  }))
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function buildAIReview(
  trade: JournalTrade,
  status: TradeDetailStatus,
  mistakes: TradeDetailMistake[],
  strengths: string[],
  psychScore: number | null,
): TradeDetailModel["aiReview"] {
  const grade = trade.grade?.trim() || (status === "win" ? "B+" : status === "loss" ? "C" : "B")
  const pnl = Number(trade.pnl ?? 0)
  const hasStop = trade.stop_price != null
  const execution = clampScore(
    (status === "win" ? 78 : status === "loss" ? 48 : 62) +
      (trade.grade ? 8 : 0) +
      (pnl !== 0 ? 4 : 0) -
      mistakes.length * 6,
  )
  const risk = clampScore(hasStop ? 72 : 42)
  const discipline = clampScore(100 - mistakes.filter((m) => m.severity === "high").length * 18 - mistakes.length * 6)
  const psychology = psychScore != null ? clampScore(psychScore * 10) : clampScore((discipline + execution) / 2)
  const quality = clampScore((execution + risk + discipline + psychology) / 4)

  const topMistakes = mistakes.slice(0, 3).map((m) => m.label)
  const topStrengths = strengths.slice(0, 3)
  if (!topStrengths.length && status === "win") topStrengths.push("Positive outcome")
  if (!topStrengths.length) topStrengths.push("Trade logged with review notes")

  const nextAction =
    mistakes[0]?.description?.slice(0, 160) ||
    (status === "loss"
      ? "Review entry criteria and stop discipline before the next similar setup."
      : "Reinforce what worked — keep sizing and confirmation rules consistent.")

  return {
    overallGrade: grade,
    executionScore: execution,
    psychologyScore: psychology,
    riskManagement: risk,
    discipline,
    tradeQuality: quality,
    topMistakes,
    topStrengths,
    nextAction,
  }
}

type WorkspaceMeta = { tradesMeta?: Record<string, TradeMetaPersist> }

export function mapJournalTradeToDetail(
  trade: JournalTrade,
  day: JournalDay,
  displayIndex: number,
): TradeDetailModel {
  let meta: TradeMetaPersist = {}
  if (day.workspace_meta_json) {
    try {
      const parsed = JSON.parse(day.workspace_meta_json) as WorkspaceMeta
      meta = parsed.tradesMeta?.[trade.id] ?? {}
    } catch {
      meta = {}
    }
  }

  const entry = trade.entry_price != null ? Number(trade.entry_price) : null
  const exit = trade.exit_price != null ? Number(trade.exit_price) : null
  const stop = trade.stop_price != null ? Number(trade.stop_price) : null
  const qty = trade.quantity != null ? Number(trade.quantity) : null
  const pnl = Number(trade.pnl ?? 0)
  const status = inferStatus(trade)
  const instrument = trade.instrument || trade.title_suffix || "Untitled"

  const thesis = sectionBody(trade, ["entry_logic", "thesis"])
  const setupMd = sectionBody(trade, ["trade_setup", "setup"])
  const happened = sectionBody(trade, ["trade_management", "what_happened", "happened"])
  const wentWell = sectionBody(trade, ["what_went_well", "went_well", "success"])
  const lessons = sectionBody(trade, ["next_time", "lesson"])
  const mistakesMd = sectionBody(trade, ["mistake"])
  const notes = sectionBody(trade, ["uncategorized", "note"])
  const analysis = sectionBody(trade, ["analysis", "psychology"])

  const successPoints = bulletPoints(wentWell).slice(0, 8)
  const mistakes = parseMistakes(mistakesMd)
  const timeline = parseTimeline(happened)
  // If "what went well" is a paragraph (no bullets), keep one readable card
  const wentWellPoints =
    successPoints.length > 0
      ? successPoints
      : wentWell.trim()
        ? [wentWell.trim()]
        : []

  const psych = meta.psychology
  const bars = psych
    ? [
        { id: "confidence", label: "Confidence", value: psych.confidence },
        { id: "discipline", label: "Discipline", value: psych.discipline },
        { id: "patience", label: "Patience", value: psych.patience },
        { id: "execution", label: "Execution", value: psych.executionFocus },
      ]
    : null
  const psychScore = bars
    ? bars.reduce((s, b) => s + b.value, 0) / bars.length
    : null

  // Parse mood from analysis markdown if meta missing
  let mood = psych?.mood || ""
  if (!mood && analysis) {
    const m = analysis.match(/\*\*Mood:\*\*\s*([^\n*]+)/i)
    if (m) mood = m[1].trim()
  }

  return {
    id: trade.id,
    tradeIndex: displayIndex,
    instrument,
    strike: parseStrike(instrument),
    direction: trade.direction,
    grade: trade.grade,
    result: trade.result,
    status,
    pnl,
    pnlLabel: formatMoney2(pnl),
    tradeDate: formatJournalDate(meta.tradeDate || day.journal_date),
    metrics: [
      { id: "entry", label: "Entry", value: num2(entry) },
      { id: "exit", label: "Exit", value: num2(exit) },
      { id: "qty", label: "Quantity", value: num2(qty) },
      { id: "stop", label: "Stop Loss", value: num2(stop) },
      {
        id: "rr",
        label: "Risk Reward",
        value: riskReward(entry, exit, stop, trade.direction),
        tone: "accent",
      },
      {
        id: "hold",
        label: "Duration",
        value:
          meta.holdingTime ||
          holdingDuration(meta.entryTime || "", meta.exitTime || "") ||
          "—",
      },
      {
        id: "pnl",
        label: "Net P&L",
        value: formatMoney2(pnl),
        tone: pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral",
      },
    ],
    setupChips: setupChips(trade, setupMd),
    thesis,
    timeline,
    whatHappenedProse: timeline.length ? "" : happened,
    whatWentWell: wentWellPoints.map((text, i) => ({ id: `ok-${i}`, text })),
    mistakes,
    lesson: lessons,
    psychology: bars
      ? {
          mood,
          bars,
          overallScore: Number(psychScore!.toFixed(1)),
          notes: psych?.emotionNotes || "",
        }
      : analysis
        ? {
            mood,
            bars: [],
            overallScore: 0,
            notes: analysis,
          }
        : null,
    screenshots: [...(trade.attachments ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        id: a.id,
        label: a.file_name || a.caption || `T${displayIndex}`,
        attachmentId: a.id,
        status: a.import_status,
      })),
    aiReview: buildAIReview(trade, status, mistakes, wentWellPoints, psychScore),
    notes,
  }
}

export function mapDayTradesToDetails(day: JournalDay): TradeDetailModel[] {
  return [...(day.trades ?? [])]
    .sort((a, b) => a.trade_index - b.trade_index)
    .map((t, i) => mapJournalTradeToDetail(t, day, i + 1))
}
