import { memo } from "react"
import type { ReactNode } from "react"
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  NotebookPen,
  Pencil,
  Save,
  Settings,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react"

import { TradingSearchBar } from "@/features/trading/v2/components/TradingSearchBar"
import { TradingTabs } from "@/features/trading/v2/components/TradingTabs"
import type { TradingTabItem } from "@/features/trading/v2/types"

export function TradingModuleHeader({
  title = "Trading",
  tagline = "Plan. Execute. Review. Improve.",
  searchPlaceholder = "Search in Trading…",
  onQuickNote,
}: {
  title?: string
  tagline?: string
  searchPlaceholder?: string
  onQuickNote?: () => void
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[color:var(--tv2-border)] px-4 py-4 md:gap-4 md:px-5">
      <div className="min-w-0 flex-1 basis-[12rem]">
        <h1 className="tv2-title" id="tv2-module-title">
          {title}
        </h1>
        <p className="tv2-caption mt-1">{tagline}</p>
      </div>
      <TradingSearchBar
        className="min-w-[min(100%,220px)] max-w-md flex-1 basis-[14rem]"
        placeholder={searchPlaceholder}
        shortcut="⌘K"
        readOnly
        aria-label={searchPlaceholder}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="tv2-btn tv2-btn-sm"
          onClick={onQuickNote}
          aria-label="Quick note"
        >
          <NotebookPen className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Quick Note</span>
        </button>
        <button type="button" className="tv2-btn tv2-btn-sm tv2-btn-ghost" aria-label="Notifications">
          <Bell className="size-4" aria-hidden />
        </button>
        <button type="button" className="tv2-btn tv2-btn-sm tv2-btn-ghost" aria-label="Collections">
          <LayoutGrid className="size-4" aria-hidden />
        </button>
        <button type="button" className="tv2-btn tv2-btn-sm tv2-btn-ghost" aria-label="Settings">
          <Settings className="size-4" aria-hidden />
        </button>
        <div
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: "var(--tv2-accent-soft)", color: "var(--tv2-accent)" }}
          aria-hidden
        >
          H
        </div>
      </div>
    </header>
  )
}

export function WorkspaceToolbar({
  dateLabel,
  sourceBadge,
  favorite,
  canGoPrev,
  canGoNext,
  onPrevDay,
  onNextDay,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onShare,
  onDelete,
  deleting,
}: {
  dateLabel: string
  sourceBadge?: string
  favorite?: boolean
  canGoPrev?: boolean
  canGoNext?: boolean
  onPrevDay?: () => void
  onNextDay?: () => void
  editing?: boolean
  onEdit?: () => void
  onSave?: () => void
  onCancel?: () => void
  saving?: boolean
  onShare?: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-ghost disabled:opacity-35"
          aria-label="Previous trading day"
          disabled={!canGoPrev || editing}
          onClick={onPrevDay}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="tv2-caption min-w-[6.5rem] text-center font-medium text-[color:var(--tv2-fg)]">
          {dateLabel}
        </span>
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-ghost disabled:opacity-35"
          aria-label="Next trading day"
          disabled={!canGoNext || editing}
          onClick={onNextDay}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        {sourceBadge ? <span className="tv2-badge tv2-badge-ai">{sourceBadge}</span> : null}
        {favorite ? (
          <Star
            className="size-3.5"
            aria-label="Favorited"
            style={{ color: "var(--tv2-amber)", fill: "var(--tv2-amber)" }}
          />
        ) : null}
        {editing ? <span className="tv2-badge tv2-badge-amber">Editing</span> : null}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              className="tv2-btn tv2-btn-sm"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="size-3.5" aria-hidden />
              Cancel
            </button>
            <button
              type="button"
              className="tv2-btn tv2-btn-sm tv2-btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              <Save className="size-3.5" aria-hidden />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="tv2-btn tv2-btn-sm" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </button>
            {onDelete ? (
              <button
                type="button"
                className="tv2-btn tv2-btn-sm"
                style={{ color: "#f87171", borderColor: "rgba(248, 113, 113, 0.35)" }}
                disabled={deleting}
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            ) : onShare ? (
              <button type="button" className="tv2-btn tv2-btn-sm" onClick={onShare}>
                <Share2 className="size-3.5" aria-hidden />
                Share
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function TradingV2Shell({
  header,
  secondaryTabs,
  activeSecondaryTab,
  onSecondaryTabChange,
  stats,
  left,
  center,
  right,
  wide = false,
}: {
  header: ReactNode
  secondaryTabs: TradingTabItem[]
  activeSecondaryTab: string
  onSecondaryTabChange?: (id: string) => void
  stats: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
  /** Full-width center (Weekly Review) — hide side columns */
  wide?: boolean
}) {
  return (
    <div className="trading-v2" aria-labelledby="tv2-module-title" data-wide={wide || undefined}>
      <a href="#tv2-main" className="tv2-skip">
        Skip to journal workspace
      </a>
      {header}
      <div className="tv2-nav-scroll border-b border-[color:var(--tv2-border)] px-4 py-2.5 md:px-5">
        <TradingTabs
          items={secondaryTabs}
          activeId={activeSecondaryTab}
          onChange={onSecondaryTabChange}
          label="Trading module sections"
        />
      </div>
      {!wide ? (
        <section className="tv2-stats tv2-stagger" aria-label="Trading statistics">
          {stats}
        </section>
      ) : null}
      <div className={wide ? "tv2-layout tv2-layout--wide" : "tv2-layout"}>
        {!wide ? (
          <aside className="tv2-left tv2-anim-in" aria-label="Journal list">
            {left}
          </aside>
        ) : null}
        <main id="tv2-main" className="tv2-anim-in" style={{ animationDelay: "60ms" }} tabIndex={-1}>
          {center}
        </main>
        {!wide ? (
          <aside
            className="tv2-right space-y-3 tv2-anim-in"
            style={{ animationDelay: "100ms" }}
            aria-label="Trade insights"
          >
            {right}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export const MemoTradingV2Shell = memo(TradingV2Shell)
