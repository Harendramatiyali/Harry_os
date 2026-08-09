import type { ReactNode } from "react"

import type { ReviewModuleId } from "@/features/ai/reviewExperience/types"
import "@/features/ai/reviewExperience/reviewExperience.css"

export function ReviewExperienceShell({
  moduleId,
  header,
  sidebar,
  center,
  notebook,
  bottomBar,
}: {
  moduleId: ReviewModuleId
  header: ReactNode
  sidebar: ReactNode
  center: ReactNode
  notebook: ReactNode
  bottomBar: ReactNode
}) {
  return (
    <div className="review-experience" data-module={moduleId}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 md:px-6">
        {header}
        <div className="re-layout">
          {sidebar}
          <main className="space-y-4">{center}</main>
          {notebook}
        </div>
        {bottomBar}
      </div>
    </div>
  )
}
