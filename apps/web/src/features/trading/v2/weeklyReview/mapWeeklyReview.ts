import type { JournalAnalytics, JournalDay, JournalTrade } from "@/features/trading/types"
import {
  formatMoney2,
  resolveDayPnl,
  stripWikilinks,
} from "@/features/trading/v2/mapJournalToV2"
import { parseMistakesMd, TRADE_MISTAKE_PRESETS } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { eachTradingDay, weekdayShort } from "@/features/trading/v2/weeklyReview/weekRange"
import type {
  PriorityLevel,
  Severity,
  WeeklyDayBrief,
  WeeklyReviewModel,
  WeeklySetupStat,
} from "@/features/trading/v2/weeklyReview/types"

function clean(body: string | null | undefined): string {
  return stripWikilinks(body ?? "").trim()
}

function bullets(md: string): string[] {
  const out: string[] = []
  for (const raw of md.split("\n")) {
    const line = raw.trim()
    if (!line || /^#{1,3}\s/.test(line) || /^---+/.test(line)) continue
    const m = line.match(/^(?:[-*•]|\d+[.)]|✓|✔|✅|💡|□|☐|☑|❌|✘|\[(?: |x|X)\])\s*(.+)/)
    if (m) {
      out.push(m[1].replace(/\*\*/g, "").replace(/\[[ xX]\]\s*/g, "").trim())
      continue
    }
    if (line.length > 16) out.push(line.replace(/\*\*/g, "").trim())
  }
  return [...new Set(out.filter(Boolean))]
}

function hay(s: { section_key: string; heading_original: string | null }) {
  return `${s.section_key} ${s.heading_original ?? ""}`.toLowerCase()
}

function matchKey(s: { section_key: string; heading_original: string | null }, needles: string[]) {
  return needles.some((n) => hay(s).includes(n))
}

function num(n: number | string | null | undefined): number {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

function sparkFrom(values: number[]): number[] {
  if (!values.length) return [0.2, 0.3, 0.25, 0.4, 0.35]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values.map((v) => 0.15 + ((v - min) / span) * 0.75)
}

function gradeFromScores(avg: number, pnl: number): string {
  if (avg >= 88 && pnl > 0) return "A"
  if (avg >= 80) return "A-"
  if (avg >= 72) return "B+"
  if (avg >= 65) return "B"
  if (avg >= 55) return "C+"
  if (avg >= 45) return "C"
  return "D"
}

function starsForGrade(g: string): number {
  if (g.startsWith("A")) return 5
  if (g.startsWith("B")) return 4
  if (g.startsWith("C")) return 3
  return 2
}

function sevRank(s: Severity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1
}

function weekdayLong(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" })
}

/** Canonical setup labels we recognize from journal text (never invent beyond these + freeform column). */
const SETUP_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "False Breakout", re: /false\s*break\s*out|fake\s*break/i },
  { label: "M Pattern", re: /\bm\s*pattern\b/i },
  { label: "W Pattern", re: /\bw\s*pattern\b/i },
  { label: "Demand Zone", re: /demand\s*zone/i },
  { label: "Supply Zone", re: /supply\s*zone|supply\s*rejection/i },
  { label: "Support & Resistance", re: /support|resistance|\bs&r\b|key\s*level/i },
  { label: "Liquidity Sweep", re: /liquidity\s*sweep/i },
  { label: "Trend Continuation", re: /trend\s*continuation|continuation/i },
  { label: "Retracement / Retest", re: /retest|retracement/i },
  { label: "Reversal", re: /reversal/i },
  { label: "Breakdown", re: /\bbreak\s*down\b|\bbreakdown\b/i },
  { label: "Breakout", re: /\bbreak\s*out\b|\bbreakout\b/i },
  { label: "Price Action", re: /price\s*action/i },
]

function sectionBody(trade: JournalTrade, needles: string[]): string {
  return (trade.sections ?? [])
    .filter((s) => matchKey(s, needles) && clean(s.body_markdown))
    .map((s) => clean(s.body_markdown))
    .join("\n")
}

/**
 * Resolve setup from journal evidence only:
 * 1) trade_setup / setup section tags & keywords
 * 2) non-generic setup column
 * 3) entry_logic keywords
 * Never invent a setup — fall back to "Unspecified".
 */
export function resolveTradeSetup(trade: JournalTrade): string {
  const setupMd = sectionBody(trade, ["trade_setup", "setup_type", "setup"])
  const entryMd = sectionBody(trade, ["entry_logic", "thesis", "what_happened"])
  const blob = `${setupMd}\n${entryMd}\n${trade.setup ?? ""}`

  const hits = SETUP_PATTERNS.filter((p) => p.re.test(blob)).map((p) => p.label)
  // Prefer specific over generic Breakout when both match
  const ordered = hits.filter((h) => h !== "Breakout" && h !== "Price Action")
  if (ordered.length) return ordered[0]!
  if (hits.includes("Price Action")) return "Price Action"
  if (hits.includes("Breakout")) {
    // Only trust Breakout if section/column explicitly says so without richer tags
    const col = (trade.setup || "").trim()
    if (/^breakout$/i.test(col) && !setupMd.trim()) {
      // default form value with no evidence → Unspecified rather than pollute charts
      return "Unspecified"
    }
    return "Breakout"
  }

  const col = (trade.setup || "").trim()
  if (col && !/^breakout$/i.test(col)) return col.slice(0, 64)
  if (setupMd) {
    const first = bullets(setupMd)[0]
    if (first) return first.split(/[:—-]/)[0]!.trim().slice(0, 64)
  }
  return "Unspecified"
}

