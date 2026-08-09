import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { TaskItem } from "@/features/dashboard/types"
import { cn } from "@/shared/lib/utils"

const priorityTone: Record<TaskItem["priority"], string> = {
  high: "bg-rose-400/20 text-rose-200",
  medium: "bg-amber-400/20 text-amber-100",
  low: "bg-sky-400/15 text-sky-100",
}

export function TodayTasksWidget({ items }: { items: TaskItem[] }) {
  const open = items.filter((t) => !t.done).length

  return (
    <WidgetShell
      title="Today's Tasks"
      subtitle={`${open} open · ${items.length - open} done`}
      href="/tasks"
      actionLabel="Tasks"
    >
      <ul className="space-y-2">
        {items.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-3 rounded-2xl px-1 py-1.5 transition-colors hover:bg-foreground/[0.03]"
          >
            <span
              className={cn(
                "size-4 shrink-0 rounded-full border border-foreground/25",
                task.done && "border-transparent bg-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm", task.done && "text-muted-foreground line-through")}>
                {task.title}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                priorityTone[task.priority],
              )}
            >
              {task.priority}
            </span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
