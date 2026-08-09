import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { ChartPoint } from "@/features/dashboard/types"

export function FocusChartWidget({ data }: { data: ChartPoint[] }) {
  return (
    <WidgetShell title="Focus Hours" subtitle="This week" href="/planner" actionLabel="Details">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(125, 211, 252, 0.45)" />
                <stop offset="100%" stopColor="rgba(125, 211, 252, 0)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.12)" }}
              contentStyle={{
                background: "rgba(20,24,32,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.55)" }}
              formatter={(value) => [`${value as number}h`, "Focus"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="rgba(125, 211, 252, 0.95)"
              strokeWidth={2}
              fill="url(#focusFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetShell>
  )
}

export function PnlChartWidget({ data }: { data: ChartPoint[] }) {
  return (
    <WidgetShell title="Trading P&L" subtitle="Daily net" href="/trading" actionLabel="Analytics">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              width={40}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "rgba(20,24,32,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value) => [
                `₹${Number(value).toLocaleString("en-IN")}`,
                "P&L",
              ]}
            />
            <Bar dataKey="value" radius={[8, 8, 8, 8]} maxBarSize={28}>
              {data.map((point) => (
                <Cell
                  key={point.label}
                  fill={point.value >= 0 ? "rgba(110, 231, 183, 0.75)" : "rgba(251, 113, 133, 0.75)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetShell>
  )
}