function normalizeMistakeTitle(title: string): string {
  const t = title.toLowerCase()
  if (/early\s*exit|exited\s*too\s*early|trail.*early|tightened\s*stop/i.test(t)) return "Early Exit"
  if (/meeting|distract/i.test(t)) return "Trading During Distraction"
  if (/fomo|chase/i.test(t)) return "FOMO / Chasing"
  if (/emotional/i.test(t)) return "Emotional Exit"
  if (/overtrad/i.test(t)) return "Overtrading"
  if (/no\s*stop|without\s*stop/i.test(t)) return "No Stop Loss"
  if (/revenge/i.test(t)) return "Revenge Trading"
  return title.trim().slice(0, 72)
}

function parseWorkspaceEntryTime(day: JournalDay, tradeId: string): string | null {
  if (!day.workspace_meta_json) return null
  try {
    const meta = JSON.parse(day.workspace_meta_json) as {
      tradesMeta?: Record<string, { entryTime?: string }>
    }
    return meta.tradesMeta?.[tradeId]?.entryTime || null
  } catch {
    return null
  }
}

function timeBucketFromEntry(entryTime: string | null, tradeIndex: number): "Morning" | "Midday" | "Afternoon" {
  if (entryTime) {
    const m = entryTime.match(/(\d{1,2}):(\d{2})/)
    if (m) {
      const h = Number(m[1])
      if (h < 11) return "Morning"
      if (h < 13) return "Midday"
      return "Afternoon"
    }
  }
  if (tradeIndex <= 1) return "Morning"
  if (tradeIndex === 2) return "Midday"
  return "Afternoon"
}

type PrevWeekSnap = { netPnl: number; trades: number; winRate: number | null }

