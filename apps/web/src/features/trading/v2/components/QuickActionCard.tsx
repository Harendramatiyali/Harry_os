import type { QuickActionItem } from "@/features/trading/v2/types"
import { SectionHeader } from "@/features/trading/v2/components/SectionHeader"

export function QuickActionCard({
  title = "Quick Actions",
  actions,
  onAction,
}: {
  title?: string
  actions: QuickActionItem[]
  onAction?: (id: string) => void
}) {
  return (
    <section className="tv2-card space-y-2 p-3">
      <div className="px-1 pt-1">
        <SectionHeader title={title} />
      </div>
      {actions.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="flex w-full items-center gap-3 rounded-[12px] border border-[color:var(--tv2-border)] px-3 py-3 text-left text-[13px] font-medium transition-colors hover:bg-white/[0.03]"
          onClick={() => onAction?.(id)}
        >
          <span
            className="flex size-8 items-center justify-center rounded-lg"
            style={{ background: "var(--tv2-accent-soft)", color: "var(--tv2-accent)" }}
          >
            <Icon className="size-4" />
          </span>
          {label}
        </button>
      ))}
    </section>
  )
}
