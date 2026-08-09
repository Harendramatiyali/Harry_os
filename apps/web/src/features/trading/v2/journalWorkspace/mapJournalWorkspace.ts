import type { JournalDay, JournalDaySection, JournalTrade } from "@/features/trading/types"
import {
  formatJournalDate,
  formatMoney2,
  num2,
  resolveDayPnl,
  stripWikilinks,
} from "@/features/trading/v2/mapJournalToV2"
import type { TradeMetaPersist } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import type {
  JournalChip,
  JournalMetric,
  JournalProseBlock,
  JournalPsychBar,
  JournalShot,
  JournalWorkspacePanel,
} from "@/features/trading/v2/journalWorkspace/types"
import { mapDayOpportunityAnalyses } from "@/features/trading/v2/opportunityAnalysis/mapOpportunityAnalysis"
import { mapLearningCoach } from "@/features/trading/v2/learningCoach/mapLearningCoach"

function clean(body: string | null | undefined): string {
  return stripWikilinks(body ?? "").trim()
}

function hay(s: { section_key: string; heading_original: string | null }) {
  return `${s.section_key} ${s.heading_original ?? ""}`.toLowerCase()
}

function matches(s: { section_key: string; heading_original: string | null }, needles: string[]) {
  const h = hay(s)
  return needles.some((n) => h.includes(n))
}

