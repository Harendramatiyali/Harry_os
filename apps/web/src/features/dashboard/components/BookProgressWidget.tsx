import { ProgressBar } from "@/features/dashboard/components/ProgressBar"
import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { BookProgress } from "@/features/dashboard/types"

export function BookProgressWidget({ items }: { items: BookProgress[] }) {
  return (
    <WidgetShell title="Book Progress" subtitle="Currently reading" href="/books" actionLabel="Library">
      <ul className="space-y-4">
        {items.map((book) => (
          <li key={book.id} className="rounded-2xl bg-foreground/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="text-xs text-muted-foreground">{book.author}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{book.progress}%</span>
            </div>
            <ProgressBar value={book.progress} className="mt-3" barClassName="bg-sky-300/80" />
            <p className="mt-2 text-xs text-muted-foreground">{book.pagesLeft} pages left</p>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
