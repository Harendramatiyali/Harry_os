/**
 * Import destinations — thin view over the Module Design System registry.
 * Prefer importing from `@/features/modules` for new code.
 */

import {
  IMPORT_MODULE_OPTIONS,
  moduleLabel,
  parserDisplayLabel,
  resolveModule,
  type ModuleId,
} from "@/features/modules"

export type ImportDestinationId = Exclude<ModuleId, "neutral">

export type ImportDestination = {
  id: ImportDestinationId
  label: string
  hint: string
  parserType: string
  ready: boolean
}

export const IMPORT_DESTINATIONS: ImportDestination[] = IMPORT_MODULE_OPTIONS.map((m) => ({
  id: m.id as ImportDestinationId,
  label: m.name,
  hint: m.tagline,
  parserType: m.parserType,
  ready: m.ready,
}))

export const CLASSIFY_LATER: ImportDestination = {
  id: "inbox",
  label: "Classify Later",
  hint: "Queue in Knowledge Inbox",
  parserType: "general",
  ready: true,
}

export const LOW_CONFIDENCE_THRESHOLD = 0.55

export function destinationLabel(id: string | null | undefined): string {
  if (!id) return "Unknown"
  if (id === "inbox") return CLASSIFY_LATER.label
  return moduleLabel(id)
}

export function parserLabel(parserType: string | null | undefined): string {
  return parserDisplayLabel(parserType)
}

export function destinationManifest(id: string | null | undefined) {
  return resolveModule(id)
}
