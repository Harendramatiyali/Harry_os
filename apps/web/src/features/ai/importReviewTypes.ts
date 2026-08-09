/** Types for AI Import Review Screen. */

export type ReviewConfidence = {
  overall: number
  journal_date: number
  fields: Record<string, number>
  notes: string
}

export type ReviewDaySection = {
  id: string
  section_key: string
  heading: string
  body: string
  confidence: number
}

export type ReviewTradeSection = {
  id: string
  section_key: string
  heading: string
  body: string
  confidence: number
}

export type ReviewTrade = {
  id: string
  trade_index: number
  instrument: string
  direction: "long" | "short" | ""
  quantity: string
  entry_price: string
  exit_price: string
  result: string
  pnl: string
  grade: string
  confidence: number
  sections: ReviewTradeSection[]
  /** Preserved for commit round-trip */
  attachment_page_ids?: string[]
}

export type ReviewPageImage = {
  id: string
  page_index: number
  file_name: string
  /** Data URL, static asset, or authenticated file URL */
  src: string
}

export type ImportReviewDraft = {
  job_id: string
  title: string
  journal_date: string
  market: string
  primary_instrument: string
  day_bias: string
  day_result: string
  overall_grade: string
  confidence: ReviewConfidence
  images: ReviewPageImage[]
  sections: ReviewDaySection[]
  trades: ReviewTrade[]
  /** Preserved for commit round-trip */
  day_attachment_page_ids?: string[]
  tags?: string[]
  uncategorized_markdown?: string | null
  day_pnl?: string | null
}
