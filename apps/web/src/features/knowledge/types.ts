export type NoteSource = "native" | "obsidian"
export type NoteArea =
  | "dashboard"
  | "life"
  | "wealth"
  | "trading"
  | "career"
  | "ai"
  | "health"
  | "books"
  | "journal"
  | "resources"
  | "archive"
  | "project"
  | "other"

export type NoteKind =
  | "note"
  | "daily_journal"
  | "trading_journal"
  | "weekly_review"
  | "monthly_review"
  | "book"
  | "template"
  | "rules"
  | "dashboard"

export type NoteSummary = {
  id: string
  title: string
  source: NoteSource
  area: NoteArea
  kind: NoteKind
  vault_path: string | null
  folder_path: string | null
  journal_date: string | null
  word_count: number
  is_empty: boolean
  updated_at: string
}

export type KnowledgeNote = NoteSummary & {
  body: string
  tags: string[]
  wikilinks: string[]
  created_at: string
}

export type KnowledgeDashboard = {
  total_notes: number
  from_obsidian: number
  empty_notes: number
  by_area: Array<{ area: string; count: number }>
  recent: NoteSummary[]
}

export type ImportFilePreview = {
  vault_path: string
  folder_path: string
  title: string
  area: NoteArea
  kind: NoteKind
  journal_date: string | null
  word_count: number
  is_empty: boolean
  action: string
}

export type ImportFolderGroup = {
  folder_path: string
  area: NoteArea
  count: number
  empty: number
  create: number
  update: number
  skip: number
  files: ImportFilePreview[]
}

export type ObsidianImportReport = {
  vault_path: string
  dry_run: boolean
  scanned: number
  created: number
  updated: number
  skipped: number
  empty: number
  by_area: Array<{ area: string; count: number }>
  by_folder: ImportFolderGroup[]
  files: ImportFilePreview[]
  samples: ImportFilePreview[]
  run_id: string | null
}

export type PromoteItem = {
  note_id: string
  title: string
  vault_path: string | null
  area: NoteArea
  kind: NoteKind
  target_module: string
  target_entity_type: string
  target_entity_id: string | null
  action: string
  detail: string
}

export type PromoteReport = {
  dry_run: boolean
  modules: string[]
  eligible: number
  created: number
  updated: number
  skipped: number
  unsupported: number
  items: PromoteItem[]
}
