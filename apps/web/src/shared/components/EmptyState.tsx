import type { ReactNode } from "react"

import { cn } from "@/shared/lib/utils"

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Placeholder empty surface for modules not yet implemented. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <h2 className="text-base font-medium">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
