import type {
  JournalDay,
  JournalDaySection,
  JournalDaySummary,
  JournalTrade,
  TradingAnalytics,
} from "@/features/trading/types"
import type {
  ArticleBlock,
  JournalCardModel,
  JournalGroupModel,
  JournalSource,
  StatCardModel,
  TagItem,
  TradeHistoryItem,
} from "@/features/trading/v2/types"
import { mapDayTradesToDetails } from "@/features/trading/v2/tradeDetail/mapTradeDetail"
import { mapJournalWorkspacePanel } from "@/features/trading/v2/journalWorkspace/mapJournalWorkspace"

/** Always show 2 decimal places for prices / quantities. */
export function num2(n: number | string | null | undefined, fallback = "—"): string {
  if (n == null || n === "") return fallback
  const v = Number(n)
  if (Number.isNaN(v)) return String(n)
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatMoney2(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  const sign = v > 0 ? "+" : v < 0 ? "−" : ""
  return `${sign}₹${Math.abs(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatJournalDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function groupLabel(iso: string): string {
  const today = todayIso()
  if (iso === today) return "Today"
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (iso === y.toISOString().slice(0, 10)) return "Yesterday"
  return formatJournalDate(iso)
}

export function mapJournalSource(source: string | null | undefined): JournalSource {
  const s = (source ?? "").toLowerCase()
  if (s.includes("obsidian") || s.includes("vault")) return "Obsidian"
  if (s.includes("ai") || s.includes("import") || s.includes("harry")) return "AI"
  return "Manual"
}

export function mapJournalCard(day: JournalDaySummary): JournalCardModel {
  return {
    id: day.id,
    date: formatJournalDate(day.journal_date),
    title: day.title?.trim() || day.primary_instrument || "Untitled journal",
    source: mapJournalSource(day.source),
    trades: day.trade_count ?? 0,
    pnl: resolveDayPnl(day),
    favorite: Boolean(day.is_favorite),
  }
}

/** Prefer day_pnl; if it's zero/empty but trades have P&L, roll them up. */
export function resolveDayPnl(day: {
  day_pnl?: number | string | null
  trades?: Array<{ pnl?: number | string | null }>
}): number {
  const listed = Number(day.day_pnl ?? 0)
  if (!day.trades?.length) return listed
  const sum = day.trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0)
  if (listed === 0 && sum !== 0) return sum
  return listed
}

export function groupJournalCards(days: JournalDaySummary[]): JournalGroupModel[] {
  const sorted = [...days].sort((a, b) => b.journal_date.localeCompare(a.journal_date))
  const map = new Map<string, JournalCardModel[]>()
  for (const day of sorted) {
    const label = groupLabel(day.journal_date)
    const list = map.get(label) ?? []
    list.push(mapJournalCard(day))
    map.set(label, list)
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
}

export function mapStatsFromAnalytics(
  analytics: TradingAnalytics | undefined,
  journals: JournalDaySummary[],
  periodLabel = "Period",
): StatCardModel[] {
  const periodPnl = journals.reduce((sum, j) => sum + resolveDayPnl(j), 0)
  const periodTrades = journals.reduce((sum, j) => sum + (j.trade_count ?? 0), 0)

  const winRate = analytics ? analytics.win_rate * (analytics.win_rate <= 1 ? 100 : 1) : 0
  const winners = analytics?.winners ?? 0
  const losers = analytics?.losers ?? 0
  const flats =
    analytics?.breakevens ??
    Math.max(
      0,
      (analytics?.trades_count ?? 0) -
        winners -
        losers -
        (analytics?.open_count ?? 0),
    )
  const avgR = analytics?.avg_r != null ? Number(analytics.avg_r) : null
  const netPnl = Number(analytics?.net_pnl ?? periodPnl)
  const latest = [...journals].sort((a, b) => b.journal_date.localeCompare(a.journal_date))[0]
  const cleanTitle = (latest?.title || latest?.primary_instrument || "No journal yet")
    .replace(/^[\s📅🗓️🌍📈📖✅❌📜🎯🧠🏆💬*#_]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
  const biasRaw = (latest?.day_bias || "").trim()
  const biasLabel = biasRaw
    ? biasRaw.replace(/^[\s✅❌]+/u, "").trim()
    : "Not set"
  const insightRows = latest
    ? [
        { label: "Session", value: formatJournalDate(latest.journal_date) },
        { label: "Bias", value: biasLabel },
        { label: "Journal", value: cleanTitle || "Untitled" },
      ]
    : [{ label: "Status", value: "Import a journal to unlock insights" }]

  return [
    {
      id: "pnl",
      title: `P&L · ${periodLabel}`,
      value: formatMoney2(periodPnl),
      valueTone: periodPnl > 0 ? "positive" : periodPnl < 0 ? "negative" : "default",
      badge: periodTrades ? `${periodTrades} journal trades` : "No trades",
      badgeTone: "ai",
      trend: periodPnl >= 0 ? "up" : "down",
      subtitleLeft: `Net ${formatMoney2(netPnl)}`,
      subtitleRight: `Closed ${analytics?.closed_count ?? 0}`,
    },
    {
      id: "winrate",
      title: "Win Rate",
      value: `${winRate.toFixed(2)}%`,
      variant: "winRate",
      winRatePct: winRate,
      wins: winners,
      losses: losers,
      flats,
    },
    {
      id: "rr",
      title: "Risk Reward",
      value: avgR != null && !Number.isNaN(avgR) ? avgR.toFixed(2) : "—",
      valueTone: "purple",
      trend: "purple",
      subtitleLeft: `Expectancy ${analytics?.expectancy_r != null ? Number(analytics.expectancy_r).toFixed(2) : "—"}R`,
      subtitleRight: `PF ${analytics?.profit_factor != null ? Number(analytics.profit_factor).toFixed(2) : "—"}`,
    },
    {
      id: "trades",
      title: "Total Trades",
      value: String(analytics?.trades_count ?? periodTrades),
      badge: periodLabel,
      trend: "none",
      subtitleLeft: `Open ${analytics?.open_count ?? 0}`,
      subtitleRight: `Closed ${analytics?.closed_count ?? 0}`,
    },
    {
      id: "ai",
      title: "AI Market Insight",
      value: "",
      variant: "aiInsight",
      badge: "BETA",
      insightRows,
      insightBody: latest
        ? `${formatJournalDate(latest.journal_date)} · Bias ${biasLabel}`
        : "Import a journal to unlock insights",
      insightCta: "Ask AI Assistant",
    },
  ]
}

export function mapTradeHistory(trades: JournalTrade[]): TradeHistoryItem[] {
  return [...trades]
    .sort((a, b) => a.trade_index - b.trade_index)
    .map((t, i) => ({
      id: t.id,
      time: `#${i + 1}`,
      name: t.instrument || t.title_suffix || `Trade ${i + 1}`,
      qty: t.quantity != null ? num2(t.quantity) : "—",
      entry: t.entry_price != null ? num2(t.entry_price) : "—",
      exit: t.exit_price != null ? num2(t.exit_price) : "—",
      stop: t.stop_price != null ? num2(t.stop_price) : undefined,
      pnl: Number(t.pnl ?? 0),
      direction: t.direction,
      setup: t.setup,
      grade: t.grade,
      result: t.result,
      chartCount: t.attachments?.filter((a) => a.import_status === "copied" || a.storage_path).length ?? 0,
    }))
}

