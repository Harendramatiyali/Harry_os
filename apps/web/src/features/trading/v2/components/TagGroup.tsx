import type { TagItem } from "@/features/trading/v2/types"
import { SectionHeader } from "@/features/trading/v2/components/SectionHeader"

export function TagGroup({
  title = "Tags",
  tags,
  onManage,
}: {
  title?: string
  tags: TagItem[]
  onManage?: () => void
}) {
  return (
    <section className="tv2-card space-y-3 p-4">
      <SectionHeader
        title={title}
        action={
          <button type="button" className="tv2-btn tv2-btn-sm tv2-btn-ghost" onClick={onManage}>
            Manage
          </button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag.id} className="tv2-pill-tag">
            {tag.label}
            {typeof tag.count === "number" ? ` (${tag.count})` : ""}
          </span>
        ))}
      </div>
    </section>
  )
}
