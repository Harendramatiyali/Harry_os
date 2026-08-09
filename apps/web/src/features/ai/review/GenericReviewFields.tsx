import type { ImportReviewDraft } from "@/features/ai/importReviewTypes"
import type { ReviewFieldMeta } from "@/features/ai/review/reviewEngine"
import type { ReviewEngineHandlers } from "@/features/ai/review/DynamicReviewEngine"
import { cn } from "@/shared/lib/utils"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

export function GenericReviewFields({
  draft,
  fields,
  groups,
  handlers,
}: {
  draft: ImportReviewDraft
  fields: ReviewFieldMeta[]
  groups: Record<string, ReviewFieldMeta[]>
  handlers: ReviewEngineHandlers
}) {
  const { setDraft, updateSection } = handlers
  const groupOrder = ["header", "main", "body", "planned", ...Object.keys(groups)]
  const seen = new Set<string>()
  const orderedGroups = groupOrder.filter((g) => {
    if (!groups[g]?.length || seen.has(g)) return false
    seen.add(g)
    return true
  })
  for (const g of Object.keys(groups)) {
    if (!seen.has(g)) orderedGroups.push(g)
  }

  const renderScalar = (field: ReviewFieldMeta) => {
    if (field.field_type === "section_list" || field.field_type === "trade_list") return null
    const value =
      field.key === "title"
        ? draft.title
        : field.key === "journal_date"
          ? draft.journal_date
          : field.key === "market"
            ? draft.market
            : ""

    if (field.group === "planned") {
      return (
        <div key={field.key} className="space-y-1.5 opacity-60">
          <Label className="text-[11px] tracking-wide text-muted-foreground">{field.label}</Label>
          <Input
            disabled
            placeholder={field.description || "Coming soon"}
            className="h-10 rounded-xl border-white/10 bg-black/20"
          />
        </div>
      )
    }

    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="text-[11px] tracking-wide text-muted-foreground">{field.label}</Label>
        <Input
          type={field.field_type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => {
            const v = e.target.value
            setDraft((d) => {
              if (!d) return d
              if (field.key === "title") return { ...d, title: v }
              if (field.key === "journal_date") return { ...d, journal_date: v }
              if (field.key === "market") return { ...d, market: v }
              return d
            })
          }}
          className="h-10 rounded-xl border-white/10 bg-black/20"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {orderedGroups.map((group) => {
        const groupFields = groups[group] ?? []
        const scalars = groupFields.filter(
          (f) => f.field_type !== "section_list" && f.field_type !== "trade_list",
        )
        const sections = groupFields.some((f) => f.field_type === "section_list")
        return (
          <div key={group} className="space-y-3.5">
            {group !== "header" && group !== "main" ? (
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight capitalize">
                {group.replace(/_/g, " ")}
              </h3>
            ) : null}
            {scalars.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">{scalars.map(renderScalar)}</div>
            ) : null}
            {sections ? (
              <div className="space-y-3">
                {draft.sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No content sections yet.</p>
                ) : (
                  draft.sections.map((section) => (
                    <article
                      key={section.id}
                      className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"
                    >
                      <Input
                        value={section.heading}
                        onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                        className="mb-3 h-9 max-w-md rounded-xl border-white/10 bg-transparent font-medium"
                      />
                      <textarea
                        value={section.body}
                        onChange={(e) => updateSection(section.id, { body: e.target.value })}
                        rows={5}
                        className={cn(
                          "w-full resize-y rounded-xl border border-white/[0.08] bg-card/30 px-3.5 py-3 text-sm leading-relaxed outline-none",
                          "focus:border-white/20 focus:ring-2 focus:ring-white/10",
                        )}
                      />
                    </article>
                  ))
                )}
              </div>
            ) : null}
          </div>
        )
      })}
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No review fields for this parser yet. Title and date are editable above when available.
        </p>
      ) : null}
    </div>
  )
}
