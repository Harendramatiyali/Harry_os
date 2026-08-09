export type TradeDirection = "long" | "short"
export type TradeStatus = "open" | "closed" | "cancelled"
export type ReviewPeriod = "weekly" | "monthly"

export type Screenshot = {
  id: string
  file_name: string
  content_type: string
  byte_size: number
  caption: string | null
  created_at: string
}

export type Mistake = {
  id: string
  trade_id: string | null
  category: string
  description: string
  severity: number
  occurred_on: string
}

export type Trade = {
  id: string
  instrument: string
  direction: TradeDirection
  quantity: number | string
  entry_price: number | string
  exit_price: number | string | null
  opened_at: string
  closed_at: string | null
  fees: number | string
  stop_price: number | string | null
  risk_amount: number | string | null
  r_multiple: number | string | null
  pnl_gross: number | string | null
  pnl_net: number | string | null
  setup: string | null
  thesis: string | null
  status: TradeStatus
  grade: string | null
  followed_plan: boolean | null
  emotion_before: string | null
  emotion_after: string | null
  psychology_notes: string | null
  review_notes: string | null
  tags: string[]
  mistakes: Mistake[]
  screenshots: Screenshot[]
  created_at: string
  updated_at: string
}

export type PsychologyEntry = {
  id: string
  trade_id: string | null
  entry_date: string
  mood: string
  confidence: number
  stress: number
  discipline: number
  notes: string | null
  created_at: string
}

export type PeriodReview = {
  id: string
  period_type: ReviewPeriod
  period_start: string
  period_end: string
  title: string
  what_went_well: string | null
  what_to_improve: string | null
  focus_next: string | null
  grade: string | null
  trades_count: number
  win_rate: number | string | null
  net_pnl: number | string | null
  avg_r: number | string | null
  created_at: string
}

export type TradingAnalytics = {
  trades_count: number
  closed_count: number
  open_count: number
  winners: number
  losers: number
  /** Closed trades with ~₹0 P&L (cost-to-cost / scratch). */
  breakevens?: number
  win_rate: number
  avg_r: number | null
  expectancy_r: number | null
  net_pnl: number | string
  gross_pnl: number | string
  fees_total: number | string
  profit_factor: number | null
  best_trade: number | string | null
  worst_trade: number | string | null
  by_setup: Array<{ setup: string; count: number; net_pnl: number; win_rate: number }>
  by_tag: Array<{ tag: string; count: number; net_pnl: number }>
  equity_curve: Array<{ date: string; equity: number | string; pnl: number | string }>
  mistake_stats: Array<{ category: string; count: number }>
  psychology_stats: Array<{ mood: string; count: number; avg_pnl: number | string | null }>
}

export type TradeFilters = {
  q?: string
  status?: string
  instrument?: string
  setup?: string
  tag?: string
  grade?: string
  direction?: string
  date_from?: string
  date_to?: string
}

export type JournalParseStatus = "parsed" | "partial" | "needs_review"

export type JournalDayFilters = {
  q?: string
  date_from?: string
  date_to?: string
  parse_status?: JournalParseStatus | string
  favorite_only?: boolean
}

export type JournalDaySection = {
  id: string
  section_key: string
  heading_original: string | null
  body_markdown: string
  sort_order: number
}

export type JournalTradeSection = {
  id: string
  section_key: string
  heading_original: string | null
  body_markdown: string
  sort_order: number
}

export type JournalAttachment = {
  id: string
  journal_trade_id: string | null
  obsidian_ref: string
  file_name: string
  storage_path: string | null
  mime_type: string | null
  caption: string | null
  sort_order: number
  import_status: string
}

export type JournalTrade = {
  id: string
  trade_index: number
  title_suffix: string | null
  instrument: string | null
  direction: TradeDirection | null
  quantity: number | string | null
  entry_price: number | string | null
  exit_price: number | string | null
  stop_price: number | string | null
  result: string | null
  pnl: number | string | null
  setup: string | null
  grade: string | null
  dqs_score: number | null
  dqs_max: number | null
  ledger_trade_id: string | null
  raw_markdown: string
  sections: JournalTradeSection[]
  attachments: JournalAttachment[]
}

export type JournalDaySummary = {
  id: string
  journal_date: string
  title: string | null
  source: string
  parse_status: string
  publish_status?: "draft" | "published" | string
  market: string | null
  primary_instrument: string | null
  day_bias: string | null
  day_result: string | null
  day_pnl: number | string | null
  daily_rating: number | string | null
  overall_grade: string | null
  is_favorite: boolean
  tags: string[]
  vault_path: string | null
  knowledge_note_id: string | null
  trade_count: number
  section_count: number
  attachment_count: number
  created_at: string
  updated_at: string
}

export type JournalDay = JournalDaySummary & {
  content_hash: string | null
  raw_markdown: string
  uncategorized_markdown: string | null
  workspace_meta_json?: string | null
  sections: JournalDaySection[]
  trades: JournalTrade[]
  attachments: JournalAttachment[]
}

export type JournalDayCreateBody = {
  journal_date: string
  title?: string | null
  market?: string | null
  primary_instrument?: string | null
  day_bias?: string | null
  day_result?: string | null
  day_pnl?: number | null
  overall_grade?: string | null
  tags?: string[]
  publish_status?: "draft" | "published"
  workspace_meta_json?: string | null
  allow_duplicate?: boolean
}

export type JournalMigrateReport = {
  dry_run: boolean
  scanned: number
  created: number
  updated: number
  skipped: number
  needs_review: number
  items: Array<{
    note_id: string
    title: string
    vault_path: string | null
    journal_date: string | null
    action: string
    detail: string
    journal_day_id: string | null
    parse_status: string | null
    trade_count: number
    section_count: number
    attachment_count: number
    warnings: string[]
  }>
}

export type JournalMediaSyncReport = {
  scanned: number
  copied: number
  missing: number
  already_copied: number
  vault_configured: boolean
}

export type JournalCountStat = {
  key: string
  count: number
}

export type JournalSetupStat = {
  setup: string
  count: number
  wins: number
  losses: number
  unknowns: number
}

export type JournalDayRatingPoint = {
  date: string
  rating: number | string | null
  overall_grade: string | null
  trade_count: number
}

export type JournalAnalytics = {
  days_count: number
  trades_count: number
  wins: number
  losses: number
  scratches: number
  unknowns: number
  classified_win_rate: number | null
  avg_dqs: number | null
  promote_ready: number
  already_linked: number
  by_grade: JournalCountStat[]
  by_day_grade: JournalCountStat[]
  by_direction: JournalCountStat[]
  by_setup: JournalSetupStat[]
  by_instrument: JournalCountStat[]
  mistake_sections: number
  day_ratings: JournalDayRatingPoint[]
}

export type JournalPromoteItem = {
  journal_trade_id: string
  journal_date: string | null
  instrument: string | null
  action: string
  detail: string | null
  ledger_trade_id: string | null
}

export type JournalPromoteReport = {
  dry_run: boolean
  scanned: number
  created: number
  skipped: number
  failed: number
  items: JournalPromoteItem[]
}
