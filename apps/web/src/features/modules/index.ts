export type { ModuleId, ModuleManifest } from "@/features/modules/types"
export {
  MODULE_MANIFESTS,
  IMPORT_MODULE_OPTIONS,
  resolveModule,
  resolveModuleId,
  moduleLabel,
  parserDisplayLabel,
} from "@/features/modules/registry"
export {
  ModuleThemeProvider,
  useModuleManifest,
  useModuleId,
  moduleCssVars,
} from "@/features/modules/ModuleThemeProvider"
export { ModuleHomeShell } from "@/features/modules/ModuleHomeShell"
export { resolveModuleIcon } from "@/features/modules/moduleIcons"
