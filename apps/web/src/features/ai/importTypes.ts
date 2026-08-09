/** API types for AI Import Center (`/ai/imports`). */

export type ImportJobStatus =
  | "queued"
  | "preprocessing"
  | "ocr"
  | "structuring"
  | "validation"
  | "awaiting_review"
  | "committing"
  | "committed"
  | "failed"
  | "cancelled"

export type ImportPageOut = {
  id: string
  job_id: string
  page_index: number
  original_file_name: string | null
  mime_type: string | null
  byte_size: number | null
  checksum: string | null
  status: string
  quality_score: number | null
  ocr_confidence: number | null
  has_ocr_transcript: boolean
  created_at: string
  updated_at: string
}

export type ImportJobOut = {
  id: string
  title: string | null
  notebook_label: string | null
  status: ImportJobStatus | string
  review_status: string
  current_stage: string | null
  page_count: number
  overall_confidence: number | null
  draft_version: number
  detected_journal_date: string | null
  committed_journal_day_id: string | null
  parser_type?: string
  classification_confidence?: number | null
  destination_module?: string
  destination_confirmed?: boolean
  review_schema_version?: string | null
  model_id: string | null
  prompt_version: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type ReviewFieldOut = {
  key: string
  label: string
  field_type: string
  required?: boolean
  group?: string
  description?: string | null
  options?: string[]
}

export type ClassificationOut = {
  parser_type: string
  confidence: number
  destination: string
  reasons?: string[]
}

export type JournalDraftSection = {
  section_key: string
  heading_original: string | null
  body_markdown: string
  sort_order: number
  confidence: number | null
}

export type JournalDraftTradeSection = {
  section_key: string
  heading_original: string | null
  body_markdown: string
  sort_order: number
  confidence: number | null
}

export type JournalDraftTrade = {
  trade_index: number
  title_suffix: string | null
  instrument: string | null
  direction: string | null
  quantity: string | number | null
  entry_price: string | number | null
  exit_price: string | number | null
  stop_price: string | number | null
  result: string | null
  pnl: string | number | null
  setup: string | null
  grade: string | null
  dqs_score: number | null
  dqs_max: number | null
  raw_markdown: string
  sections: JournalDraftTradeSection[]
  attachment_page_ids: string[]
  confidence: number | null
}

export type JournalDraft = {
  journal_date: string
  title: string | null
  market: string | null
  primary_instrument: string | null
  day_bias: string | null
  day_result: string | null
  day_pnl: string | number | null
  daily_rating: string | number | null
  overall_grade: string | null
  tags: string[]
  uncategorized_markdown: string | null
  sections: JournalDraftSection[]
  trades: JournalDraftTrade[]
  day_attachment_page_ids: string[]
}

export type ConfidenceMap = {
  overall: number | null
  journal_date: number | null
  fields: Record<string, number>
  notes: string | null
}

export type ImportJobStatusOut = ImportJobOut & {
  has_draft: boolean
  confidence: ConfidenceMap | null
  pages: ImportPageOut[]
  draft: JournalDraft | null
  review_fields?: ReviewFieldOut[]
}

export type ImportPreviewOut = {
  job: ImportJobOut
  draft: JournalDraft
  confidence: ConfidenceMap
  draft_version: number
  warnings: string[]
  parser_type?: string
  classification?: ClassificationOut | null
  review_fields?: ReviewFieldOut[]
}

export type ImportCommitOut = {
  job_id: string
  journal_day_id: string | null
  journal_date: string | null
  status: string
  review_status: string
  trade_count: number
  section_count: number
  attachment_count: number
  destination?: string
  inbox_item_id?: string | null
  message?: string | null
}

export type ImportJobCreate = {
  title?: string | null
  notebook_label?: string | null
  detected_journal_date?: string | null
}

export type ImportPreviewRequest = {
  journal_date?: string | null
  title?: string | null
  parser_type?: string | null
}

export type ImportCommitRequest = {
  draft?: JournalDraft | null
  approve?: boolean
  save_to_inbox?: boolean
  destination_module?: string | null
}

export type ConfirmDestinationRequest = {
  destination_module: string
  parser_type?: string | null
  classify_later?: boolean
}

export type ConfirmDestinationOut = {
  job: ImportJobOut
  preview?: ImportPreviewOut | null
  inbox_item_id?: string | null
  message: string
}

export type KnowledgeInboxItem = {
  id: string
  job_id: string | null
  parser_type: string
  suggested_destination: string | null
  chosen_destination: string | null
  title: string | null
  status: string
  classification_confidence: number | null
  routed_journal_day_id: string | null
  ocr_summary?: string | null
  created_at: string
  updated_at: string
}

export type KnowledgeInboxDetail = KnowledgeInboxItem & {
  draft_json?: string | null
}

export type AssignDestinationRequest = {
  destination_module: string
  parser_type?: string | null
  notes?: string | null
}

export type AssignDestinationOut = {
  inbox_item: KnowledgeInboxItem
  correction_recorded: boolean
  journal_day_id: string | null
  message: string
}
