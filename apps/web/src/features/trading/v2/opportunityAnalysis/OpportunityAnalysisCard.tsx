import { useState } from "react"
import type { CSSProperties } from "react"
import { ChevronDown, CircleHelp, Crown, Lightbulb } from "lucide-react"
import { formatMoney2, num2 } from "@/features/trading/v2/mapJournalToV2"
import type { OpportunityAnalysisModel } from "@/features/trading/v2/opportunityAnalysis/types"
import { cn } from "@/shared/lib/utils"
import "@/features/trading/v2/tradeDetail/tradeDetail.css"
import "@/features/trading/v2/opportunityAnalysis/opportunityAnalysis.css"

function fmtPts(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—"
  const sign = n > 0 ? "+" : ""
  return `${sign}${num2(n)} Points`
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return num2(n)
}

function fmtMoney(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return formatMoney2(n)
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

export function OpportunityDaySummary({
  analyses,
  title,
  defaultOpen = true,
}: {
  analyses: OpportunityAnalysisModel[]
  title: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const totalMissedPoints = sumNullable(analyses.map((a) => a.missedPoints))
  const totalPotentialExtra = sumNullable(analyses.map((a) => a.potentialExtraProfit))
  const totalActual = sumNullable(analyses.map((a) => a.actualProfit))
  const totalPotential = sumNullable(analyses.map((a) => a.potentialProfit))
  const withEff = analyses.filter((a) => a.exitEfficiencyPct != null)
  const avgEff =
    withEff.length > 0
      ? Math.round(
          withEff.reduce((s, a) => s + (a.exitEfficiencyPct ?? 0), 0) / withEff.length,
        )
      : null
  const analyzed = analyses.filter((a) => a.hasData).length

  return (
    <article className={cn("oa-card oa-day", open && "is-open")}>
      <button
        type="button"
        className="oa-collapse"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="oa-collapse__main">
          <div className="oa-collapse__title-row">
            <h2 className="oa-title">
              Day Opportunity Summary
              <span className="oa-help" title="Session rollup of profit left on the table.">
                <CircleHelp size={15} strokeWidth={1.75} />
              </span>
            </h2>
            {avgEff != null ? (
              <span className="oa-badge">{avgEff}% Avg Efficiency</span>
            ) : (
              <span className="oa-badge oa-badge--muted">Needs Data</span>
            )}
          </div>
          <p className="oa-subtitle">
            {title} · {analyses.length} trade{analyses.length === 1 ? "" : "s"}
            {analyzed ? ` · ${analyzed} with target data` : ""}
            {" · "}
            Missed {totalMissedPoints != null ? `${num2(totalMissedPoints)} pts` : "—"}
            {" · "}
            Extra {fmtMoney(totalPotentialExtra)}
          </p>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={cn("oa-collapse__chev", open && "is-open")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="oa-trade__body">
          <section className="oa-kpi-row oa-kpi-row--day">
            <div className="oa-kpi">
              <span className="oa-kpi__label">Total Missed Points</span>
              <strong className="oa-kpi__value oa-kpi__value--amber">
                {totalMissedPoints != null ? num2(totalMissedPoints) : "—"}
              </strong>
            </div>
            <div className="oa-kpi">
              <span className="oa-kpi__label">Total Potential Extra Profit</span>
              <strong className="oa-kpi__value oa-kpi__value--green">
                {fmtMoney(totalPotentialExtra)}
              </strong>
            </div>
            <div className="oa-kpi">
              <span className="oa-kpi__label">Total Actual Profit</span>
              <strong className="oa-kpi__value oa-kpi__value--green">
                {fmtMoney(totalActual)}
              </strong>
            </div>
            <div className="oa-kpi">
              <span className="oa-kpi__label">Total Potential Profit</span>
              <strong className="oa-kpi__value oa-kpi__value--violet">
                {fmtMoney(totalPotential)}
              </strong>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  )
}

export function OpportunityAnalysisCard({
  model,
  defaultOpen = false,
}: {
  model: OpportunityAnalysisModel
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const eff = model.exitEfficiencyPct
  const captured = eff ?? 0

  return (
    <article className={cn("oa-card oa-trade", open && "is-open")}>
      <button
        type="button"
        className="oa-collapse"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="oa-collapse__main">
          <div className="oa-collapse__title-row">
            <h2 className="oa-title">
              Trade #{model.tradeIndex}
              <span className="oa-collapse__instrument">{model.instrument}</span>
            </h2>
            {model.aiAnalyzed ? (
              <span className="oa-badge">AI Analyzed</span>
            ) : (
              <span className="oa-badge oa-badge--muted">Needs Data</span>
            )}
          </div>
          <p className="oa-subtitle">
            {model.direction ? `${model.direction} · ` : ""}
            Missed {model.missedPoints != null ? `${num2(model.missedPoints)} pts` : "—"}
            {" · "}
            Left on table {fmtMoney(model.potentialExtraProfit)}
            {" · "}
            Efficiency {eff != null ? `${eff}%` : "—"}
          </p>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={cn("oa-collapse__chev", open && "is-open")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="oa-trade__body">
          <section className="oa-kpi-row">
            <div className="oa-kpi">
              <span className="oa-kpi__label">Actual Exit Price</span>
              <strong className="oa-kpi__value oa-kpi__value--green">
                {fmtPrice(model.actualExitPrice)}
              </strong>
            </div>
            <div className="oa-kpi">
              <span className="oa-kpi__label">{model.extremumLabel}</span>
              <strong className="oa-kpi__value oa-kpi__value--violet">
                {fmtPrice(model.extremumAfterExit)}
              </strong>
            </div>
            <div className="oa-kpi">
              <span className="oa-kpi__label">Missed Points</span>
              <strong className="oa-kpi__value oa-kpi__value--amber">
                {model.missedPoints != null ? num2(model.missedPoints) : "—"}
              </strong>
            </div>
            <div className="oa-kpi">
              <span className="oa-kpi__label">Potential Extra Profit</span>
              <strong className="oa-kpi__value oa-kpi__value--green">
                {fmtMoney(model.potentialExtraProfit)}
              </strong>
            </div>
          </section>

          <section className="oa-efficiency">
            <div className="oa-efficiency__side">
              <span className="oa-kpi__label">Actual Profit</span>
              <strong className="oa-efficiency__money oa-kpi__value--green">
                {fmtMoney(model.actualProfit)}
              </strong>
              <span className="oa-efficiency__pts">{fmtPts(model.actualPoints)}</span>
              <span className="oa-efficiency__cap">Captured</span>
            </div>

            <div
              className="oa-gauge"
              style={{ "--pct": String(captured) } as CSSProperties}
              role="img"
              aria-label={`Exit efficiency ${eff != null ? `${eff}%` : "unavailable"}`}
            >
              <div className="oa-gauge__ring">
                <strong>{eff != null ? `${eff}%` : "—"}</strong>
                <span>Exit Efficiency</span>
              </div>
            </div>

            <div className="oa-efficiency__side oa-efficiency__side--right">
              <span className="oa-kpi__label">Potential Profit</span>
              <strong className="oa-efficiency__money oa-kpi__value--violet">
                {fmtMoney(model.potentialProfit)}
              </strong>
              <span className="oa-efficiency__pts">{fmtPts(model.potentialPoints)}</span>
              <span className="oa-efficiency__cap">Total</span>
            </div>
          </section>

          <section className="oa-left-table">
            <div className="oa-left-table__missed">
              <span className="oa-kpi__label">Profit Left on Table</span>
              <strong className="oa-kpi__value oa-kpi__value--amber">
                {fmtMoney(model.potentialExtraProfit)}
              </strong>
              <span className="oa-efficiency__pts">
                {model.missedPoints != null ? `${num2(model.missedPoints)} Points` : "—"}
              </span>
            </div>
            <div className="oa-left-table__captured">
              <span className="oa-kpi__label">Captured Move</span>
              <div className="oa-bar" aria-hidden>
                <div className="oa-bar__fill" style={{ width: `${captured}%` }} />
              </div>
              <p className="oa-bar__caption">
                {eff != null
                  ? `You captured ${eff}% of the total available move.`
                  : "Add a Target price in Execution to calculate captured move."}
              </p>
            </div>
          </section>

          <section className={cn("oa-ai", !model.aiAnalyzed && "oa-ai--muted")}>
            <header className="oa-ai__head">
              <span className="oa-ai__icon" aria-hidden>
                <Crown size={14} strokeWidth={1.75} />
              </span>
              <h3>AI Observation</h3>
            </header>
            <p className="oa-ai__body">{model.observation}</p>
            <div className="oa-ai__tip">
              <Lightbulb size={15} strokeWidth={1.75} />
              <p>{model.suggestion}</p>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  )
}
