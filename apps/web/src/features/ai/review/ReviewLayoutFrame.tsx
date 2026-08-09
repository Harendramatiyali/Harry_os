/**
 * Layout wrappers for Review Engine — same fields, module-specific chrome.
 */
import type { ReactNode } from "react"

import { useModuleManifest } from "@/features/modules"
import { cn } from "@/shared/lib/utils"

export function ReviewLayoutFrame({
  media,
  draft,
}: {
  media: ReactNode
  draft: ReactNode
}) {
  const manifest = useModuleManifest()
  const layout = manifest.review.layout

  if (layout === "book-folio") {
    return (
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="module-paper-panel space-y-4 overflow-hidden rounded-[var(--module-radius)] p-4 xl:col-span-5 md:p-5">
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase" style={{ color: "var(--module-muted)" }}>
            {manifest.import.review.imagesHeading}
          </p>
          {media}
        </div>
        <div className="module-card space-y-6 border p-5 xl:col-span-7 md:p-7">
          <div className="module-terminal-rail">
            <p className="module-display text-lg font-semibold tracking-tight">{manifest.name}</p>
            <p className="text-sm" style={{ color: "var(--module-muted)" }}>
              {manifest.tagline}
            </p>
          </div>
          <h2
            className="text-[11px] font-medium tracking-[0.14em] uppercase"
            style={{ color: "var(--module-muted)" }}
          >
            {manifest.import.review.draftHeading}
          </h2>
          {draft}
        </div>
      </div>
    )
  }

  if (layout === "workspace-board" || layout === "ledger-split" || layout === "vitals-split") {
    return (
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="module-card space-y-4 overflow-hidden border p-5 xl:col-span-5 md:p-6">
          <h2
            className="text-[11px] font-medium tracking-[0.14em] uppercase"
            style={{ color: "var(--module-muted)" }}
          >
            {manifest.import.review.imagesHeading}
          </h2>
          {media}
        </div>
        <div className="module-card space-y-6 border p-5 xl:col-span-7 md:p-7">
          <div
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              layout === "workspace-board" && "border-[color:var(--module-border)]",
            )}
            style={{ background: "var(--module-accent-soft)", borderColor: "var(--module-border)" }}
          >
            <span className="font-medium module-accent-text">{manifest.name}</span>
            <span className="mx-2 opacity-40">·</span>
            <span style={{ color: "var(--module-muted)" }}>{manifest.tagline}</span>
          </div>
          <h2
            className="text-[11px] font-medium tracking-[0.14em] uppercase"
            style={{ color: "var(--module-muted)" }}
          >
            {manifest.import.review.draftHeading}
          </h2>
          {draft}
        </div>
      </div>
    )
  }

  // split-terminal + notes-clean default
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="module-card space-y-4 overflow-hidden border p-5 xl:col-span-5 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2
            className="text-[11px] font-medium tracking-[0.14em] uppercase"
            style={{ color: "var(--module-muted)" }}
          >
            {manifest.import.review.imagesHeading}
          </h2>
          {layout === "split-terminal" ? (
            <span className="module-mono text-[10px] tracking-wide module-accent-text uppercase">
              Live tape
            </span>
          ) : null}
        </div>
        {media}
      </div>
      <div className="module-card space-y-6 border p-5 xl:col-span-7 md:p-7">
        {layout === "split-terminal" ? (
          <div className="module-terminal-rail mb-1">
            <p className="module-display text-lg font-semibold tracking-tight">Trading draft</p>
            <p className="text-xs" style={{ color: "var(--module-muted)" }}>
              Context · observation · setups · execution
            </p>
          </div>
        ) : (
          <h2
            className="text-[11px] font-medium tracking-[0.14em] uppercase"
            style={{ color: "var(--module-muted)" }}
          >
            {manifest.import.review.draftHeading}
          </h2>
        )}
        {draft}
      </div>
    </div>
  )
}