function titleOf(s: JournalDaySection): string {
  return s.heading_original?.replace(/^[#\s]+/, "").trim() || s.section_key.replace(/_/g, " ")
}

function tradeIsWin(t: JournalTrade): boolean {
  const r = (t.result || "").toLowerCase()
  if (/win|profit|green/.test(r)) return true
  if (/loss|lose|red/.test(r)) return false
  return Number(t.pnl ?? 0) > 0
}

function collectShots(day: JournalDay): JournalShot[] {
  const out: JournalShot[] = []
  for (const a of [...(day.attachments ?? [])].sort((x, y) => x.sort_order - y.sort_order)) {
    out.push({
      id: a.id,
      label: a.file_name || a.caption || "Day chart",
      attachmentId: a.id,
      status: a.import_status,
      scope: "Day",
    })
  }
  const alive = [...(day.trades ?? [])].sort((a, b) => a.trade_index - b.trade_index)
  alive.forEach((t, i) => {
    for (const a of [...(t.attachments ?? [])].sort((x, y) => x.sort_order - y.sort_order)) {
      out.push({
        id: a.id,
        label: a.file_name || a.caption || `Trade ${i + 1}`,
        attachmentId: a.id,
        status: a.import_status,
        scope: `T${i + 1}`,
      })
    }
  })
  return out
}

function daySections(day: JournalDay, needles: string[]): JournalDaySection[] {
  return [...(day.sections ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((s) => matches(s, needles) && clean(s.body_markdown))
}

function tradeSections(
  day: JournalDay,
  needles: string[],
): Array<JournalDaySection & { tradeLabel: string }> {
  const out: Array<JournalDaySection & { tradeLabel: string }> = []
  const alive = [...(day.trades ?? [])].sort((a, b) => a.trade_index - b.trade_index)
  alive.forEach((t, i) => {
    for (const s of t.sections ?? []) {
      if (matches(s, needles) && clean(s.body_markdown)) {
        out.push({
          id: `${t.id}-${s.id}`,
          section_key: s.section_key,
          heading_original: s.heading_original,
          body_markdown: s.body_markdown,
          sort_order: 900 + t.trade_index,
          tradeLabel: `Trade #${i + 1}`,
        })
      }
    }
  })
  return out
}

type WorkspaceMeta = { tradesMeta?: Record<string, TradeMetaPersist> }

function tradesMeta(day: JournalDay): Record<string, TradeMetaPersist> {
  if (!day.workspace_meta_json) return {}
  try {
    const parsed = JSON.parse(day.workspace_meta_json) as WorkspaceMeta
    return parsed.tradesMeta ?? {}
  } catch {
    return {}
  }
}

function aggregatePsych(day: JournalDay): {
  bars: JournalPsychBar[]
  overall: number | null
  mood: string | null
} {
  const meta = tradesMeta(day)
  const rows = Object.values(meta)
    .map((m) => m.psychology)
    .filter(Boolean) as NonNullable<TradeMetaPersist["psychology"]>[]
  if (!rows.length) return { bars: [], overall: null, mood: null }
  const avg = (key: "confidence" | "discipline" | "patience" | "executionFocus") =>
    rows.reduce((s, r) => s + (r[key] ?? 0), 0) / rows.length
  const bars: JournalPsychBar[] = [
    { id: "confidence", label: "Confidence", value: Number(avg("confidence").toFixed(1)) },
    { id: "discipline", label: "Discipline", value: Number(avg("discipline").toFixed(1)) },
    { id: "patience", label: "Patience", value: Number(avg("patience").toFixed(1)) },
    { id: "execution", label: "Execution", value: Number(avg("executionFocus").toFixed(1)) },
  ]
  const overall = bars.reduce((s, b) => s + b.value, 0) / bars.length
  const moodCounts = new Map<string, number>()
  for (const r of rows) {
    if (!r.mood) continue
    moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1)
  }
  const mood =
    [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { bars, overall: Number(overall.toFixed(1)), mood }
}

function chipTone(i: number): JournalChip["tone"] {
  const tones: JournalChip["tone"][] = ["blue", "violet", "amber", "emerald", "rose", "slate"]
  return tones[i % tones.length]
}

export function mapJournalWorkspacePanel(
  day: JournalDay,
  tab: string,
): JournalWorkspacePanel | null {
  const title = day.title?.trim() || day.primary_instrument || formatJournalDate(day.journal_date)
  const shots = collectShots(day)
  const pnl = resolveDayPnl(day)
  const trades = [...(day.trades ?? [])].sort((a, b) => a.trade_index - b.trade_index)
  const wins = trades.filter(tradeIsWin).length
  const losses = trades.filter((t) => !tradeIsWin(t) && Number(t.pnl ?? 0) < 0).length

  if (tab === "overview") {
    const summarySec =
      daySections(day, ["summary", "overview", "closing_note"])[0] ??
      daySections(day, ["market_context", "uncategorized"])[0]
    const summaryBody =
      (summarySec && clean(summarySec.body_markdown)) ||
      clean(day.uncategorized_markdown) ||
      clean(day.raw_markdown).slice(0, 1800)

    const lessonSec = daySections(day, ["lesson", "takeaway", "daily_learning", "key", "lessons"])[0]
    const tags = (day.tags ?? []).map((t, i) => ({
      id: `tag-${i}`,
      label: t,
      tone: chipTone(i),
    }))

    const metrics: JournalMetric[] = [
      { id: "trades", label: "Trades", value: String(day.trade_count ?? trades.length) },
      { id: "wins", label: "Wins", value: String(wins), tone: "positive" },
      { id: "losses", label: "Losses", value: String(losses), tone: losses ? "negative" : "neutral" },
      {
        id: "wr",
        label: "Win Rate",
        value: trades.length ? `${((wins / trades.length) * 100).toFixed(0)}%` : "—",
        tone: "accent",
      },
      {
        id: "focus",
        label: "Focus",
        value: day.primary_instrument || "—",
      },
      {
        id: "pnl",
        label: "Net P&L",
        value: formatMoney2(pnl),
        tone: pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral",
      },
    ]

    return {
      tab: "overview",
      title,
      dateLabel: formatJournalDate(day.journal_date),
      bias: day.day_bias,
      result: day.day_result,
      grade: day.overall_grade,
      pnl,
      pnlLabel: formatMoney2(pnl),
      metrics,
      tags,
      summary: summaryBody
        ? {
            id: "summary",
            title: summarySec ? titleOf(summarySec) : "Session notes",
            body: summaryBody,
            tone: "sky",
            icon: "book",
          }
        : null,
      takeaway: lessonSec ? clean(lessonSec.body_markdown).slice(0, 600) : null,
      shots: shots.slice(0, 8),
    }
  }

  if (tab === "market-analysis") {
    const needles = [
      "market_context",
      "market_observation",
      "pre_market",
      "intraday",
      "trading_plan",
      "market",
      "context",
      "analysis",
      "observation",
      "bias",
      "plan",
    ]
    const secs = daySections(day, needles)
    const blocks: JournalProseBlock[] = secs.map((s, i) => {
      const key = s.section_key.toLowerCase()
      const icon: JournalProseBlock["icon"] =
        key.includes("plan") ? "plan" : key.includes("pre") ? "flag" : "market"
      const tone: JournalProseBlock["tone"] =
        key.includes("plan") ? "violet" : key.includes("pre") ? "amber" : "sky"
      return {
        id: s.id || `mkt-${i}`,
        title: titleOf(s),
        body: clean(s.body_markdown),
        icon,
        tone,
      }
    })
    if (!blocks.length) {
      const fallback =
        clean(day.uncategorized_markdown) || clean(day.raw_markdown).slice(0, 2000)
      if (fallback) {
        blocks.push({
          id: "fallback",
          title: "Market notes",
          body: fallback,
          icon: "market",
          tone: "sky",
        })
      }
    }
    return {
      tab: "market-analysis",
      title,
      blocks,
      shots: shots.slice(0, 8),
      emptyHint: blocks.length
        ? undefined
        : "No market context section found in this journal.",
    }
  }

  if (tab === "psychology") {
    const psych = aggregatePsych(day)
    const dayNotes = daySections(day, [
      "psychology",
      "psych",
      "emotion",
      "mind",
      "mindset",
      "reflection",
      "feeling",
      "confidence",
      "discipline",
    ]).map((s, i) => ({
      id: s.id || `psy-${i}`,
      title: titleOf(s),
      body: clean(s.body_markdown),
      tone: "violet" as const,
      icon: "brain" as const,
    }))
    const tradeNotes = tradeSections(day, ["psych", "emotion", "mind", "analysis"]).map((s, i) => ({
      id: s.id || `tpsy-${i}`,
      title: `${s.tradeLabel} · ${titleOf(s)}`,
      body: clean(s.body_markdown),
      tone: "violet" as const,
      icon: "brain" as const,
    }))
    const hasContent = dayNotes.length + tradeNotes.length + psych.bars.length > 0
    return {
      tab: "psychology",
      title,
      overallScore: psych.overall,
      mood: psych.mood,
      bars: psych.bars,
      dayNotes,
      tradeNotes,
      synthesized: hasContent ? null : fallbackSynthesizedCopy("psychology", day),
    }
  }

  if (tab === "learning" || tab === "mistakes" || tab === "lessons") {
    return {
      tab: "learning",
      title,
      coach: mapLearningCoach(day),
    }
  }

  if (tab === "screenshots") {
    const ready = shots.filter((s) => !s.status || s.status === "copied").length
    return {
      tab: "screenshots",
      title,
      readyCount: ready,
      totalCount: shots.length,
      shots,
      emptyHint: shots.length
        ? undefined
        : "No screenshots linked. Add charts in Create Journal or sync Obsidian media.",
    }
  }

  if (tab === "opportunity-analysis") {
    const analyses = mapDayOpportunityAnalyses(day)
    return {
      tab: "opportunity-analysis",
      title,
      analyses,
      emptyHint: analyses.length
        ? undefined
        : "No trades yet. Opportunity Analysis appears after you log trades and the best price after exit.",
    }
  }

  return null
}

/** Used when psychology needs derived fallback text shown inside the panel. */
export function fallbackSynthesizedCopy(tab: string, day: JournalDay): string {
  const pnl = resolveDayPnl(day)
  const trades = day.trades ?? []
  const wins = trades.filter(tradeIsWin).length
  if (tab === "psychology") {
    return [
      `Session P&L ${formatMoney2(pnl)} across ${trades.length} trades (${wins} wins).`,
      day.day_bias ? `Bias: ${day.day_bias}.` : null,
      "Add psychology notes in Create Journal for progress bars and mood tracking.",
    ]
      .filter(Boolean)
      .join(" ")
  }
  return ""
}

export function overviewWinLoss(day: JournalDay): { wins: number; losses: number } {
  const trades = day.trades ?? []
  return {
    wins: trades.filter(tradeIsWin).length,
    losses: trades.filter((t) => !tradeIsWin(t) && Number(t.pnl ?? 0) < 0).length,
  }
}

export function formatQty(n: number | string | null | undefined): string {
  return num2(n)
}
