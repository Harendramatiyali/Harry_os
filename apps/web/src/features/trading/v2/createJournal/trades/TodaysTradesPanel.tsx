import { CandlestickChart, Plus } from "lucide-react"
import { useMemo, useState } from "react"

import { TradeInstrumentGroup } from "@/features/trading/v2/createJournal/trades/TradeInstrumentGroup"
import {
  createEmptyTradeReview,
  estimateTradePnl,
  groupTradesByInstrument,
  inferResult,
  numOrNull,
  applyTradePatch,
  type DraftTradeReview,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { formatMoney2 } from "@/features/trading/v2/mapJournalToV2"

export function TodaysTradesPanel({
  trades,
  journalDate,
  onChange,
  onDeleteTrade,
  deletingId,
}: {
  trades: DraftTradeReview[]
  journalDate: string
  onChange: (trades: DraftTradeReview[]) => void
  onDeleteTrade: (id: string) => void
  deletingId?: string | null
}) {
  const groups = useMemo(() => groupTradesByInstrument(trades), [trades])
  const [openGroup, setOpenGroup] = useState<string | null>(() => groups[0]?.group ?? null)
  const [openTradeId, setOpenTradeId] = useState<string | null>(() => trades[0]?.id ?? null)

  // Keep open group valid when trades change
  const activeGroup =
    openGroup && groups.some((g) => g.group === openGroup) ? openGroup : groups[0]?.group ?? null

  const stats = useMemo(() => {
    let wins = 0
    let losses = 0
    let pnl = 0
    const instruments = new Set<string>()
    for (const t of trades) {
      instruments.add(t.instrumentGroup || "OTHER")
      const p = numOrNull(t.pnl) ?? estimateTradePnl(t) ?? 0
      pnl += p
      const r = inferResult(t)
      if (r === "win") wins += 1
      if (r === "loss") losses += 1
    }
    const winRate = trades.length ? (wins / trades.length) * 100 : 0
    return {
      total: trades.length,
      wins,
      losses,
      instruments: instruments.size,
      winRate,
      pnl,
    }
  }, [trades])

  const updateTrade = (id: string, patch: Partial<DraftTradeReview>) => {
    // Keep the accordion open on the trade when its instrument group changes (e.g. on blur).
    if (typeof patch.instrumentGroup === "string" && patch.instrumentGroup) {
      setOpenGroup(patch.instrumentGroup)
      setOpenTradeId(id)
    }
    onChange(
      trades.map((t) => (t.id === id ? applyTradePatch(t, patch) : t)),
    )
  }

  const addTrade = () => {
    const next = createEmptyTradeReview(trades.length + 1, journalDate)
    const list = [...trades, next].map((t, i) => ({ ...t, tradeIndex: i + 1 }))
    onChange(list)
    setOpenGroup(next.instrumentGroup)
    setOpenTradeId(next.id)
  }

  return (
    <section id="section-trades" className="cj-card tr-panel">
      <div className="cj-card-head">
        <h3 className="cj-card-title">
          <CandlestickChart size={15} />
          Today&apos;s Trades
        </h3>
      </div>

      <div className="tr-overview">
        <div className="tr-overview-stats">
          <div>
            <span className="tr-field-label">Total Trades</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span className="tr-field-label">Winning</span>
            <strong className="tv2-positive">{stats.wins}</strong>
          </div>
          <div>
            <span className="tr-field-label">Losing</span>
            <strong className="tv2-negative">{stats.losses}</strong>
          </div>
          <div>
            <span className="tr-field-label">Instruments</span>
            <strong>{stats.instruments}</strong>
          </div>
          <div>
            <span className="tr-field-label">Win Rate</span>
            <strong>{stats.winRate.toFixed(2)}%</strong>
          </div>
          <div>
            <span className="tr-field-label">Total P&amp;L</span>
            <strong className={stats.pnl >= 0 ? "tv2-positive" : "tv2-negative"}>
              {formatMoney2(stats.pnl)}
            </strong>
          </div>
        </div>
        <button type="button" className="cj-btn cj-btn-primary" onClick={addTrade}>
          <Plus size={14} /> Add Trade
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="cj-empty-trades">
          <div className="cj-empty-icon">
            <CandlestickChart size={22} />
          </div>
          <p>No trades added yet</p>
          <p className="tv2-caption">
            Add a trade to open the professional review workspace — grouped by instrument.
          </p>
          <button type="button" className="cj-btn cj-btn-primary" onClick={addTrade}>
            <Plus size={14} /> Add Trade
          </button>
        </div>
      ) : (
        <div className="tr-groups">
          {groups.map((g) => (
            <TradeInstrumentGroup
              key={g.group}
              group={g.group}
              trades={g.trades}
              expanded={activeGroup === g.group}
              expandedTradeId={activeGroup === g.group ? openTradeId : null}
              onToggleGroup={() => {
                setOpenGroup((prev) => (prev === g.group ? null : g.group))
                if (g.trades[0]) setOpenTradeId(g.trades[0].id)
              }}
              onToggleTrade={(id) => {
                setOpenGroup(g.group)
                setOpenTradeId((prev) => (prev === id ? null : id))
              }}
              onChangeTrade={updateTrade}
              onDeleteTrade={onDeleteTrade}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </section>
  )
}