export function mapTagsFromAnalytics(analytics: TradingAnalytics | undefined): TagItem[] {
  const tags = analytics?.by_tag ?? []
  return tags.slice(0, 12).map((t) => ({
    id: t.tag,
    label: t.tag,
    count: t.count,
  }))
}

/** Strip Obsidian embeds so text stays readable next to the gallery. */
export function stripWikilinks(text: string): string {
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

function sectionHaystack(s: JournalDaySection | { section_key: string; heading_original: string | null }) {
  return `${s.section_key} ${s.heading_original ?? ""}`.toLowerCase()
}

function sectionMatches(
  section: JournalDaySection | { section_key: string; heading_original: string | null },
  needles: string[],
) {
  const hay = sectionHaystack(section)
  return needles.some((n) => hay.includes(n))
}

function cleanBody(body: string | null | undefined): string {
  return stripWikilinks(body ?? "")
}

function tradeIsWin(t: JournalTrade): boolean {
  const r = (t.result ?? "").toLowerCase()
  if (/profit|winner|target|booked|win/.test(r)) return true
  if (/loss|loser|stop|sl/.test(r)) return false
  return Number(t.pnl ?? 0) > 0
}

function collectTradeSectionSnippets(day: JournalDay, needles: string[]): string[] {
  const lines: string[] = []
  for (const trade of day.trades) {
    for (const s of trade.sections ?? []) {
      if (!sectionMatches(s, needles)) continue
      const body = cleanBody(s.body_markdown)
      if (!body) continue
      lines.push(`**Trade ${trade.trade_index}** (${trade.instrument || "—"}): ${body}`)
    }
  }
  return lines
}

/** Synthesize readable psychology notes when the vault note has no psychology section. */
export function derivePsychology(day: JournalDay): string {
  const wins = day.trades.filter(tradeIsWin).length
  const losses = day.trades.length - wins
  const pnl = resolveDayPnl(day)
  const snippets = collectTradeSectionSnippets(day, [
    "psych",
    "emotion",
    "mind",
    "mistake",
    "root_cause",
    "next_time",
    "what_went_well",
  ])

  const bullets: string[] = []
  bullets.push("### Session readout")
  bullets.push(
    [
      day.day_bias ? `- Bias noted: **${day.day_bias}**` : null,
      day.day_result ? `- Day result: **${day.day_result}**` : null,
      day.overall_grade ? `- Overall grade: **${day.overall_grade}**` : null,
      `- Session P&L: **${formatMoney2(pnl)}**`,
      day.trades.length
        ? `- Trade mix: **${wins} winners / ${losses} losers** across ${day.trades.length} trades`
        : "- No linked trades to score emotional load",
    ]
      .filter(Boolean)
      .join("\n"),
  )

  bullets.push("\n### Emotional pattern")
  if (day.trades.length === 0) {
    bullets.push(
      "- No trade log to infer psychology. Capture how you felt at open, mid-session, and close next time.",
    )
  } else if (wins > losses && pnl >= 0) {
    bullets.push(
      "- Green session with a winning majority — protect the confidence by sticking to the same process tomorrow.",
      "- Watch for overconfidence on the next open; size stays plan-based even after a good day.",
    )
  } else if (losses > wins || pnl < 0) {
    bullets.push(
      "- Drawdown pressure was present — prioritize process over P&L recovery.",
      "- After the first loss, pause before the next entry to avoid revenge sizing.",
      "- Write one sentence on what you felt after the worst trade (frustration, urgency, FOMO).",
    )
  } else {
    bullets.push(
      "- Mixed day — emotional control mattered more than directional bias.",
      "- Keep journaling the first impulse after each exit (calm / rush / doubt).",
    )
  }

  const graded = day.trades.filter((t) => t.grade)
  if (graded.length) {
    const weak = graded.filter((t) => /f|d|c-/i.test(t.grade ?? ""))
    bullets.push("\n### Grade signal")
    bullets.push(
      weak.length
        ? `- ${weak.length} trade(s) graded weakly — review those for hesitation or rule breaks.`
        : "- Grades look solid — reinforce what kept execution clean.",
    )
  }

  if (snippets.length) {
    bullets.push("\n### From trade notes")
    bullets.push(...snippets.slice(0, 6).map((s) => `- ${s}`))
  } else {
    bullets.push("\n### Suggested focus")
    bullets.push(
      "- Pre-market: one sentence on energy / sleep / distraction level.",
      "- Mid-session: note if you felt rushed or patient.",
      "- Post-close: rate discipline 1–10 and why.",
    )
  }

  bullets.push("\n_Synthesized from this journal — edit after you add a dedicated Psychology section in Obsidian._")
  return bullets.join("\n")
}

export function deriveMistakes(day: JournalDay): string {
  const snippets = collectTradeSectionSnippets(day, ["mistake", "error", "root_cause", "wrong"])
  const losers = day.trades.filter((t) => !tradeIsWin(t))
  const lines: string[] = ["### Mistakes (derived)", ""]

  if (snippets.length) {
    lines.push(...snippets.slice(0, 8).map((s) => `- ${s}`))
  }

  if (losers.length) {
    lines.push("\n### Losing trades to review")
    for (const t of losers.slice(0, 6)) {
      lines.push(
        `- Trade ${t.trade_index}: ${t.instrument || "—"} · ${t.direction || "?"} · P&L ${formatMoney2(t.pnl)} · Result ${t.result || "n/a"}`,
      )
    }
  }

  if (!snippets.length && !losers.length) {
    lines.push("- No explicit mistake notes found. Tag rule breaks in Obsidian under a Mistakes heading.")
  }

  lines.push("\n_Synthesized from trades when a Mistakes section was missing._")
  return lines.join("\n")
}

export function deriveLessons(day: JournalDay): string {
  const snippets = collectTradeSectionSnippets(day, [
    "lesson",
    "learning",
    "next_time",
    "takeaway",
    "what_went_well",
  ])
  const lines: string[] = ["### Lessons (derived)", ""]

  if (day.day_bias) lines.push(`- Respect the session bias you wrote: **${day.day_bias}**.`)
  if (resolveDayPnl(day) > 0) {
    lines.push("- Green day: write down the 1 decision that protected the win.")
  } else if (resolveDayPnl(day) < 0) {
    lines.push("- Red day: define one rule that would have cut the loss earlier.")
  }

  if (snippets.length) {
    lines.push("\n### From trade notes")
    lines.push(...snippets.slice(0, 8).map((s) => `- ${s}`))
  } else {
    lines.push(
      "- Capture one keep / one stop / one start for tomorrow.",
      "- Promote any repeated setup note into a standing rule.",
    )
  }

  lines.push("\n_Synthesized from this journal — replace with your Lessons section when available._")
  return lines.join("\n")
}

export function mapDayToArticleBlocks(day: JournalDay, workspaceTab: string): ArticleBlock[] {
  const title = day.title?.trim() || day.primary_instrument || formatJournalDate(day.journal_date)

  // Premium card layouts for all primary journal workspace tabs
  if (
    workspaceTab === "overview" ||
    workspaceTab === "market-analysis" ||
    workspaceTab === "psychology" ||
    workspaceTab === "mistakes" ||
    workspaceTab === "lessons" ||
    workspaceTab === "learning" ||
    workspaceTab === "screenshots" ||
    workspaceTab === "opportunity-analysis"
  ) {
    const panel = mapJournalWorkspacePanel(day, workspaceTab)
    if (panel) return [{ type: "journalPanel", panel }]
  }

  const blocks: ArticleBlock[] = [{ type: "heading", text: title }]

  if (workspaceTab === "trades") {
    if (!day.trades.length) {
      blocks.push({
        type: "section",
        title: "Trade log",
        body: "No trades parsed for this journal yet.",
      })
      return blocks
    }
    for (const trade of mapDayTradesToDetails(day)) {
      blocks.push({ type: "tradeDetail", trade })
    }
    return blocks
  }

  blocks.push({
    type: "section",
    title: "No content",
    body: `No ${workspaceTab.replace(/-/g, " ")} section found in this journal.`,
  })
  return blocks
}

export function performanceFromDay(day: JournalDay | undefined) {
  if (!day) {
    return {
      score: 0,
      checklist: ["Open a journal to see AI performance review"],
      metrics: [
        { label: "Discipline", value: 0 },
        { label: "Timing", value: 0 },
        { label: "Risk", value: 0 },
      ],
    }
  }
  const followed = day.trades.filter((t) => t.grade && !/f|d/i.test(t.grade)).length
  const scored = day.trades.filter((t) => t.grade).length
  const winish = day.trades.filter(tradeIsWin).length
  const score = scored
    ? Math.round((followed / Math.max(scored, 1)) * 70 + (winish / Math.max(day.trades.length, 1)) * 30)
    : 50
  return {
    score: Math.min(99, Math.max(20, score)),
    checklist: [
      day.day_bias ? `Bias noted: ${day.day_bias}` : "Session bias captured",
      day.trade_count ? `${day.trade_count} trades reviewed` : "No trades linked yet",
      day.overall_grade ? `Day grade ${day.overall_grade}` : "Grade pending",
    ],
    metrics: [
      { label: "Discipline", value: Math.min(100, 60 + (day.overall_grade ? 20 : 0)) },
      { label: "Timing", value: Math.min(100, 55 + winish * 5) },
      { label: "Risk", value: Math.min(100, 70 + (resolveDayPnl(day) >= 0 ? 15 : 0)) },
    ],
  }
}
