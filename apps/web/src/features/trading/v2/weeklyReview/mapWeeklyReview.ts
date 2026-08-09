import type { JournalAnalytics, JournalDay } from "@/features/trading/types"
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
  WeeklyReviewModel,
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

type PrevWeekSnap = {
  netPnl: number
  trades: number
  winRate: number | null
}

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
      ...t,
      journalDate: d.journal_date,
      dayPnl: resolveDayPnl(d),
    })),
  )
  const tradeCount = analytics?.trades_count ?? allTrades.length
  const wins = analytics?.wins ?? allTrades.filter((t) => num(t.pnl) > 0).length
  const losses = analytics?.losses ?? allTrades.filter((t) => num(t.pnl) < 0).length
  const scratches = analytics?.scratches ?? 0
  const winRate =
    analytics?.classified_win_rate ??
    (wins + losses > 0 ? (wins / (wins + losses)) * 100 : null)

  const winPnls = allTrades.map((t) => num(t.pnl)).filter((p) => p > 0)
  const lossPnls = allTrades.map((t) => num(t.pnl)).filter((p) => p < 0)
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

  // —— Mistakes aggregate ——
  type RawM = { title: string; severity: Severity; notes: string; tradeLabel: string }
  const rawMistakes: RawM[] = []
  for (const day of dayList) {
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
            title: m.label,
            severity: m.severity,
            notes: m.notes,
            tradeLabel: weekdayShort(day.journal_date),
          })
        }
      } else {
        for (const b of bullets(clean(s.body_markdown)).slice(0, 8)) {
          rawMistakes.push({
            title: b.split(/[:—-]/)[0]!.trim().slice(0, 72),
            severity: /early|fear|fomo|meeting|emotional|chase|revenge|overtrad/i.test(b)
              ? "high"
              : "medium",
            notes: b,
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
              title: m.label,
              severity: m.severity,
              notes: m.notes,
              tradeLabel: label,
            })
          }
        } else {
          for (const b of bullets(clean(s.body_markdown)).slice(0, 6)) {
            rawMistakes.push({
              title: b.split(/[:—-]/)[0]!.trim().slice(0, 72),
              severity: /early|fear|fomo|meeting|emotional|chase/i.test(b) ? "high" : "medium",
              notes: b,
              tradeLabel: label,
            })
          }
        }
      }
    })
  }

  const mistakeMap = new Map<
    string,
    { title: string; severity: Severity; notes: string[]; trades: string[]; count: number }
  >()
  for (const m of rawMistakes) {
    const k = m.title.toLowerCase()
    const prev = mistakeMap.get(k)
    if (!prev) {
      mistakeMap.set(k, {
        title: m.title,
        severity: m.severity,
        notes: m.notes ? [m.notes] : [],
        trades: [m.tradeLabel],
        count: 1,
      })
    } else {
      prev.count += 1
      if (m.notes) prev.notes.push(m.notes)
      if (!prev.trades.includes(m.tradeLabel)) prev.trades.push(m.tradeLabel)
      if (sevRank(m.severity) > sevRank(prev.severity)) prev.severity = m.severity
    }
  }

  const lossShare = Math.abs(lossPnls.reduce((a, b) => a + b, 0))
  const mistakes = [...mistakeMap.values()]
    .map((m, i) => {
      const weight = m.count / Math.max(1, rawMistakes.length)
      const money = lossShare > 0 && m.severity !== "low" ? lossShare * weight : null
      return {
        id: `m-${i}-${m.title.slice(0, 20)}`,
        title: m.title,
        description:
          m.notes[0]?.slice(0, 160) ||
          `Logged ${m.count}× across ${m.trades.length} session(s) this week.`,
        moneyLostLabel: money != null && money > 0 ? formatMoney2(money) : "—",
        moneyLost: money,
        severity: m.severity,
        count: m.count,
        relatedTradeLabels: m.trades.slice(0, 6),
      }
    })
    .sort(
      (a, b) =>
        sevRank(b.severity) - sevRank(a.severity) ||
        b.count - a.count ||
        (b.moneyLost ?? 0) - (a.moneyLost ?? 0),
    )
    .slice(0, 6)

  // —— Lessons ——
  const lessons: WeeklyReviewModel["lessons"] = []
  for (const day of dayList) {
    for (const s of day.sections ?? []) {
      if (
        !matchKey(s, ["lesson", "learning", "takeaway", "next_time", "rules_reinforced"]) ||
        !clean(s.body_markdown)
      )
        continue
      for (const [i, text] of (bullets(clean(s.body_markdown)).length
        ? bullets(clean(s.body_markdown))
        : [clean(s.body_markdown).slice(0, 280)]
      )
        .slice(0, 4)
        .entries()) {
        lessons.push({
          id: `l-${day.id}-${s.section_key}-${i}`,
          title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 100) || text.slice(0, 80),
          body: text,
          source: weekdayShort(day.journal_date),
        })
      }
    }
    ;(day.trades ?? []).forEach((t, ti) => {
      for (const s of t.sections ?? []) {
        if (!matchKey(s, ["lesson", "next_time", "learning"]) || !clean(s.body_markdown)) continue
        for (const [i, text] of bullets(clean(s.body_markdown)).slice(0, 3).entries()) {
          lessons.push({
            id: `lt-${t.id}-${i}`,
            title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 100),
            body: text,
            source: `${weekdayShort(day.journal_date)} T${ti + 1}`,
          })
        }
      }
    })
  }
  const uniqueLessons = [...new Map(lessons.map((l) => [l.title.toLowerCase(), l])).values()].slice(
    0,
    8,
  )

  // —— What worked ——
  const whatWorked: WeeklyReviewModel["whatWorked"] = []
  for (const day of dayList) {
    for (const s of day.sections ?? []) {
      if (!matchKey(s, ["went_well", "what_went_well", "success"]) || !clean(s.body_markdown))
        continue
      for (const text of bullets(clean(s.body_markdown)).slice(0, 3)) {
        whatWorked.push({
          id: `w-${day.id}-${whatWorked.length}`,
          title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 72),
          description: text.slice(0, 160),
          impact: resolveDayPnl(day) > 0 ? "high" : "medium",
        })
      }
    }
    ;(day.trades ?? []).forEach((t) => {
      for (const s of t.sections ?? []) {
        if (!matchKey(s, ["went_well", "what_went_well"]) || !clean(s.body_markdown)) continue
        for (const text of bullets(clean(s.body_markdown)).slice(0, 2)) {
          whatWorked.push({
            id: `wt-${t.id}-${whatWorked.length}`,
            title: text.split(/[.!?\n]/)[0]!.trim().slice(0, 72),
            description: text.slice(0, 160),
            impact: num(t.pnl) > 0 ? "high" : "medium",
          })
        }
      }
    })
  }
  if (!whatWorked.length && winRate != null && winRate >= 55) {
    whatWorked.push({
      id: "w-wr",
      title: "Solid win rate this week",
      description: `Closed ${wins} winners across ${tradeCount} trades (${winRate.toFixed(0)}% classified win rate).`,
      impact: "high",
    })
  }
  if (!whatWorked.length && netPnl > 0) {
    whatWorked.push({
      id: "w-pnl",
      title: "Week finished green",
      description: `Net P&L ${formatMoney2(netPnl)} across ${dayList.length} journaled session(s).`,
      impact: "high",
    })
  }
  const uniqueWorked = [
    ...new Map(whatWorked.map((w) => [w.title.toLowerCase(), w])).values(),
  ].slice(0, 5)

  // —— Continue / Stop ——
  const continueDoing = [
    ...uniqueWorked.slice(0, 3).map((w, i) => ({ id: `c-${i}`, label: w.title })),
    ...uniqueLessons
      .filter((l) => /wait|respect|trail|confirm|plan|level/i.test(l.title))
      .slice(0, 2)
      .map((l, i) => ({ id: `cl-${i}`, label: l.title })),
  ].slice(0, 5)

  const stopDoing = mistakes.slice(0, 5).map((m, i) => ({
    id: `s-${i}`,
    label: m.title,
  }))

  // —— Focus ——
  const focusAreas = [
    ...mistakes.slice(0, 2).map((m, i) => ({
      id: `f-${i}`,
      number: i + 1,
      title: m.title.startsWith("Improve") ? m.title : `Fix: ${m.title}`,
      description:
        m.description.slice(0, 140) ||
        "Reduce this pattern next week with one pre-trade checklist item.",
      priority: (m.severity === "high" ? "high" : "medium") as PriorityLevel,
    })),
    ...uniqueLessons.slice(0, 1).map((l, i) => ({
      id: `fl-${i}`,
      number: Math.min(3, mistakes.length + 1),
      title: l.title.slice(0, 64),
      description: l.body.slice(0, 140),
      priority: "medium" as PriorityLevel,
    })),
  ]
    .filter((v, i, arr) => arr.findIndex((x) => x.title === v.title) === i)
    .slice(0, 3)
    .map((f, i) => ({ ...f, number: i + 1 }))

  while (focusAreas.length < 1 && !empty) {
    focusAreas.push({
      id: "f-default",
      number: 1,
      title: "Journal one rule before every entry",
      description: "Write the setup, invalidation, and minimum hold plan before clicking buy/sell.",
      priority: "high",
    })
    break
  }

  // —— Setups / outcomes / time ——
  const setups =
    analytics?.by_setup?.map((s) => ({
      setup: s.setup || "Unknown",
      count: s.count,
      wins: s.wins,
      losses: s.losses,
      winRate:
        s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
    })) ??
    (() => {
      const map = new Map<string, { wins: number; losses: number; count: number }>()
      for (const t of allTrades) {
        const key = (t.setup || "Unknown").trim() || "Unknown"
        const row = map.get(key) ?? { wins: 0, losses: 0, count: 0 }
        row.count += 1
        if (num(t.pnl) > 0) row.wins += 1
        if (num(t.pnl) < 0) row.losses += 1
        map.set(key, row)
      }
      return [...map.entries()].map(([setup, s]) => ({
        setup,
        count: s.count,
        wins: s.wins,
        losses: s.losses,
        winRate:
          s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
      }))
    })()

  const outcomes = [
    { name: "Wins", value: wins, color: "#22c55e" },
    { name: "Losses", value: losses, color: "#f43f5e" },
    { name: "Flat", value: scratches, color: "#8b929e" },
  ].filter((o) => o.value > 0)

  // Time buckets from trade entry times in workspace meta / sections — heuristic by journal date afternoon vs morning via trade_index
  const morning = { label: "Morning", pnl: 0, trades: 0 }
  const midday = { label: "Midday", pnl: 0, trades: 0 }
  const afternoon = { label: "Afternoon", pnl: 0, trades: 0 }
  for (const t of allTrades) {
    const idx = t.trade_index ?? 1
    const p = num(t.pnl)
    if (idx <= 1) {
      morning.pnl += p
      morning.trades += 1
    } else if (idx === 2) {
      midday.pnl += p
      midday.trades += 1
    } else {
      afternoon.pnl += p
      afternoon.trades += 1
    }
  }
  const timeBuckets = [morning, midday, afternoon].filter((b) => b.trades > 0)

  // —— Scores ——
  const highMistakes = mistakes.filter((m) => m.severity === "high").length
  const consistency = Math.max(
    15,
    Math.min(98, Math.round(55 + (winRate ?? 40) * 0.35 - highMistakes * 6)),
  )
  const discipline = Math.max(15, Math.min(98, Math.round(70 - highMistakes * 10 + (continueDoing.length > 2 ? 8 : 0))))
  const risk = Math.max(
    20,
    Math.min(98, Math.round(65 + (profitFactor != null ? Math.min(20, profitFactor * 6) : 0) - highMistakes * 5)),
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
      comparison: "Risk : Reward",
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

  // —— Footer best/worst ——
  const bestDay = [...dailyPnl].sort((a, b) => b.pnl - a.pnl)[0]
  const worstDay = [...dailyPnl].sort((a, b) => a.pnl - b.pnl)[0]
  const bestTrade = [...allTrades].sort((a, b) => num(b.pnl) - num(a.pnl))[0]
  const worstTrade = [...allTrades].sort((a, b) => num(a.pnl) - num(b.pnl))[0]

  const coach: WeeklyReviewModel["coach"] = {
    summary: empty
      ? "No journals in this week yet. Log your sessions and I’ll build a full coaching review."
      : `This week you journaled ${dayList.length} session(s) with ${tradeCount} trade(s) and net ${formatMoney2(netPnl)}. ${
          uniqueWorked[0]
            ? `Your strongest edge showed up in “${uniqueWorked[0].title}”.`
            : winRate != null && winRate >= 50
              ? "Win rate held above water — protect that edge."
              : "Results were mixed — the edge is in cleaning process, not forcing size."
        }`,
    strengths: [
      ...uniqueWorked.slice(0, 2).map((w) => w.title),
      ...(winRate != null && winRate >= 55 ? [`Classified win rate ${Math.round(winRate)}%`] : []),
      ...(netPnl > 0 ? ["Finished the week green"] : []),
      ...(uniqueLessons.length ? ["Captured lessons for next week"] : []),
    ]
      .filter(Boolean)
      .slice(0, 4),
    weaknesses: [
      ...mistakes.slice(0, 3).map((m) => `${m.title}${m.count > 1 ? ` (${m.count}×)` : ""}`),
      ...(tradeMgmt < 60 ? ["Trade management still leaking expectancy"] : []),
    ]
      .filter(Boolean)
      .slice(0, 4),
    advice:
      mistakes[0]
        ? `Primary fix: treat “${mistakes[0].title}” as a hard rule next week. One checklist line before every entry.`
        : uniqueLessons[0]
          ? `Carry this lesson into the open: ${uniqueLessons[0].title}`
          : "Pick one process rule and protect it for five sessions before changing anything else.",
    challenge:
      focusAreas[0]?.description ||
      "Hold the next winner to at least 1R before discretionary exit — write the plan in the journal first.",
  }

  if (!coach.strengths.length && !empty) coach.strengths.push("Showed up and journaled the week")
  if (!coach.weaknesses.length && !empty)
    coach.weaknesses.push("Add mistake tags so coaching can get sharper")

  return {
    weekStart,
    weekEnd,
    weekLabel,
    empty,
    daysWithJournals: dayList.length,
    kpis,
    grade,
    gradeStars,
    whatWorked: uniqueWorked,
    mistakes,
    lessons: uniqueLessons,
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
    setups: setups.sort((a, b) => b.count - a.count).slice(0, 6),
    timeBuckets,
    coach,
    footer: {
      bestDayLabel: bestDay && bestDay.pnl !== 0 ? bestDay.dayLabel : "—",
      bestDayPnl: bestDay && bestDay.pnl !== 0 ? formatMoney2(bestDay.pnl) : "—",
      worstDayLabel: worstDay && worstDay.pnl !== 0 ? worstDay.dayLabel : "—",
      worstDayPnl: worstDay && worstDay.pnl !== 0 ? formatMoney2(worstDay.pnl) : "—",
      bestTradeLabel: bestTrade?.instrument || "—",
      bestTradePnl: bestTrade ? formatMoney2(num(bestTrade.pnl)) : "—",
      worstTradeLabel: worstTrade?.instrument || "—",
      worstTradePnl: worstTrade ? formatMoney2(num(worstTrade.pnl)) : "—",
      scores: [
        { id: "consistency", label: "Consistency Score", value: consistency },
        { id: "discipline", label: "Discipline Score", value: discipline },
        { id: "risk", label: "Risk Management", value: risk },
        { id: "management", label: "Trade Management", value: tradeMgmt },
      ],
    },
    netPnl,
  }
}
