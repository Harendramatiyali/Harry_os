import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { TradingSummary } from "@/features/dashboard/types"
import { cn } from "@/shared/lib/utils"

function money(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : ""
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN")}`
}

export function TradingSummaryWidget({ data }: { data: TradingSummary }) {
  return (
    <WidgetShell title="Trading Summary" subtitle="Session pulse" href="/trading" actionLabel="Journal">
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Day P&L"
          value={money(data.dayPnl)}
          tone={data.dayPnl >= 0 ? "up" : "down"}
        />
        <Metric
          label="Week P&L"
          value={money(data.weekPnl)}
          tone={data.weekPnl >= 0 ? "up" : "down"}
        />
        <Metric label="Win rate" value={`${data.winRate.toFixed(1)}%`} />
        <Metric label="Trades today" value={String(data.tradesToday)} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Open risk · <span className="text-foreground">{data.openRisk.toFixed(1)}R</span>
      </p>
    </WidgetShell>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "up" | "down"
}) {
  return (
    <div className="rounded-2xl bg-foreground/[0.03] px-3 py-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight tabular-nums",
          tone === "up" && "text-emerald-300",
          tone === "down" && "text-rose-300",
        )}
      >
        {value}
      </p>
    </div>
  )
}
