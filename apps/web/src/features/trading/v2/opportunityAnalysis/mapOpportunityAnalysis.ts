import type { JournalDay, JournalTrade } from "@/features/trading/types"
import type { TradeMetaPersist } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { numOrNull } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import type { OpportunityAnalysisModel } from "@/features/trading/v2/opportunityAnalysis/types"

type WorkspaceMeta = { tradesMeta?: Record<string, TradeMetaPersist> }

function parseMeta(day: JournalDay, tradeId: string): TradeMetaPersist {
  if (!day.workspace_meta_json) return {}
  try {
    const parsed = JSON.parse(day.workspace_meta_json) as WorkspaceMeta
    return parsed.tradesMeta?.[tradeId] ?? {}
  } catch {
    return {}
  }
}

function isLong(direction: string | null | undefined): boolean {
  return !direction || direction.toLowerCase() === "long"
}

function pointsBetween(
  entry: number,
  exit: number,
  long: boolean,
): number {
  return long ? exit - entry : entry - exit
}

function buildObservation(input: {
  hasData: boolean
  missedPoints: number | null
  exitEfficiencyPct: number | null
  earlyExit: boolean
  fearLike: boolean
  long: boolean
}): { observation: string; suggestion: string; aiAnalyzed: boolean } {
  if (!input.hasData) {
    return {
      observation:
        "Add a Target price in Edit Journal → Execution to estimate how much of the planned move you captured.",
      suggestion:
        "For now Opportunity Analysis uses Target as the post-exit extreme. Log Target (or Highest after exit) to quantify early exits.",
      aiAnalyzed: false,
    }
  }

  const missed = input.missedPoints ?? 0
  const eff = input.exitEfficiencyPct ?? 100

  if (missed <= 0.01) {
    return {
      observation:
        "Price did not continue favorably after your exit. You captured the available move on this trade.",
      suggestion:
        "Keep reviewing exits against post-exit price so you can spot when fear starts cutting winners short.",
      aiAnalyzed: true,
    }
  }

  const fearBit = input.fearLike
    ? "You exited the trade early due to fear of giving back profits."
    : input.earlyExit
      ? "You marked an early exit on this trade."
      : "You exited before the move fully played out."

  const moveBit = `The trend remained favorable and price moved another ${missed.toFixed(2)} points in your ${
    input.long ? "favor" : "favor"
  } after your exit.`

  const suggestion =
    eff < 50
      ? "Consider using a trailing stop-loss below the previous swing low (or above for shorts) or partial profit booking to capture more of the move."
      : "Tighten your exit rules: trail stops or scale out so fear of giving back profits does not leave large runners on the table."

  return {
    observation: `${fearBit} ${moveBit}`,
    suggestion,
    aiAnalyzed: true,
  }
}

export function mapTradeOpportunity(
  day: JournalDay,
  trade: JournalTrade,
  displayIndex: number,
): OpportunityAnalysisModel {
  const meta = parseMeta(day, trade.id)
  const long = isLong(trade.direction)
  const entry = trade.entry_price != null ? Number(trade.entry_price) : null
  const exit = trade.exit_price != null ? Number(trade.exit_price) : null
  const qty = trade.quantity != null ? Number(trade.quantity) : null
  // For now: treat Target as the post-exit extreme (Highest/Lowest After Exit).
  // Prefer explicit highestAfterExit when logged later.
  const extremum =
    numOrNull(meta.highestAfterExit || "") ?? numOrNull(meta.target || "")
  const hasData = exit != null && Number.isFinite(exit) && extremum != null && Number.isFinite(extremum)

  const actualPoints =
    entry != null && exit != null && Number.isFinite(entry) && Number.isFinite(exit)
      ? pointsBetween(entry, exit, long)
      : null

  let missedPoints: number | null = null
  if (hasData && exit != null && extremum != null) {
    missedPoints = long ? Math.max(0, extremum - exit) : Math.max(0, exit - extremum)
  }

  const potentialPoints =
    actualPoints != null && missedPoints != null ? actualPoints + missedPoints : null

  const actualProfit =
    trade.pnl != null && Number.isFinite(Number(trade.pnl))
      ? Number(trade.pnl)
      : actualPoints != null && qty != null
        ? actualPoints * qty
        : null

  const potentialExtraProfit =
    missedPoints != null && qty != null ? missedPoints * qty : null

  const potentialProfit =
    potentialPoints != null && qty != null
      ? potentialPoints * qty
      : actualProfit != null && potentialExtraProfit != null
        ? actualProfit + potentialExtraProfit
        : null

  let exitEfficiencyPct: number | null = null
  if (potentialPoints != null && potentialPoints > 0 && actualPoints != null) {
    exitEfficiencyPct = Math.round(Math.max(0, Math.min(100, (actualPoints / potentialPoints) * 100)))
  } else if (hasData && missedPoints === 0) {
    exitEfficiencyPct = 100
  }

  const mistakesMd = [...(trade.sections ?? [])]
    .find((s) => s.section_key === "mistakes")
    ?.body_markdown?.toLowerCase()
  const earlyExit = Boolean(
    mistakesMd && /early\s*exit|exited\s*too\s*early/.test(mistakesMd),
  )
  const mood = (meta.psychology?.mood || "").toLowerCase()
  const fearLike = mood === "fear" || mood === "fomo" || Boolean(mistakesMd && /\bfomo\b/.test(mistakesMd))

  const { observation, suggestion, aiAnalyzed } = buildObservation({
    hasData,
    missedPoints,
    exitEfficiencyPct,
    earlyExit,
    fearLike,
    long,
  })

  return {
    id: trade.id,
    tradeIndex: displayIndex,
    instrument: trade.instrument || "Trade",
    direction: trade.direction,
    hasData,
    actualExitPrice: exit != null && Number.isFinite(exit) ? exit : null,
    extremumAfterExit: extremum,
    extremumLabel: long ? "Highest Price After Exit" : "Lowest Price After Exit",
    missedPoints,
    potentialExtraProfit,
    actualProfit,
    actualPoints,
    potentialProfit,
    potentialPoints,
    exitEfficiencyPct,
    observation,
    suggestion,
    aiAnalyzed,
  }
}

export function mapDayOpportunityAnalyses(day: JournalDay): OpportunityAnalysisModel[] {
  const trades = [...(day.trades ?? [])].sort((a, b) => a.trade_index - b.trade_index)
  return trades.map((t, i) => mapTradeOpportunity(day, t, i + 1))
}
