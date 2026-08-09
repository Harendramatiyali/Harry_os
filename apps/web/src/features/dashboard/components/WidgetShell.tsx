import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

type WidgetShellProps = {
  title: string
  subtitle?: string
  href?: string
  actionLabel?: string
  className?: string
  children: ReactNode
  headerRight?: ReactNode
}

/** Apple-like widget surface for dashboard modules. */
export function WidgetShell({
  title,
  subtitle,
  href,
  actionLabel = "Open",
  className,
  children,
  headerRight,
}: WidgetShellProps) {
  return (
    <section
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-card/70 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl md:p-5",
        "transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.65)]",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-foreground/90">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerRight}
          {href ? (
            <Link
              to={href}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
