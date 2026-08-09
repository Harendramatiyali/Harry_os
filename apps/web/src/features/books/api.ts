import { apiRequest } from "@/shared/api/client"
import type {
  Book,
  BooksDashboard,
  BooksStats,
  Highlight,
  NoteKind,
  Quote,
  ReadingNote,
  VocabItem,
} from "@/features/books/types"

export const booksApi = {
  dashboard(token: string) {
    return apiRequest<BooksDashboard>("/books/dashboard", { accessToken: token })
  },
  stats(token: string) {
    return apiRequest<BooksStats>("/books/stats", { accessToken: token })
  },
  list(token: string, params?: { status?: string; q?: string }) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set("status", params.status)
    if (params?.q) qs.set("q", params.q)
    const s = qs.toString()
    return apiRequest<Book[]>(`/books${s ? `?${s}` : ""}`, { accessToken: token })
  },
  create(body: Record<string, unknown>, token: string) {
    return apiRequest<Book>("/books", { body, accessToken: token })
  },
  update(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Book>(`/books/${id}`, { method: "PATCH", body, accessToken: token })
  },
  remove(id: string, token: string) {
    return apiRequest<void>(`/books/${id}`, { method: "DELETE", accessToken: token })
  },
  listHighlights(bookId: string, token: string) {
    return apiRequest<Highlight[]>(`/books/${bookId}/highlights`, { accessToken: token })
  },
  createHighlight(bookId: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Highlight>(`/books/${bookId}/highlights`, { body, accessToken: token })
  },
  deleteHighlight(id: string, token: string) {
    return apiRequest<void>(`/books/highlights/${id}`, { method: "DELETE", accessToken: token })
  },
  listQuotes(bookId: string, token: string) {
    return apiRequest<Quote[]>(`/books/${bookId}/quotes`, { accessToken: token })
  },
  createQuote(bookId: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Quote>(`/books/${bookId}/quotes`, { body, accessToken: token })
  },
  updateQuote(id: string, body: Record<string, unknown>, token: string) {
    return apiRequest<Quote>(`/books/quotes/${id}`, { method: "PATCH", body, accessToken: token })
  },
  deleteQuote(id: string, token: string) {
    return apiRequest<void>(`/books/quotes/${id}`, { method: "DELETE", accessToken: token })
  },
  listNotes(bookId: string, token: string) {
    return apiRequest<ReadingNote[]>(`/books/${bookId}/notes`, { accessToken: token })
  },
  createNote(bookId: string, body: { kind?: NoteKind; title?: string; body: string }, token: string) {
    return apiRequest<ReadingNote>(`/books/${bookId}/notes`, { body, accessToken: token })
  },
  deleteNote(id: string, token: string) {
    return apiRequest<void>(`/books/notes/${id}`, { method: "DELETE", accessToken: token })
  },
  listVocab(token: string, bookId?: string) {
    const q = bookId ? `?book_id=${bookId}` : ""
    return apiRequest<VocabItem[]>(`/books/vocab${q}`, { accessToken: token })
  },
  createVocab(body: Record<string, unknown>, token: string) {
    return apiRequest<VocabItem>("/books/vocab", { body, accessToken: token })
  },
  deleteVocab(id: string, token: string) {
    return apiRequest<void>(`/books/vocab/${id}`, { method: "DELETE", accessToken: token })
  },
}
