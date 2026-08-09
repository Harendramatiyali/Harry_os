import type { ReactNode } from "react"
import { Search } from "lucide-react"

import { cn } from "@/shared/lib/utils"

export function TradingSearchBar({
  placeholder = "Search…",
  shortcut,
  className,
  value,
  onChange,
  readOnly,
  trailing,
  id,
  "aria-label": ariaLabel,
}: {
  placeholder?: string
  shortcut?: string
  className?: string
  value?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  trailing?: ReactNode
  id?: string
  "aria-label"?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[color:var(--tv2-muted)]"
        aria-hidden
      />
      <input
        id={id}
        className="tv2-input"
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {shortcut && !trailing ? (
        <span
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-[color:var(--tv2-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--tv2-muted)]"
          aria-hidden
        >
          {shortcut}
        </span>
      ) : null}
      {trailing ? (
        <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>
      ) : null}
    </div>
  )
}
