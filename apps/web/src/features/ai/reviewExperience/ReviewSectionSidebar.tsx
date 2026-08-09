import type { ComponentType } from "react"

import type { ReviewSectionItem } from "@/features/ai/reviewExperience/types"

export function ReviewSectionSidebar({
  moduleName,
  moduleIcon: ModuleIcon,
  sections,
  activeSectionId,
  onSelectSection,
}: {
  moduleName: string
  moduleIcon: ComponentType<{ className?: string; strokeWidth?: number }>
  sections: ReviewSectionItem[]
  activeSectionId: string
  onSelectSection?: (id: string) => void
}) {
  return (
    <aside className="re-left re-card p-3">
      <div className="mb-3 flex items-center gap-2.5 px-2 pt-1">
        <div
          className="flex size-8 items-center justify-center rounded-lg"
          style={{ background: "var(--re-accent-soft)", color: "var(--re-accent)" }}
        >
          <ModuleIcon className="size-4" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[color:var(--re-fg)]">{moduleName}</p>
          <p className="re-caption text-[12px]">AI sections</p>
        </div>
      </div>

      <nav className="space-y-1" aria-label="Extracted sections">
        {sections.map((section) => {
          const Icon = section.icon
          const active = section.id === activeSectionId
          return (
            <button
              key={section.id}
              type="button"
              className="re-nav-item"
              data-active={active}
              onClick={() => onSelectSection?.(section.id)}
            >
              <span className="re-nav-icon">
                <Icon className="size-3.5" strokeWidth={1.75} />
              </span>
              {section.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
