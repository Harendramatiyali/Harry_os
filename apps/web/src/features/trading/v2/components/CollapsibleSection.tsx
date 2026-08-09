import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={cn("tv2-collapse", className, open && "is-open")}>
      <button
        type="button"
        className="tv2-collapse__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="tv2-collapse__main">
          <div className="tv2-collapse__title-row">
            <h3 className="tv2-collapse__title">{title}</h3>
            {badge}
          </div>
          {subtitle ? <div className="tv2-collapse__sub">{subtitle}</div> : null}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn("tv2-collapse__chev", open && "is-open")}
          aria-hidden
        />
      </button>
      {open ? <div className={cn("tv2-collapse__body", bodyClassName)}>{children}</div> : null}
    </section>
  )
}
