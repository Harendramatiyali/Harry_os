import type { ReactNode } from "react"

export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="tv2-h3">{title}</h3>
      {action}
    </div>
  )
}
