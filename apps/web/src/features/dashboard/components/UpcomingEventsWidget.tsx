import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { UpcomingEvent } from "@/features/dashboard/types"
import { cn } from "@/shared/lib/utils"

const typeDot: Record<UpcomingEvent["type"], string> = {
  meeting: "bg-violet-300",
  review: "bg-amber-300",
  personal: "bg-emerald-300",
  market: "bg-sky-300",
}

export function UpcomingEventsWidget({ items }: { items: UpcomingEvent[] }) {
  return (
    <WidgetShell title="Upcoming Events" subtitle="Next few days" href="/planner" actionLabel="Calendar">
      <ul className="space-y-3">
        {items.map((event) => (
          <li key={event.id} className="flex items-start gap-3">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", typeDot[event.type])} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