export function mapWeeklyReview(input: {
  weekStart: string
  weekEnd: string
  weekLabel: string
  days: JournalDay[]
  analytics: JournalAnalytics | null | undefined
  previous?: PrevWeekSnap | null
}): WeeklyReviewModel {
  const { weekStart, weekEnd, weekLabel, days, analytics, previous } = input
  const dayList = [...days].sort((a, b) => a.journal_date.localeCompare(b.journal_date))
  const empty = dayList.length === 0

  const dailyDates = eachTradingDay(weekStart, weekEnd)
  const pnlByDate = new Map(dayList.map((d) => [d.journal_date, resolveDayPnl(d)]))
  const dailyPnl = dailyDates.map((date) => ({
    date,
    dayLabel: weekdayShort(date),
    pnl: pnlByDate.get(date) ?? 0,
  }))

  const netPnl = dayList.reduce((s, d) => s + resolveDayPnl(d), 0)
  const allTrades = dayList.flatMap((d) =>
    (d.trades ?? []).map((t) => ({
      trade: t,
      day: d,
      pnl: num(t.pnl),
      setup: resolveTradeSetup(t),
      journalDate: d.journal_date,
      dayName: weekdayLong(d.journal_date),
      dayShort: weekdayShort(d.journal_date),
    })),
  )

  const tradeCount = allTrades.length || analytics?.trades_count || 0
  const wins = allTrades.filter((t) => t.pnl > 0).length
  const losses = allTrades.filter((t) => t.pnl < 0).length
  const scratches = allTrades.filter((t) => t.pnl === 0).length
  const winRate =
    wins + losses > 0 ? (wins / (wins + losses)) * 100 : analytics?.classified_win_rate ?? null

  const winPnls = allTrades.map((t) => t.pnl).filter((p) => p > 0)
  const lossPnls = allTrades.map((t) => t.pnl).filter((p) => p < 0)
  const grossWin = winPnls.reduce((a, b) => a + b, 0)
  const grossLoss = Math.abs(lossPnls.reduce((a, b) => a + b, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 9.99 : null
  const avgWin = winPnls.length ? grossWin / winPnls.length : 0
  const avgLoss = lossPnls.length ? grossLoss / lossPnls.length : 0
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : null

  const pnlDelta =
    previous && previous.netPnl !== 0
      ? ((netPnl - previous.netPnl) / Math.abs(previous.netPnl)) * 100
      : null
  const tradeDelta = previous ? tradeCount - previous.trades : null
  const sparkDaily = sparkFrom(dailyPnl.map((d) => d.pnl))

  // —— Mistakes (recurring) ——
  type RawM = {
    title: string
    severity: Severity
    notes: string
    dayName: string
    tradeLabel: string
  }
  const rawMistakes: RawM[] = []

  for (const day of dayList) {
    const dayName = weekdayLong(day.journal_date)
    for (const s of day.sections ?? []) {
      if (!matchKey(s, ["mistake", "error", "what_went_wrong"]) || !clean(s.body_markdown)) continue
      const base = TRADE_MISTAKE_PRESETS.map((p) => ({
        id: p.id,
        label: p.label,
        checked: false,
        notes: "",
        severity: p.severity as Severity,
      }))
      const parsed = parseMistakesMd(clean(s.body_markdown), base).filter((m) => m.checked)
      if (parsed.length) {
        for (const m of parsed) {
          rawMistakes.push({
            title: normalizeMistakeTitle(m.label),
            severity: m.severity,
            notes: m.notes,
            dayName,
            tradeLabel: weekdayShort(day.journal_date),
          })
        }
      } else {
        for (const b of bullets(clean(s.body_markdown)).slice(0, 8)) {
          rawMistakes.push({
            title: normalizeMistakeTitle(b.split(/[:—-]/)[0]!.trim()),
            severity: /early|fear|fomo|meeting|emotional|chase|revenge|overtrad|tight/i.test(b)
              ? "high"
              : "medium",
            notes: b,
            dayName,
            tradeLabel: weekdayShort(day.journal_date),
          })
        }
      }
    }
    ;(day.trades ?? []).forEach((t, i) => {
      for (const s of t.sections ?? []) {
        if (!matchKey(s, ["mistake", "error"]) || !clean(s.body_markdown)) continue
        const base = TRADE_MISTAKE_PRESETS.map((p) => ({
          id: p.id,
          label: p.label,
          checked: false,
          notes: "",
          severity: p.severity as Severity,
        }))
        const parsed = parseMistakesMd(clean(s.body_markdown), base).filter((m) => m.checked)
        const label = `${weekdayShort(day.journal_date)} T${i + 1}`
        if (parsed.length) {
          for (const m of parsed) {
            rawMistakes.push({
              title: normalizeMistakeTitle(m.label),
              severity: m.severity,
              notes: m.notes,
              dayName,
              tradeLabel: label,
            })
          }
        } else {
          for (const b of bullets(clean(s.body_markdown)).slice(0, 6)) {
            rawMistakes.push({
              title: normalizeMistakeTitle(b.split(/[:—-]/)[0]!.trim()),
              severity: /early|fear|fomo|meeting|emotional|chase|tight/i.test(b) ? "high" : "medium",
              notes: b,
              dayName,
              tradeLabel: label,
            })
          }
        }
      }
    })
  }

  const mistakeMap = new Map<
    string,
    {
      title: string
      severity: Severity
      notes: string[]
      days: string[]
      trades: string[]
      count: number
    }
  >()
  for (const m of rawMistakes) {
    const k = m.title.toLowerCase()
    const prev = mistakeMap.get(k)
    if (!prev) {
      mistakeMap.set(k, {
        title: m.title,
        severity: m.severity,
        notes: m.notes ? [m.notes] : [],
        days: [m.dayName],
        trades: [m.tradeLabel],
        count: 1,
      })
    } else {
      prev.count += 1
      if (m.notes) prev.notes.push(m.notes)
      if (!prev.days.includes(m.dayName)) prev.days.push(m.dayName)
      if (!prev.trades.includes(m.tradeLabel)) prev.trades.push(m.tradeLabel)
      if (sevRank(m.severity) > sevRank(prev.severity)) prev.severity = m.severity
    }
  }

  const lossShare = grossLoss
  const mistakes = [...mistakeMap.values()]
    .map((m, i) => {
      const weight = m.count / Math.max(1, rawMistakes.length)
      const money = lossShare > 0 && m.severity !== "low" ? lossShare * Math.min(1, weight * 1.4) : null
      const note = m.notes[0] || ""
      return {
        id: `m-${i}-${m.title.slice(0, 20)}`,
        title: m.title,
        description:
          note.slice(0, 180) ||
          `Logged ${m.count}× across ${m.days.length} session(s) this week.`,
        rootCause:
          note ||
          (m.count > 1
            ? `This pattern repeated on ${m.days.join(", ")} — process broke under pressure.`
            : "Single occurrence — still worth a rule if it cost expectancy."),
        recommendation: /early/i.test(m.title)
          ? "Hold winners until at least 1R before discretionary exit or trailing."
          : /distract|meeting/i.test(m.title)
            ? "No new entries while distracted — flat or watch-only mode."
            : /fomo|chase/i.test(m.title)
              ? "Only enter on your checklist trigger; skip late candles."
              : "Write one pre-trade rule that would have blocked this mistake.",
        moneyLostLabel: money != null && money > 50 ? formatMoney2(money) : "—",
        moneyLost: money,
        severity: m.severity,
        count: m.count,
        days: m.days,
        relatedTradeLabels: m.trades.slice(0, 8),
      }
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        sevRank(b.severity) - sevRank(a.severity) ||
        (b.moneyLost ?? 0) - (a.moneyLost ?? 0),
    )
    .slice(0, 6)

  // —— Lessons consolidate ——
  type LessonRaw = { title: string; body: string; day: string }
  const lessonRaws: LessonRaw[] = []
  for (const day of dayList) {
    const dayName = weekdayShort(day.journal_date)
    for (const s of day.sections ?? []) {
      if (
        !matchKey(s, ["lesson", "learning", "takeaway", "next_time", "rules_reinforced"]) ||
        !clean(s.body_markdown)
      )
        continue
      const pts = bullets(clean(s.body_markdown))
      for (const text of (pts.length ? pts : [clean(s.body_markdown).slice(0, 280)]).slice(0, 4)) {
        lessonRaws.push({
          title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 100),
          body: text,
          day: dayName,
        })
      }
    }
    ;(day.trades ?? []).forEach((t) => {
      for (const s of t.sections ?? []) {
        if (!matchKey(s, ["lesson", "next_time", "learning"]) || !clean(s.body_markdown)) continue
        for (const text of bullets(clean(s.body_markdown)).slice(0, 3)) {
          lessonRaws.push({
            title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 100),
            body: text,
            day: dayName,
          })
        }
      }
    })
  }

  function lessonKey(title: string): string {
    const t = title.toLowerCase()
    if (/confirm|candle/i.test(t)) return "confirmation"
    if (/trail|hold|winner|1r/i.test(t)) return "holding"
    if (/level|support|resistance|zone/i.test(t)) return "levels"
    if (/distract|meeting|focus/i.test(t)) return "focus"
    if (/stop|sl/i.test(t)) return "stops"
    return title.toLowerCase().slice(0, 40)
  }

  const lessonGroups = new Map<string, LessonRaw[]>()
  for (const l of lessonRaws) {
    const k = lessonKey(l.title)
    const arr = lessonGroups.get(k) ?? []
    arr.push(l)
    lessonGroups.set(k, arr)
  }
  const lessons = [...lessonGroups.entries()]
    .map(([k, group], i) => {
      const best = group.sort((a, b) => b.body.length - a.body.length)[0]!
      return {
        id: `lesson-${k}-${i}`,
        title: best.title,
        body: best.body,
        whyItMatters:
          group.length > 1
            ? `Appeared ${group.length}× this week (${[...new Set(group.map((g) => g.day))].join(", ")}). Carry this as a hard rule next week.`
            : `Captured on ${best.day}. Protect it with one checklist line before entry.`,
        sourceCount: group.length,
      }
    })
    .sort((a, b) => b.sourceCount - a.sourceCount)
    .slice(0, 6)

  // —— What worked (habits, not copy-paste) ——
  const workedSignals: Array<{ title: string; evidence: string; impact: "high" | "medium" | "low" }> =
    []
  let waitedConfirm = 0
  let levelsRespect = 0
  let greenDays = 0
  let disciplineNotes = 0
  for (const day of dayList) {
    if (resolveDayPnl(day) > 0) greenDays += 1
    const blob = (day.sections ?? []).map((s) => clean(s.body_markdown)).join("\n").toLowerCase()
    const tradeBlob = (day.trades ?? [])
      .flatMap((t) => (t.sections ?? []).map((s) => clean(s.body_markdown)))
      .join("\n")
      .toLowerCase()
    const all = `${blob}\n${tradeBlob}`
    if (/wait|confirm|patience|patient/.test(all)) waitedConfirm += 1
    if (/support|resistance|demand|supply|key level|zone/.test(all)) levelsRespect += 1
    if (/discipline|followed|plan|checklist/.test(all)) disciplineNotes += 1
    for (const s of day.sections ?? []) {
      if (!matchKey(s, ["went_well", "what_went_well", "success"]) || !clean(s.body_markdown)) continue
      for (const text of bullets(clean(s.body_markdown)).slice(0, 2)) {
        workedSignals.push({
          title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 72),
          evidence: `${weekdayShort(day.journal_date)}: ${text.slice(0, 120)}`,
          impact: resolveDayPnl(day) > 0 ? "high" : "medium",
        })
      }
    }
  }
  const whatWorked: WeeklyReviewModel["whatWorked"] = []
  if (waitedConfirm >= 2) {
    whatWorked.push({
      id: "w-confirm",
      title: "Waited for confirmation before entries",
      description: `Patience / confirmation language showed up across ${waitedConfirm} session(s).`,
      evidence: "Derived from journal wording this week — not assumed.",
      impact: "high",
    })
  }
  if (levelsRespect >= 2) {
    whatWorked.push({
      id: "w-levels",
      title: "Strong attention to key levels & zones",
      description: `Support/resistance or demand/supply referenced in ${levelsRespect} session(s).`,
      evidence: "Counted from market/setup/trade notes.",
      impact: "high",
    })
  }
  if (disciplineNotes >= 2) {
    whatWorked.push({
      id: "w-disc",
      title: "Process & discipline awareness",
      description: `Plan/checklist/discipline notes appeared in ${disciplineNotes} session(s).`,
      impact: "medium",
    })
  }
  if (greenDays >= 2) {
    whatWorked.push({
      id: "w-green",
      title: "Multiple green sessions",
      description: `${greenDays} of ${dayList.length} journaled days finished positive.`,
      impact: "high",
    })
  }
  for (const s of workedSignals.slice(0, 3)) {
    if (whatWorked.some((w) => w.title.toLowerCase() === s.title.toLowerCase())) continue
    whatWorked.push({
      id: `w-sig-${whatWorked.length}`,
      title: s.title,
      description: s.evidence,
      evidence: s.evidence,
      impact: s.impact,
    })
  }
  if (!whatWorked.length && !empty) {
    whatWorked.push({
      id: "w-thin",
      title: "Insufficient positive habit evidence",
      description:
        "Add ‘What Went Well’ notes in daily journals so Harry AI can score real strengths — nothing invented here.",
      impact: "low",
    })
  }

  // —— Day briefs ——
  const dayBriefs: WeeklyDayBrief[] = dayList.map((day) => {
    const highlights: string[] = []
    const issues: string[] = []
    for (const s of day.sections ?? []) {
      const body = clean(s.body_markdown)
      if (!body) continue
      if (matchKey(s, ["went_well", "what_went_well", "success"])) {
        highlights.push(...bullets(body).slice(0, 2))
      }
      if (matchKey(s, ["lesson", "learning", "takeaway"])) {
        highlights.push(...bullets(body).slice(0, 1))
      }
      if (matchKey(s, ["mistake", "error", "what_went_wrong"])) {
        const base = TRADE_MISTAKE_PRESETS.map((p) => ({
          id: p.id,
          label: p.label,
          checked: false,
          notes: "",
          severity: p.severity as Severity,
        }))
        const parsed = parseMistakesMd(body, base).filter((m) => m.checked)
        if (parsed.length) issues.push(...parsed.map((m) => m.label))
        else issues.push(...bullets(body).slice(0, 2).map((b) => b.split(/[:—-]/)[0]!.trim()))
      }
    }
    const pnl = resolveDayPnl(day)
    return {
      id: day.id,
      date: day.journal_date,
      dayLabel: weekdayLong(day.journal_date),
      pnlLabel: formatMoney2(pnl),
      pnl,
      highlights: [...new Set(highlights)].slice(0, 3),
      issues: [...new Set(issues)].slice(0, 3),
    }
  })

  // —— Continue / Stop / Focus ——
  const continueDoing = whatWorked
    .filter((w) => w.impact !== "low")
    .slice(0, 5)
    .map((w, i) => ({ id: `c-${i}`, label: w.title }))
  const stopDoing = mistakes.slice(0, 5).map((m, i) => ({ id: `s-${i}`, label: m.title }))
  const focusAreas = mistakes.slice(0, 3).map((m, i) => ({
    id: `f-${i}`,
    number: i + 1,
    title: m.title.startsWith("Fix") ? m.title : `Fix: ${m.title}`,
    description: m.recommendation,
    priority: (m.severity === "high" ? "high" : "medium") as PriorityLevel,
  }))

  // —— Setups from resolved journal evidence (NOT analytics.by_setup defaults) ——
  const setupMap = new Map<
    string,
    { wins: number; losses: number; count: number; pnl: number; winSum: number; lossAbs: number }
  >()
  for (const row of allTrades) {
    const key = row.setup
    const cur = setupMap.get(key) ?? {
      wins: 0,
      losses: 0,
      count: 0,
      pnl: 0,
      winSum: 0,
      lossAbs: 0,
    }
    cur.count += 1
    cur.pnl += row.pnl
    if (row.pnl > 0) {
      cur.wins += 1
      cur.winSum += row.pnl
    } else if (row.pnl < 0) {
      cur.losses += 1
      cur.lossAbs += Math.abs(row.pnl)
    }
    setupMap.set(key, cur)
  }
  const setups: WeeklySetupStat[] = [...setupMap.entries()]
    .map(([setup, s]) => {
      const avgRr = s.lossAbs > 0 && s.wins > 0 ? s.winSum / s.wins / (s.lossAbs / Math.max(1, s.losses)) : null
      return {
        setup,
        count: s.count,
        wins: s.wins,
        losses: s.losses,
        winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
        netPnl: s.pnl,
        netPnlLabel: formatMoney2(s.pnl),
        avgRr,
        avgRrLabel: avgRr != null ? `1 : ${avgRr.toFixed(1)}` : "—",
      }
    })
    .sort((a, b) => b.netPnl - a.netPnl || b.count - a.count)
    .slice(0, 8)

  const bestSetup =
    setups.filter((s) => s.setup !== "Unspecified").sort((a, b) => b.netPnl - a.netPnl)[0]?.setup ||
    "—"
  const worstSetup =
    setups.filter((s) => s.setup !== "Unspecified").sort((a, b) => a.netPnl - b.netPnl)[0]?.setup ||
    "—"

  const outcomes = [
    { name: "Wins", value: wins, color: "#22c55e" },
    { name: "Losses", value: losses, color: "#f43f5e" },
    { name: "Flat", value: scratches, color: "#8b929e" },
  ].filter((o) => o.value > 0)

  const timeMap = new Map<string, { pnl: number; trades: number }>()
  for (const row of allTrades) {
    const label = timeBucketFromEntry(
      parseWorkspaceEntryTime(row.day, row.trade.id),
      row.trade.trade_index ?? 1,
    )
    const cur = timeMap.get(label) ?? { pnl: 0, trades: 0 }
    cur.pnl += row.pnl
    cur.trades += 1
    timeMap.set(label, cur)
  }
  const timeBuckets = ["Morning", "Midday", "Afternoon"]
    .map((label) => ({ label, pnl: timeMap.get(label)?.pnl ?? 0, trades: timeMap.get(label)?.trades ?? 0 }))
    .filter((b) => b.trades > 0)

  const highMistakes = mistakes.filter((m) => m.severity === "high").length
  const consistency = Math.max(
    15,
    Math.min(98, Math.round(55 + (winRate ?? 40) * 0.35 - highMistakes * 6)),
  )
  const discipline = Math.max(
    15,
    Math.min(98, Math.round(70 - highMistakes * 10 + (continueDoing.length > 2 ? 8 : 0))),
  )
  const risk = Math.max(
    20,
    Math.min(
      98,
      Math.round(65 + (profitFactor != null ? Math.min(20, profitFactor * 6) : 0) - highMistakes * 5),
    ),
  )
  const tradeMgmt = Math.max(
    15,
    Math.min(
      98,
      Math.round(
        60 -
          mistakes.filter((m) => /early|trail|hold|exit/i.test(m.title)).length * 12 +
          (avgRR != null && avgRR >= 1.5 ? 10 : 0),
      ),
    ),
  )
  const avgScore = (consistency + discipline + risk + tradeMgmt) / 4
  const grade =
    dayList.map((d) => d.overall_grade).filter(Boolean).sort().at(-1)?.trim() ||
    gradeFromScores(avgScore, netPnl)
  const gradeStars = starsForGrade(grade)

  const kpis: WeeklyReviewModel["kpis"] = [
    {
      id: "pnl",
      label: "Net P&L",
      value: formatMoney2(netPnl),
      comparison:
        pnlDelta != null
          ? `${pnlDelta >= 0 ? "+" : ""}${pnlDelta.toFixed(1)}% vs last week`
          : previous
            ? `Prev ${formatMoney2(previous.netPnl)}`
            : `${dayList.length} sessions`,
      tone: netPnl > 0 ? "positive" : netPnl < 0 ? "negative" : "neutral",
      spark: sparkDaily,
    },
    {
      id: "wr",
      label: "Win Rate",
      value: winRate != null ? `${Math.round(winRate)}%` : "—",
      comparison: `${wins} Wins / ${tradeCount} Trades`,
      tone: "blue",
      spark: sparkFrom([wins, losses, wins, Math.max(1, wins - 1), wins]),
    },
    {
      id: "trades",
      label: "Total Trades",
      value: String(tradeCount),
      comparison:
        tradeDelta != null
          ? `${tradeDelta >= 0 ? "+" : ""}${tradeDelta} vs last week`
          : `${dayList.length} journal days`,
      tone: "purple",
      spark: sparkFrom(dailyPnl.map((d) => (pnlByDate.has(d.date) ? 1 : 0.2))),
    },
    {
      id: "rr",
      label: "Avg R:R",
      value: avgRR != null ? `1 : ${avgRR.toFixed(1)}` : "—",
      comparison: "From closed trade P&L",
      tone: "amber",
      spark: sparkFrom([0.4, 0.5, avgRR ?? 0.6, 0.55, avgRR ?? 0.7]),
    },
    {
      id: "pf",
      label: "Profit Factor",
      value: profitFactor != null ? profitFactor.toFixed(2) : "—",
      comparison:
        profitFactor == null
          ? "Need wins & losses"
          : profitFactor >= 2
            ? "Very Good"
            : profitFactor >= 1.3
              ? "Good"
              : "Needs work",
      tone: profitFactor != null && profitFactor >= 1.5 ? "positive" : "neutral",
      spark: sparkFrom([1, profitFactor ?? 1, 1.2, profitFactor ?? 1.1, 1.4]),
    },
  ]

  const bestDay = [...dailyPnl].sort((a, b) => b.pnl - a.pnl)[0]
  const worstDay = [...dailyPnl].sort((a, b) => a.pnl - b.pnl)[0]
  const bestTrade = [...allTrades].sort((a, b) => b.pnl - a.pnl)[0]
  const worstTrade = [...allTrades].sort((a, b) => a.pnl - b.pnl)[0]

  const coach: WeeklyReviewModel["coach"] = {
    summary: empty
      ? "No journals in this week yet. Log sessions and I’ll build a full coaching review."
      : `Across ${dayList.length} session(s) and ${tradeCount} trade(s), net ${formatMoney2(netPnl)}. ${
          mistakes[0]
            ? `The repeating risk is “${mistakes[0].title}” (${mistakes[0].count}×).`
            : "No strong repeating mistake cluster was logged."
        } ${
          setups[0] && setups[0].setup !== "Unspecified"
            ? `Best evidenced setup by P&L: ${bestSetup}.`
            : "Setup labels were thin — tag trade setups clearly for sharper analytics."
        }`,
    strengths: whatWorked.filter((w) => w.impact !== "low").slice(0, 4).map((w) => w.title),
    weaknesses: mistakes.slice(0, 4).map((m) => `${m.title}${m.count > 1 ? ` (${m.count}×)` : ""}`),
    advice: mistakes[0]?.recommendation || lessons[0]?.whyItMatters || "Protect one process rule for five sessions.",
    challenge:
      focusAreas[0]?.description ||
      "Hold the next winner to at least 1R before discretionary exit — write the plan first.",
  }
  if (!coach.strengths.length && !empty) coach.strengths.push("Showed up and journaled the week")
  if (!coach.weaknesses.length && !empty)
    coach.weaknesses.push("Mistake tags are thin — add them for sharper coaching")

  const aiDigest = buildAiDigest({
    weekLabel,
    dayList,
    dayBriefs,
    allTrades: allTrades.map((t) => ({
      date: t.journalDate,
      instrument: t.trade.instrument,
      setup: t.setup,
      pnl: t.pnl,
    })),
    mistakes,
    lessons,
    whatWorked,
    setups,
    netPnl,
    winRate,
    tradeCount,
  })

  return {
    weekStart,
    weekEnd,
    weekLabel,
    empty,
    daysWithJournals: dayList.length,
    kpis,
    grade,
    gradeStars,
    whatWorked: whatWorked.slice(0, 6),
    mistakes,
    lessons,
    dayBriefs,
    continueDoing:
      continueDoing.length > 0
        ? continueDoing
        : empty
          ? []
          : [{ id: "c0", label: "Keep journaling every session" }],
    stopDoing:
      stopDoing.length > 0
        ? stopDoing
        : empty
          ? []
          : [{ id: "s0", label: "Skipping post-trade review" }],
    focusAreas,
    dailyPnl,
    outcomes,
    setups,
    timeBuckets,
    coach,
    footer: {
      bestDayLabel: bestDay && bestDay.pnl !== 0 ? bestDay.dayLabel : "—",
      bestDayPnl: bestDay && bestDay.pnl !== 0 ? formatMoney2(bestDay.pnl) : "—",
      worstDayLabel: worstDay && worstDay.pnl !== 0 ? worstDay.dayLabel : "—",
      worstDayPnl: worstDay && worstDay.pnl !== 0 ? formatMoney2(worstDay.pnl) : "—",
      bestTradeLabel: bestTrade?.trade.instrument || "—",
      bestTradePnl: bestTrade ? formatMoney2(bestTrade.pnl) : "—",
      worstTradeLabel: worstTrade?.trade.instrument || "—",
      worstTradePnl: worstTrade ? formatMoney2(worstTrade.pnl) : "—",
      bestSetup,
      worstSetup,
      scores: [
        { id: "consistency", label: "Consistency Score", value: consistency },
        { id: "discipline", label: "Discipline Score", value: discipline },
        { id: "risk", label: "Risk Management", value: risk },
        { id: "management", label: "Trade Management", value: tradeMgmt },
      ],
    },
    netPnl,
    aiDigest,
    insightsSource: "deterministic",
  }
}

