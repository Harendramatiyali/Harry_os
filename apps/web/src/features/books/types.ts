export type BookStatus = "wanted" | "reading" | "finished" | "abandoned"
export type NoteKind = "note" | "summary" | "insight" | "action"

export type Book = {
  id: string
  title: string
  author: string | null
  isbn: string | null
  status: BookStatus
  rating: number | null
  page_count: number | null
  pages_read: number
  progress_pct: number
  started_on: string | null
  finished_on: string | null
  summary: string | null
  tags: string[]
  highlights_count: number
  quotes_count: number
  notes_count: number
  vocab_count: number
  created_at: string
  updated_at: string
}

export type Highlight = {
  id: string
  book_id: string
  text: string
  location_ref: string | null
  note: string | null
  color: string | null
  created_at: string
}

export type Quote = {
  id: string
  book_id: string
  text: string
  location_ref: string | null
  is_favorite: boolean
  created_at: string
}

export type ReadingNote = {
  id: string
  book_id: string
  kind: NoteKind
  title: string | null
  body: string
  location_ref: string | null
  created_at: string
}

export type VocabItem = {
  id: string
  book_id: string | null
  word: string
  meaning: string
  example: string | null
  mastery: number
  created_at: string
}

export type BooksDashboard = {
  total_books: number
  reading: number
  finished: number
  wanted: number
  abandoned: number
  pages_read_total: number
  highlights_total: number
  quotes_total: number
  notes_total: number
  vocab_total: number
  avg_rating: number | null
  currently_reading: Book[]
  recent_highlights: Highlight[]
  favorite_quotes: Quote[]
}

export type BooksStats = {
  finished_this_year: number
  finished_this_month: number
  pages_read_this_year: number
  avg_progress_reading: number
  top_authors: Array<{ author: string; count: number }>
}
