import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { JournalEntry } from "@/features/dashboard/types"

export function RecentJournalWidget({ items }: { items: JournalEntry[] }) {
  return (
    <WidgetShell title="Recent Journal" subtitle="Reflections" href="/trading" actionLabel="Journal">
      <ul className="space-y-3">
        {items.map((entry) => (
          <li key={entry.id} className="rounded-2xl border border-white/5 bg-foreground/[0.03] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{entry.title}</p>
              <span className="text-[11px] text-muted-foreground">{entry.date}</span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {entry.excerpt}
            </p>
            <p className="mt-2 text-[11px] tracking-wide text-foreground/70 uppercase">
              {entry.mood}
            </p>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
