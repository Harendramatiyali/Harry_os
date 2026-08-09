import { Calendar } from "lucide-react"

import type { ReviewExperienceHeaderModel } from "@/features/ai/reviewExperience/types"

export function ReviewHeader({
  model,
  onChangeDestination,
}: {
  model: ReviewExperienceHeaderModel
  onChangeDestination?: () => void
}) {
  const Icon = model.moduleIcon
  const pct = Math.round(model.confidence * 100)

  return (
    <header className="re-card flex flex-wrap items-center gap-4 px-5 py-4 md:px-6">
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-[14px]"
        style={{ background: "var(--re-accent-soft)", color: "var(--re-accent)" }}
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="re-caption uppercase tracking-[0.14em]">{model.moduleName}</p>
        <h1 className="re-title truncate">{model.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="re-caption inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {model.dateLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="re-badge re-badge-accent">
          <span className="size-1.5 rounded-full" style={{ background: "var(--re-accent)" }} />
          {pct}% confidence
        </span>
        <span className="re-badge">Destination · {model.destinationLabel}</span>
        <button type="button" className="re-btn re-btn-sm" onClick={onChangeDestination}>
          Change Destination
        </button>
      </div>
    </header>
  )
}
