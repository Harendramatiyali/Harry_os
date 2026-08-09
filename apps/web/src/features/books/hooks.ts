import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { booksApi } from "@/features/books/api"
import type { NoteKind } from "@/features/books/types"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function useBooksDashboard() {
  const token = useToken()
  return useQuery({
    queryKey: ["books", "dashboard"],
    queryFn: () => booksApi.dashboard(token!),
    enabled: Boolean(token),
  })
}

export function useBooksStats() {
  const token = useToken()
  return useQuery({
    queryKey: ["books", "stats"],
    queryFn: () => booksApi.stats(token!),
    enabled: Boolean(token),
  })
}

export function useBooks(params?: { status?: string; q?: string }) {
  const token = useToken()
  return useQuery({
    queryKey: ["books", "list", params],
    queryFn: () => booksApi.list(token!, params),
    enabled: Boolean(token),
  })
}

export function useBookDetail(bookId: string | null) {
  const token = useToken()
  const highlights = useQuery({
    queryKey: ["books", bookId, "highlights"],
    queryFn: () => booksApi.listHighlights(bookId!, token!),
    enabled: Boolean(token && bookId),
  })
  const quotes = useQuery({
    queryKey: ["books", bookId, "quotes"],
    queryFn: () => booksApi.listQuotes(bookId!, token!),
    enabled: Boolean(token && bookId),
  })
  const notes = useQuery({
    queryKey: ["books", bookId, "notes"],
    queryFn: () => booksApi.listNotes(bookId!, token!),
    enabled: Boolean(token && bookId),
  })
  const vocab = useQuery({
    queryKey: ["books", "vocab", bookId],
    queryFn: () => booksApi.listVocab(token!, bookId ?? undefined),
    enabled: Boolean(token),
  })
  return { highlights, quotes, notes, vocab }
}

export function useBooksMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["books"] })
  }

  return {
    createBook: useMutation({
      mutationFn: (body: Record<string, unknown>) => booksApi.create(body, token),
      onSuccess: invalidate,
    }),
    updateBook: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        booksApi.update(id, body, token),
      onSuccess: invalidate,
    }),
    deleteBook: useMutation({
      mutationFn: (id: string) => booksApi.remove(id, token),
      onSuccess: invalidate,
    }),
    createHighlight: useMutation({
      mutationFn: ({ bookId, body }: { bookId: string; body: Record<string, unknown> }) =>
        booksApi.createHighlight(bookId, body, token),
      onSuccess: invalidate,
    }),
    deleteHighlight: useMutation({
      mutationFn: (id: string) => booksApi.deleteHighlight(id, token),
      onSuccess: invalidate,
    }),
    createQuote: useMutation({
      mutationFn: ({ bookId, body }: { bookId: string; body: Record<string, unknown> }) =>
        booksApi.createQuote(bookId, body, token),
      onSuccess: invalidate,
    }),
    updateQuote: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        booksApi.updateQuote(id, body, token),
      onSuccess: invalidate,
    }),
    deleteQuote: useMutation({
      mutationFn: (id: string) => booksApi.deleteQuote(id, token),
      onSuccess: invalidate,
    }),
    createNote: useMutation({
      mutationFn: ({
        bookId,
        body,
      }: {
        bookId: string
        body: { kind?: NoteKind; title?: string; body: string }
      }) => booksApi.createNote(bookId, body, token),
      onSuccess: invalidate,
    }),
    deleteNote: useMutation({
      mutationFn: (id: string) => booksApi.deleteNote(id, token),
      onSuccess: invalidate,
    }),
    createVocab: useMutation({
      mutationFn: (body: Record<string, unknown>) => booksApi.createVocab(body, token),
      onSuccess: invalidate,
    }),
    deleteVocab: useMutation({
      mutationFn: (id: string) => booksApi.deleteVocab(id, token),
      onSuccess: invalidate,
    }),
  }
}
