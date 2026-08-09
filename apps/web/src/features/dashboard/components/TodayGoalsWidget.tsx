import { ProgressBar } from "@/features/dashboard/components/ProgressBar"
import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { GoalItem } from "@/features/dashboard/types"

export function TodayGoalsWidget({ items }: { items: GoalItem[] }) {
  return (
    <WidgetShell title="Today's Goals" subtitle="Active outcomes" href="/goals" actionLabel="Goals">
      <ul className="space-y-4">
        {items.map((goal) => (
          <li key={goal.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{goal.title}</p>
                <p className="text-xs text-muted-foreground">{goal.domain}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{goal.progress}%</span>
            </div>
            <ProgressBar value={goal.progress} />
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
