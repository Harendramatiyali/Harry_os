import { WidgetShell } from "@/features/dashboard/components/WidgetShell"
import type { QuickNote } from "@/features/dashboard/types"

export function QuickNotesWidget({ items }: { items: QuickNote[] }) {
  return (
    <WidgetShell title="Quick Notes" subtitle="Capture stream" href="/notes" actionLabel="Notes">
      <ul className="space-y-2.5">
        {items.map((note) => (
          <li key={note.id} className="rounded-2xl bg-foreground/[0.03] px-3 py-3">
            <p className="text-sm leading-relaxed text-foreground/90">{note.body}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{note.updatedAt}</p>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
