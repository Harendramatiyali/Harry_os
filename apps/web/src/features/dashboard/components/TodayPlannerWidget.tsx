import { Check } from "lucide-react"

import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { PlannerBlock } from "@/features/dashboard/types"
import { cn } from "@/shared/lib/utils"

export function TodayPlannerWidget({ items }: { items: PlannerBlock[] }) {
  return (
    <WidgetShell title="Today's Planner" subtitle="Time blocks" href="/planner" actionLabel="Planner">
      <ul className="space-y-2.5">
        {items.map((block) => (
          <li
            key={block.id}
            className={cn(
              "flex items-start gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2.5",
              block.done && "opacity-55",
            )}
          >
            <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
              {block.time}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", block.done && "line-through")}>
                {block.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{block.tag}</p>
            </div>
            <span
              className={cn(
                "mt-0.5 flex size-5 items-center justify-center rounded-full border border-foreground/15",
                block.done && "bg-foreground text-background",
              )}
            >
              {block.done ? <Check className="size-3" /> : null}
            </span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
