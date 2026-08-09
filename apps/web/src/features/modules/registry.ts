import { booksManifest } from "@/features/modules/manifests/books"
import { careerManifest } from "@/features/modules/manifests/career"
import { financeManifest } from "@/features/modules/manifests/finance"
import { healthManifest } from "@/features/modules/manifests/health"
import { inboxManifest } from "@/features/modules/manifests/inbox"
import { knowledgeManifest } from "@/features/modules/manifests/knowledge"
import { neutralManifest } from "@/features/modules/manifests/neutral"
import { tradingManifest } from "@/features/modules/manifests/trading"
import type { ModuleId, ModuleManifest } from "@/features/modules/types"

export const MODULE_MANIFESTS: Record<ModuleId, ModuleManifest> = {
  neutral: neutralManifest,
  trading: tradingManifest,
  books: booksManifest,
  career: careerManifest,
  finance: financeManifest,
  health: healthManifest,
  knowledge: knowledgeManifest,
  inbox: inboxManifest,
}

/** Destinations shown on Understanding / Inbox pickers (excludes neutral). */
export const IMPORT_MODULE_OPTIONS: ModuleManifest[] = [
  tradingManifest,
  booksManifest,
  knowledgeManifest,
  careerManifest,
  financeManifest,
  healthManifest,
]

const DESTINATION_TO_MODULE: Record<string, ModuleId> = {
  trading: "trading",
  books: "books",
  finance: "finance",
  health: "health",
  planner: "career",
  career: "career",
  knowledge: "knowledge",
  inbox: "inbox",
}

const PARSER_TO_MODULE: Record<string, ModuleId> = {
  trading: "trading",
  book: "books",
  meeting: "career",
  project: "career",
  finance: "finance",
  health: "health",
  research: "knowledge",
  english: "knowledge",
  daily_journal: "knowledge",
  general: "knowledge",
}

export function resolveModuleId(
  input?: string | null,
): ModuleId {
  if (!input) return "neutral"
  const key = input.trim().toLowerCase()
  if (key in MODULE_MANIFESTS) return key as ModuleId
  if (DESTINATION_TO_MODULE[key]) return DESTINATION_TO_MODULE[key]
  if (PARSER_TO_MODULE[key]) return PARSER_TO_MODULE[key]
  return "neutral"
}

export function resolveModule(input?: string | null): ModuleManifest {
  return MODULE_MANIFESTS[resolveModuleId(input)]
}

export function moduleLabel(id: string | null | undefined): string {
  if (!id) return "Unknown"
  return resolveModule(id).name
}

export function parserDisplayLabel(parserType: string | null | undefined): string {
  if (!parserType) return "Unknown"
  const map: Record<string, string> = {
    trading: "Trading Journal",
    book: "Book Notes",
    meeting: "Meeting Notes",
    finance: "Finance Notes",
    health: "Health Notes",
    english: "English Practice",
    daily_journal: "Daily Journal",
    project: "Project Notes",
    research: "Research Notes",
    general: "General Document",
  }
  return map[parserType] ?? parserType.replace(/_/g, " ")
}
