import { useState } from "react"
import { Check, Pencil, RefreshCw } from "lucide-react"

import type { ReviewSectionCardModel } from "@/features/ai/reviewExperience/types"
import { cn } from "@/shared/lib/utils"

export function ReviewSectionCard({
  model,
  editing: editingControlled,
  onEditingChange,
  summaryValue,
  onSummaryChange,
  onEdit,
  onRegenerate,
  onAccept,
  regenerating = false,
}: {
  model: ReviewSectionCardModel
  /** Controlled editing state (optional — defaults to internal state) */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  summaryValue?: string
  onSummaryChange?: (value: string) => void
  onEdit?: () => void
  onRegenerate?: () => void
  onAccept?: () => void
  regenerating?: boolean
}) {
  const [editingInternal, setEditingInternal] = useState(false)
  const editing = editingControlled ?? editingInternal
  const setEditing = (next: boolean) => {
    onEditingChange?.(next)
    if (editingControlled === undefined) setEditingInternal(next)
  }

  const summary = summaryValue ?? model.summary
  const Icon = model.icon
  const pct = Math.round(model.confidence * 100)

  function handleEdit() {
    setEditing(true)
    onEdit?.()
  }

  function handleDone() {
    setEditing(false)
  }

  return (
    <article
      className={cn(
        "re-card space-y-4 p-5 md:p-6",
        model.accepted && "opacity-85",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ background: "var(--re-accent-soft)", color: "var(--re-accent)" }}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="re-section-title">{model.title}</h2>
            <p className="re-caption mt-0.5">AI Generated Summary</p>
          </div>
        </div>
        <span className={cn("re-badge", pct >= 90 ? "re-badge-accent" : undefined)}>
          {pct}%
        </span>
      </div>

      {editing ? (
        <div className="space-y-3 animate-[re-expand_200ms_ease]">
          <textarea
            value={summary}
            onChange={(e) => onSummaryChange?.(e.target.value)}
            rows={6}
            className="re-body w-full resize-y rounded-[12px] border border-[color:var(--re-border)] bg-[color:var(--re-elevated)] px-3.5 py-3 text-[color:var(--re-fg)] outline-none transition-[border-color] duration-200 focus:border-[color:var(--re-accent)]"
            aria-label={`${model.title} editor`}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="re-btn re-btn-sm" onClick={handleDone}>
              Done
            </button>
            <button
              type="button"
              className="re-btn re-btn-sm re-btn-primary"
              onClick={() => {
                onAccept?.()
                setEditing(false)
              }}
            >
              <Check className="size-3.5" strokeWidth={2} />
              Accept
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="re-body whitespace-pre-wrap text-[color:var(--re-fg)]/90">{summary}</p>
          <div className="flex flex-wrap gap-2 border-t border-[color:var(--re-border-soft)] pt-4">
            <button type="button" className="re-btn re-btn-sm" onClick={handleEdit}>
              <Pencil className="size-3.5" strokeWidth={1.75} />
              Edit
            </button>
            <button
              type="button"
              className="re-btn re-btn-sm"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              <RefreshCw
                className={cn("size-3.5", regenerating && "animate-spin")}
                strokeWidth={1.75}
              />
              Regenerate
            </button>
            <button
              type="button"
              className="re-btn re-btn-sm re-btn-primary"
              onClick={onAccept}
              disabled={model.accepted}
            >
              <Check className="size-3.5" strokeWidth={2} />
              {model.accepted ? "Accepted" : "Accept"}
            </button>
          </div>
        </>
      )}
    </article>
  )
}
