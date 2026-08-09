import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react"

import { resolveModule } from "@/features/modules/registry"
import type { ModuleId, ModuleManifest } from "@/features/modules/types"
import { cn } from "@/shared/lib/utils"

type ModuleThemeContextValue = {
  moduleId: ModuleId
  manifest: ModuleManifest
}

const ModuleThemeContext = createContext<ModuleThemeContextValue>({
  moduleId: "neutral",
  manifest: resolveModule("neutral"),
})

export function moduleCssVars(manifest: ModuleManifest): CSSProperties {
  const t = manifest.theme.tokens
  return {
    ["--module-bg" as string]: t.bg,
    ["--module-fg" as string]: t.fg,
    ["--module-muted" as string]: t.muted,
    ["--module-card" as string]: t.card,
    ["--module-border" as string]: t.border,
    ["--module-accent" as string]: t.accent,
    ["--module-accent-soft" as string]: t.accentSoft,
    ["--module-positive" as string]: t.positive,
    ["--module-negative" as string]: t.negative,
    ["--module-warning" as string]: t.warning,
    ["--module-paper" as string]: t.paper,
    ["--module-glow" as string]: t.glow,
    ["--module-progress" as string]: t.progress,
    ["--module-radius" as string]: t.radius,
    ...(manifest.theme.fontDisplay
      ? { ["--module-font-display" as string]: manifest.theme.fontDisplay }
      : {}),
    ...(manifest.theme.fontMono
      ? { ["--module-font-mono" as string]: manifest.theme.fontMono }
      : {}),
  }
}

export function ModuleThemeProvider({
  moduleId,
  className,
  children,
}: {
  moduleId?: string | null
  className?: string
  children: ReactNode
}) {
  const value = useMemo(() => {
    const manifest = resolveModule(moduleId)
    return { moduleId: manifest.id, manifest }
  }, [moduleId])

  return (
    <ModuleThemeContext.Provider value={value}>
      <div
        data-module={value.moduleId}
        data-mood={value.manifest.identity.mood}
        className={cn("module-surface", className)}
        style={moduleCssVars(value.manifest)}
      >
        {children}
      </div>
    </ModuleThemeContext.Provider>
  )
}

export function useModuleManifest(): ModuleManifest {
  return useContext(ModuleThemeContext).manifest
}

export function useModuleId(): ModuleId {
  return useContext(ModuleThemeContext).moduleId
}
