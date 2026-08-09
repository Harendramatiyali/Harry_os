import type { JournalDay, JournalDaySection } from "@/features/trading/types"
import {
  formatJournalDate,
  formatMoney2,
  resolveDayPnl,
  stripWikilinks,
} from "@/features/trading/v2/mapJournalToV2"
import type { TradeMetaPersist } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { parseMistakesMd, TRADE_MISTAKE_PRESETS } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { mapDayOpportunityAnalyses } from "@/features/trading/v2/opportunityAnalysis/mapOpportunityAnalysis"
import type {
  CoachHeatItem,
  CoachLessonItem,
  CoachMemoryItem,
  CoachMistakeItem,
  CoachPlanItem,
  CoachScore,
  CoachSeverity,
  LearningCoachModel,
} from "@/features/trading/v2/learningCoach/types"

function clean(body: string | null | undefined): string {
  return stripWikilinks(body ?? "").trim()
}

function hay(s: { section_key: string; heading_original: string | null }) {
  return `${s.section_key} ${s.heading_original ?? ""}`.toLowerCase()
}

function matches(s: { section_key: string; heading_original: string | null }, needles: string[]) {
  return needles.some((n) => hay(s).includes(n))
}

function titleOf(s: JournalDaySection): string {
  return s.heading_original?.replace(/^[#\s]+/, "").trim() || s.section_key.replace(/_/g, " ")
}

function bullets(md: string): string[] {
  const out: string[] = []
  for (const raw of md.split("\n")) {
    const line = raw.trim()
    if (!line || /^#{1,3}\s/.test(line)) continue
    const m = line.match(/^(?:[-*•]|\d+[.)]|✓|✔|✅|💡|□|☐|☑|\[(?: |x|X)\])\s*(.+)/)
    if (m) {
      out.push(m[1].replace(/\*\*/g, "").replace(/\[[ xX]\]\s*/g, "").trim())
      continue
    }
    if (line.length > 12 && !/^---+/.test(line)) out.push(line.replace(/\*\*/g, "").trim())
  }
  return [...new Set(out.filter(Boolean))]
}

function daySections(day: JournalDay, needles: string[]): JournalDaySection[] {
  return [...(day.sections ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((s) => matches(s, needles) && clean(s.body_markdown))
}

function tradeSections(
  day: JournalDay,
  needles: string[],
): Array<{ section: JournalDaySection; tradeIndex: number; tradeId: string; tradeLabel: string }> {
  const out: Array<{
    section: JournalDaySection
    tradeIndex: number
    tradeId: string
    tradeLabel: string
  }> = []
  const alive = [...(day.trades ?? [])].sort((a, b) => a.trade_index - b.trade_index)
  alive.forEach((t, i) => {
    for (const s of t.sections ?? []) {
      if (matches(s, needles) && clean(s.body_markdown)) {
        out.push({
          section: {
            id: `${t.id}-${s.id}`,
            section_key: s.section_key,
            heading_original: s.heading_original,
            body_markdown: s.body_markdown,
            sort_order: s.sort_order,
          },
          tradeIndex: i + 1,
          tradeId: t.id,
          tradeLabel: `Trade #${i + 1}`,
        })
      }
    }
  })
  return out
}

function severityRank(s: CoachSeverity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1
}

function parseMistakesFromMd(
  md: string,
  source: string,
  tradeIndex: number | null,
): Array<Omit<CoachMistakeItem, "sessionCount" | "impact" | "impactLabel" | "explanation">> {
  const base = TRADE_MISTAKE_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    checked: false,
    notes: "",
    severity: p.severity as CoachSeverity,
  }))
  const parsed = parseMistakesMd(md, base).filter((m) => m.checked)
  if (parsed.length) {
    return parsed.map((m) => ({
      id: `${source}-${m.id}`,
      title: m.label,
      severity: m.severity,
      source,
      body: m.notes || undefined,
      tradeIndex,
    }))
  }
  return bullets(md)
    .slice(0, 12)
    .map((text, i) => ({
      id: `${source}-b-${i}`,
      title: text.split(/[:—-]/)[0]!.trim().slice(0, 72),
      severity: /fear|fomo|revenge|no\s*stop|overtrad/i.test(text)
        ? ("high" as const)
        : ("medium" as const),
      source,
      body: text,
      tradeIndex,
    }))
}

function inferCategory(text: string): string {
  const t = text.toLowerCase()
  if (/stop|trail|target|exit|entry/.test(t)) return "Trade Management"
  if (/fear|fomo|emotion|discipline|revenge|patience/.test(t)) return "Psychology"
  if (/breakout|retest|vwap|ema|price|level|candle/.test(t)) return "Price Action"
  if (/plan|rule|risk|size|position/.test(t)) return "Process"
  return "General"
}

function importanceOf(text: string, isHero: boolean): number {
  if (isHero) return 5
  if (/must|always|never|critical/.test(text.toLowerCase())) return 5
  if (/should|important/.test(text.toLowerCase())) return 4
  return 3
}

type WorkspaceMeta = {
  tradesMeta?: Record<string, TradeMetaPersist>
  mistakes?: Array<{ label: string; checked: boolean; severity?: string; notes?: string }>
}

function parseWorkspace(day: JournalDay): WorkspaceMeta {
  if (!day.workspace_meta_json) return {}
  try {
    return JSON.parse(day.workspace_meta_json) as WorkspaceMeta
  } catch {
    return {}
  }
}

function gradeFromScores(avg: number): string {
  if (avg >= 90) return "A"
  if (avg >= 80) return "B+"
  if (avg >= 70) return "B"
  if (avg >= 60) return "C+"
  if (avg >= 50) return "C"
  return "D"
}

export function mapLearningCoach(day: JournalDay): LearningCoachModel {
  const title = day.title?.trim() || day.primary_instrument || formatJournalDate(day.journal_date)
  const dateLabel = formatJournalDate(day.journal_date)
  const opportunities = mapDayOpportunityAnalyses(day)
  const meta = parseWorkspace(day)

  const rawMistakes: Array<
    Omit<CoachMistakeItem, "sessionCount" | "impact" | "impactLabel" | "explanation">
  > = []

  for (const s of daySections(day, ["mistakes", "mistake", "error", "what_went_wrong", "root_cause"])) {
    rawMistakes.push(...parseMistakesFromMd(clean(s.body_markdown), "Day", null))
  }
  for (const row of tradeSections(day, ["mistake", "error", "wrong", "root_cause"])) {
    rawMistakes.push(
      ...parseMistakesFromMd(clean(row.section.body_markdown), row.tradeLabel, row.tradeIndex),
    )
  }
  // Day-level checklist from workspace meta (if sections empty)
  if (!rawMistakes.length && meta.mistakes?.length) {
    for (const m of meta.mistakes.filter((x) => x.checked)) {
      rawMistakes.push({
        id: `meta-${m.label}`,
        title: m.label,
        severity:
          m.severity === "high" || m.severity === "low" || m.severity === "medium"
            ? m.severity
            : "medium",
        source: "Day",
        body: m.notes || undefined,
        tradeIndex: null,
      })
    }
  }

  const countByTitle = new Map<string, number>()
  for (const m of rawMistakes) {
    const k = m.title.toLowerCase()
    countByTitle.set(k, (countByTitle.get(k) ?? 0) + 1)
  }

  const mistakes: CoachMistakeItem[] = rawMistakes.map((m) => {
    const oa =
      m.tradeIndex != null
        ? opportunities.find((o) => o.tradeIndex === m.tradeIndex)
        : opportunities
            .filter((o) => (o.potentialExtraProfit ?? 0) > 0)
            .sort((a, b) => (b.potentialExtraProfit ?? 0) - (a.potentialExtraProfit ?? 0))[0]

    const early =
      /early\s*exit|exited\s*too\s*early|fear|fomo/i.test(`${m.title} ${m.body ?? ""}`)
    const impact =
      early && oa?.potentialExtraProfit != null && oa.potentialExtraProfit > 0
        ? oa.potentialExtraProfit
        : null

    let explanation = m.body?.trim() || ""
    if (!explanation && oa?.observation) explanation = oa.observation
    if (!explanation) {
      explanation =
        m.severity === "high"
          ? "High-severity pattern logged for this session — review before the next trade."
          : "Logged during review. Capture notes in Edit Journal to sharpen the coach explanation."
    }

    return {
      ...m,
      sessionCount: countByTitle.get(m.title.toLowerCase()) ?? 1,
      impact,
      impactLabel: impact != null ? formatMoney2(impact) : "—",
      explanation,
    }
  })

  // Dedupe by title keeping highest severity / impact
  const deduped = new Map<string, CoachMistakeItem>()
  for (const m of mistakes) {
    const k = m.title.toLowerCase()
    const prev = deduped.get(k)
    if (
      !prev ||
      severityRank(m.severity) > severityRank(prev.severity) ||
      (m.impact ?? 0) > (prev.impact ?? 0)
    ) {
      deduped.set(k, { ...m, sessionCount: countByTitle.get(k) ?? m.sessionCount })
    }
  }
  const mistakeList = [...deduped.values()].sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      (b.impact ?? 0) - (a.impact ?? 0) ||
      b.sessionCount - a.sessionCount,
  )

  const biggestMistake = mistakeList[0] ?? null

  const lessonItems: CoachLessonItem[] = []
  const lessonSecs = [
    ...daySections(day, [
      "lessons",
      "lesson",
      "learning",
      "daily_learning",
      "takeaway",
      "next_time",
      "rules_reinforced",
    ]).map((s) => ({ body: clean(s.body_markdown), source: `Day · ${titleOf(s)}` })),
    ...tradeSections(day, ["lesson", "learning", "next_time", "takeaway"]).map((r) => ({
      body: clean(r.section.body_markdown),
      source: `${r.tradeLabel} · ${titleOf(r.section)}`,
    })),
  ]
  for (const [si, sec] of lessonSecs.entries()) {
    const pts = bullets(sec.body)
    const chunks = pts.length ? pts : sec.body ? [sec.body.slice(0, 280)] : []
    for (const [i, text] of chunks.entries()) {
      const title = text.split(/[.!?\n]/)[0]!.trim().slice(0, 100) || text.slice(0, 80)
      lessonItems.push({
        id: `lesson-${si}-${i}`,
        title,
        body: text,
        source: sec.source,
        category: inferCategory(text),
        importance: importanceOf(text, i === 0 && si === 0),
        appliesTo: /breakout/i.test(text)
          ? "Breakout Trades"
          : /retest/i.test(text)
            ? "Retest Trades"
            : day.primary_instrument || "Session trades",
        createdLabel: dateLabel,
      })
    }
  }

  const biggestLesson = lessonItems[0]
    ? { ...lessonItems[0], importance: 5 }
    : null

  const actionSec = daySections(day, ["action_items", "action", "tomorrow", "focus_next"])[0]
  const planBullets = actionSec ? bullets(clean(actionSec.body_markdown)) : []
  const defaultPlan = [
    "Hold winners longer",
    "Trail stop-loss",
    "Wait for candle confirmation",
    "No revenge trading",
    "Follow trading plan",
  ]
  const planSource = planBullets.length ? planBullets : mistakeList.length || lessonItems.length ? defaultPlan : []
  const plan: CoachPlanItem[] = planSource.slice(0, 8).map((label, i) => ({
    id: `plan-${i}-${label.slice(0, 24)}`,
    label: label.replace(/^\[.\]\s*/, ""),
    suggestedDone: /^\[x\]/i.test(planBullets[i] ?? "") || /✓|done/i.test(label),
  }))

  // Scores from psych meta + mistakes + opportunity
  const psychRows = Object.values(meta.tradesMeta ?? {})
    .map((m) => m.psychology)
    .filter(Boolean) as NonNullable<TradeMetaPersist["psychology"]>[]
  const avgPsych = (key: "confidence" | "discipline" | "patience" | "executionFocus") =>
    psychRows.length
      ? psychRows.reduce((s, r) => s + (r[key] ?? 0), 0) / psychRows.length
      : null

  const highMistakes = mistakeList.filter((m) => m.severity === "high").length
  const avgEff =
    opportunities.filter((o) => o.exitEfficiencyPct != null).length > 0
      ? opportunities
          .filter((o) => o.exitEfficiencyPct != null)
          .reduce((s, o) => s + (o.exitEfficiencyPct ?? 0), 0) /
        opportunities.filter((o) => o.exitEfficiencyPct != null).length
      : null

  const discipline = Math.max(
    15,
    Math.min(98, Math.round((avgPsych("discipline") ?? 6) * 10 - highMistakes * 12)),
  )
  const execution = Math.max(
    15,
    Math.min(98, Math.round((avgPsych("executionFocus") ?? 6) * 10 - mistakeList.length * 4)),
  )
  const psychology = Math.max(
    15,
    Math.min(98, Math.round((avgPsych("confidence") ?? 5.5) * 9 + (avgPsych("patience") ?? 5.5) * 1)),
  )
  const risk = Math.max(
    20,
    Math.min(98, Math.round(70 - highMistakes * 10 + (resolveDayPnl(day) >= 0 ? 8 : -5))),
  )
  const tradeMgmt = Math.max(
    15,
    Math.min(98, Math.round(avgEff != null ? avgEff : 55 - mistakeList.length * 5)),
  )
  const scores: CoachScore[] = [
    { id: "discipline", label: "Discipline", value: discipline },
    { id: "execution", label: "Execution", value: execution },
    { id: "psychology", label: "Psychology", value: psychology },
    { id: "risk", label: "Risk Management", value: risk },
    { id: "management", label: "Trade Management", value: tradeMgmt },
  ]
  const avgScore = scores.reduce((s, x) => s + x.value, 0) / scores.length
  const overallGrade = day.overall_grade?.trim() || gradeFromScores(avgScore)

  const strengths: string[] = []
  if (resolveDayPnl(day) > 0) strengths.push("Session finished green")
  if ((avgPsych("discipline") ?? 0) >= 7) strengths.push("Solid discipline scores")
  if (avgEff != null && avgEff >= 60) strengths.push("Decent exit capture vs target")
  if (!highMistakes) strengths.push("No high-severity mistakes logged")
  if (lessonItems.length) strengths.push("Lessons captured for review")
  while (strengths.length < 3) {
    const fillers = [
      "Showed up and journaled the session",
      "Reviewed trades with structure",
      "Kept a written plan trail",
    ]
    for (const f of fillers) {
      if (!strengths.includes(f)) strengths.push(f)
      if (strengths.length >= 3) break
    }
    break
  }

  const weaknesses: string[] = mistakeList.slice(0, 3).map((m) => m.title)
  if (!weaknesses.length && avgEff != null && avgEff < 45) {
    weaknesses.push("Low exit efficiency vs planned target")
  }
  if (!weaknesses.length) weaknesses.push("Add mistake tags to unlock sharper coaching")

  const tomorrowAction =
    plan[0]?.label ||
    biggestLesson?.title ||
    "Pick one rule to protect before the next entry."

  const coachNote = biggestMistake
    ? `Your mentor flag today: ${biggestMistake.title}. ${biggestMistake.explanation.slice(0, 160)}`
    : biggestLesson
      ? `Carry this lesson into the open: ${biggestLesson.title}`
      : "Log mistakes and lessons in Edit Journal so your coach can speak with specifics."

  // Session-local “memory” heuristic from repeat titles
  const memory: CoachMemoryItem[] = mistakeList.slice(0, 5).map((m) => {
    const seen = m.sessionCount
    const applied = 0
    const ignored = Math.max(0, seen - applied)
    return {
      id: m.id,
      title: m.title,
      seen,
      ignored,
      applied,
      successRate: seen > 0 ? Math.round((applied / seen) * 100) : null,
    }
  })
  // Also add lesson hero as memory row
  if (biggestLesson) {
    memory.unshift({
      id: `mem-${biggestLesson.id}`,
      title: biggestLesson.title,
      seen: 1,
      ignored: 0,
      applied: 0,
      successRate: null,
    })
  }

  const maxHeat = Math.max(1, ...mistakeList.map((m) => m.sessionCount))
  const heatmap: CoachHeatItem[] = mistakeList.slice(0, 6).map((m) => ({
    id: m.id,
    label: m.title,
    count: m.sessionCount,
    intensity: m.sessionCount / maxHeat,
  }))

  const empty = !mistakeList.length && !lessonItems.length && !plan.length

  return {
    title,
    dateLabel,
    journalId: day.id,
    biggestMistake,
    biggestLesson,
    mistakes: mistakeList,
    lessons: lessonItems.slice(0, 12),
    plan,
    scores,
    overallGrade,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    tomorrowAction,
    coachNote,
    memory: memory.slice(0, 6),
    heatmap,
    empty,
  }
}
