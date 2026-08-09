import { memo, useCallback, useId, useRef } from "react"
import type { KeyboardEvent } from "react"

import type { TradingTabItem } from "@/features/trading/v2/types"
import { cn } from "@/shared/lib/utils"

export const TradingTabs = memo(function TradingTabs({
  items,
  activeId,
  onChange,
  className,
  label = "Sections",
}: {
  items: TradingTabItem[]
  activeId: string
  onChange?: (id: string) => void
  className?: string
  label?: string
  size?: "sm" | "md"
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const focusTab = useCallback((id: string) => {
    const root = listRef.current
    if (!root) return
    const el = root.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)
    el?.focus()
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!items.length || !onChange) return
    const idx = items.findIndex((t) => t.id === activeId)
    if (idx < 0) return
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      const next = items[(idx + 1) % items.length]!
      onChange(next.id)
      focusTab(next.id)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      const next = items[(idx - 1 + items.length) % items.length]!
      onChange(next.id)
      focusTab(next.id)
    } else if (e.key === "Home") {
      e.preventDefault()
      onChange(items[0]!.id)
      focusTab(items[0]!.id)
    } else if (e.key === "End") {
      e.preventDefault()
      const last = items[items.length - 1]!
      onChange(last.id)
      focusTab(last.id)
    }
  }

  return (
    <div
      ref={listRef}
      className={cn("flex gap-1 overflow-x-auto", className)}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {items.map((tab) => {
        const selected = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="tv2-tab shrink-0"
            data-active={selected}
            onClick={() => onChange?.(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
})

export const TradingFilterTabs = memo(function TradingFilterTabs({
  items,
  activeId,
  onChange,
}: {
  items: TradingTabItem[]
  activeId: string
  onChange?: (id: string) => void
}) {
  const labelId = useId()
  return (
    <div role="group" aria-labelledby={labelId}>
      <span id={labelId} className="sr-only">
        Journal filters
      </span>
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const selected = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              className="tv2-filter shrink-0"
              data-active={selected}
              aria-pressed={selected}
              onClick={() => onChange?.(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
})
