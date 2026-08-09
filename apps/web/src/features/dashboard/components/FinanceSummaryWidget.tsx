import { ProgressBar } from "@/features/dashboard/components/ProgressBar"
import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { FinanceSummary } from "@/features/dashboard/types"

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export function FinanceSummaryWidget({ data }: { data: FinanceSummary }) {
  const spentPct = Math.round((data.spentThisMonth / data.budget) * 100)

  return (
    <WidgetShell title="Finance Summary" subtitle="Cash & spend" href="/finance" actionLabel="Finance">
      <div className="space-y-4">
        <div>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Liquid cash</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{inr(data.cash)}</p>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly budget</span>
            <span className="tabular-nums">
              {inr(data.spentThisMonth)} / {inr(data.budget)}
            </span>
          </div>
          <ProgressBar
            value={spentPct}
            barClassName={spentPct > 85 ? "bg-rose-300/80" : "bg-emerald-300/80"}
          />
        </div>
        <div className="rounded-2xl bg-foreground/[0.03] px-3 py-3">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Investments</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{inr(data.investments)}</p>
        </div>
      </div>
    </WidgetShell>
  )
}
