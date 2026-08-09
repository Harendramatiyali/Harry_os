import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Sparkles } from "lucide-react"

import { ModuleThemeProvider, resolveModule, useModuleManifest } from "@/features/modules"
import { Button } from "@/shared/ui/button"

/** Thin themed chrome for module home routes (Phase 4). */
export function ModuleHomeShell({
  moduleId,
  children,
  actions,
}: {
  moduleId: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <ModuleThemeProvider moduleId={moduleId} className="space-y-6">
      <ModuleHomeHeader actions={actions} />
      {children}
    </ModuleThemeProvider>
  )
}

function ModuleHomeHeader({ actions }: { actions?: ReactNode }) {
  const manifest = useModuleManifest()
  return (
    <header className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div
        aria-hidden
        className="module-glow pointer-events-none absolute -inset-x-4 -top-6 h-32 rounded-[1.5rem]"
      />
      <div className="relative space-y-1.5">
        <p
          className="text-[11px] font-medium tracking-[0.16em] uppercase"
          style={{ color: "var(--module-muted)" }}
        >
          {manifest.shortName}
        </p>
        <h1 className="module-display text-3xl font-semibold tracking-tight">{manifest.name}</h1>
        <p className="text-sm" style={{ color: "var(--module-muted)" }}>
          {manifest.tagline}
        </p>
      </div>
      <div className="relative flex flex-wrap gap-2">
        {manifest.surfaces.dashboardWidgets.includes("open-import") ? (
          <Button type="button" size="sm" variant="outline" asChild className="gap-1.5 rounded-xl">
            <Link to="/ai/imports">
              <Sparkles className="size-3.5" />
              Import
            </Link>
          </Button>
        ) : null}
        {actions}
      </div>
    </header>
  )
}

export function moduleHomeTitle(moduleId: string) {
  return resolveModule(moduleId).name
}