function buildAiDigest(input: {
  weekLabel: string
  dayList: JournalDay[]
  dayBriefs: WeeklyDayBrief[]
  allTrades: Array<{ date: string; instrument: string | null; setup: string; pnl: number }>
  mistakes: WeeklyReviewModel["mistakes"]
  lessons: WeeklyReviewModel["lessons"]
  whatWorked: WeeklyReviewModel["whatWorked"]
  setups: WeeklySetupStat[]
  netPnl: number
  winRate: number | null
  tradeCount: number
}): string {
  const lines: string[] = [
    `Week: ${input.weekLabel}`,
    `Net P&L: ${formatMoney2(input.netPnl)} | Trades: ${input.tradeCount} | Win rate: ${
      input.winRate != null ? `${Math.round(input.winRate)}%` : "n/a"
    }`,
    "",
    "Days:",
  ]
  for (const d of input.dayBriefs) {
    lines.push(
      `- ${d.dayLabel} (${d.date}) P&L ${d.pnlLabel}`,
      d.highlights.length ? `  Highlights: ${d.highlights.join("; ")}` : "  Highlights: (none logged)",
      d.issues.length ? `  Issues: ${d.issues.join("; ")}` : "  Issues: (none logged)",
    )
  }
  lines.push("", "Trades (setup resolved from journal text):")
  for (const t of input.allTrades.slice(0, 40)) {
    lines.push(
      `- ${t.date} ${t.instrument || "?"} | setup=${t.setup} | pnl=${formatMoney2(t.pnl)}`,
    )
  }
  lines.push("", "Setup rollup:")
  for (const s of input.setups) {
    lines.push(
      `- ${s.setup}: n=${s.count} WR=${s.winRate ?? "n/a"}% pnl=${s.netPnlLabel} RR=${s.avgRrLabel}`,
    )
  }
  lines.push("", "Recurring mistakes:")
  for (const m of input.mistakes) {
    lines.push(
      `- ${m.title} ×${m.count} days=${m.days.join("/")} impact=${m.moneyLostLabel} notes=${m.description}`,
    )
  }
  lines.push("", "Lessons:")
  for (const l of input.lessons) {
    lines.push(`- (${l.sourceCount}×) ${l.title}: ${l.body}`)
  }
  lines.push("", "Positive signals:")
  for (const w of input.whatWorked) {
    lines.push(`- ${w.title}: ${w.description}`)
  }
  // Include raw section snippets (capped) for AI
  lines.push("", "Raw journal excerpts:")
  for (const day of input.dayList) {
    for (const s of (day.sections ?? []).slice(0, 8)) {
      const body = clean(s.body_markdown)
      if (!body) continue
      lines.push(`### ${day.journal_date} / ${s.section_key}`)
      lines.push(body.slice(0, 500))
    }
  }
  return lines.join("\n").slice(0, 14000)
}

/** Merge Harry AI JSON into a deterministic weekly model (AI never invents setups/KPIs). */
export function applyWeeklyAiInsights(
  model: WeeklyReviewModel,
  ai: Partial<{
    what_worked: Array<{ title: string; description: string; evidence?: string; impact?: string }>
    mistakes: Array<{
      title: string
      occurrences?: number
      days?: string[]
      impact_label?: string
      root_cause?: string
      recommendation?: string
      severity?: string
    }>
    lessons: Array<{ title: string; body: string; why_it_matters?: string }>
    day_briefs: Array<{ day: string; date?: string; highlights?: string[]; issues?: string[] }>
    continue_doing: Array<{ label: string }>
    stop_doing: Array<{ label: string }>
    focus_areas: Array<{ number?: number; title: string; description: string; priority?: string }>
    coach: {
      summary?: string
      strengths?: string[]
      weaknesses?: string[]
      advice?: string
      challenge?: string
    }
  }>,
): WeeklyReviewModel {
  const next = { ...model, insightsSource: "ai" as const }

  if (ai.what_worked?.length) {
    next.whatWorked = ai.what_worked.slice(0, 6).map((w, i) => ({
      id: `ai-w-${i}`,
      title: w.title,
      description: w.description,
      evidence: w.evidence,
      impact: (w.impact === "high" || w.impact === "low" ? w.impact : "medium") as WeeklyReviewModel["whatWorked"][0]["impact"],
    }))
  }
  if (ai.mistakes?.length) {
    next.mistakes = ai.mistakes.slice(0, 6).map((m, i) => {
      const base = model.mistakes.find((x) => {
        const a = x.title.toLowerCase()
        const b = m.title.toLowerCase()
        return a === b || a.includes(b) || b.includes(a)
      })
      // Counts / days / impact always prefer journal math — AI only writes the narrative.
      return {
        id: `ai-m-${i}`,
        title: base?.title || m.title,
        description: m.root_cause || base?.description || m.title,
        rootCause: m.root_cause || base?.rootCause || "",
        recommendation: m.recommendation || base?.recommendation || "",
        moneyLostLabel: base?.moneyLostLabel || m.impact_label || "—",
        moneyLost: base?.moneyLost ?? null,
        severity: (m.severity === "high" || m.severity === "low"
          ? m.severity
          : base?.severity || "medium") as Severity,
        count: base?.count ?? Math.max(1, Number(m.occurrences) || 1),
        days: base?.days?.length ? base.days : m.days ?? [],
        relatedTradeLabels: base?.relatedTradeLabels ?? [],
      }
    })
  }
  if (ai.lessons?.length) {
    next.lessons = ai.lessons.slice(0, 6).map((l, i) => {
      const base = model.lessons.find((x) => {
        const a = x.title.toLowerCase()
        const b = l.title.toLowerCase()
        return a === b || a.includes(b) || b.includes(a)
      })
      return {
        id: `ai-l-${i}`,
        title: l.title,
        body: l.body,
        whyItMatters: l.why_it_matters || base?.whyItMatters || "",
        sourceCount: base?.sourceCount ?? 1,
      }
    })
  }
  if (ai.day_briefs?.length) {
    next.dayBriefs = model.dayBriefs.map((d) => {
      const hit =
        ai.day_briefs!.find((b) => b.date === d.date) ||
        ai.day_briefs!.find((b) => b.day?.toLowerCase() === d.dayLabel.toLowerCase())
      if (!hit) return d
      return {
        ...d,
        highlights: hit.highlights?.length ? hit.highlights.slice(0, 4) : d.highlights,
        issues: hit.issues?.length ? hit.issues.slice(0, 4) : d.issues,
      }
    })
  }
  if (ai.continue_doing?.length) {
    next.continueDoing = ai.continue_doing.slice(0, 6).map((c, i) => ({ id: `ai-c-${i}`, label: c.label }))
  }
  if (ai.stop_doing?.length) {
    next.stopDoing = ai.stop_doing.slice(0, 6).map((c, i) => ({ id: `ai-s-${i}`, label: c.label }))
  }
  if (ai.focus_areas?.length) {
    next.focusAreas = ai.focus_areas.slice(0, 3).map((f, i) => ({
      id: `ai-f-${i}`,
      number: f.number ?? i + 1,
      title: f.title,
      description: f.description,
      priority: (f.priority === "high" || f.priority === "low" ? f.priority : "medium") as PriorityLevel,
    }))
  }
  if (ai.coach) {
    next.coach = {
      summary: ai.coach.summary || model.coach.summary,
      strengths: ai.coach.strengths?.length ? ai.coach.strengths : model.coach.strengths,
      weaknesses: ai.coach.weaknesses?.length ? ai.coach.weaknesses : model.coach.weaknesses,
      advice: ai.coach.advice || model.coach.advice,
      challenge: ai.coach.challenge || model.coach.challenge,
    }
  }
  return next
}
