import { useState, type FormEvent, type ReactNode } from "react"

import {
  useBookDetail,
  useBooks,
  useBooksDashboard,
  useBooksMutations,
  useBooksStats,
} from "@/features/books/hooks"
import type { Book, BookStatus, NoteKind } from "@/features/books/types"
import { ModuleHomeShell } from "@/features/modules/ModuleHomeShell"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { AITextarea } from "@/shared/components/AITextarea"

type Tab = "dashboard" | "library" | "vocab"

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full rounded-full bg-sky-300/80 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function BooksPage() {
  const [tab, setTab] = useState<Tab>("dashboard")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const dash = useBooksDashboard()
  const stats = useBooksStats()
  const books = useBooks({
    status: statusFilter || undefined,
    q: query || undefined,
  })
  const detail = useBookDetail(selectedId)
  const m = useBooksMutations()

  // New book form
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [pages, setPages] = useState("")
  const [status, setStatus] = useState<BookStatus>("wanted")

  // Detail forms
  const [pagesRead, setPagesRead] = useState("")
  const [highlightText, setHighlightText] = useState("")
  const [quoteText, setQuoteText] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [noteKind, setNoteKind] = useState<NoteKind>("note")
  const [summary, setSummary] = useState("")
  const [vocabWord, setVocabWord] = useState("")
  const [vocabMeaning, setVocabMeaning] = useState("")

  const selected = (books.data ?? []).find((b) => b.id === selectedId) ?? null

  function onAddBook(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    m.createBook.mutate(
      {
        title: title.trim(),
        author: author || null,
        page_count: pages ? Number(pages) : null,
        status,
      },
      {
        onSuccess: (book) => {
          setTitle("")
          setAuthor("")
          setPages("")
          setSelectedId(book.id)
          setTab("library")
        },
      },
    )
  }

  return (
    <ModuleHomeShell moduleId="books">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["library", "Library"],
            ["vocab", "Vocabulary"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          {dash.isLoading || !dash.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                <Stat label="Total" value={String(dash.data.total_books)} />
                <Stat label="Reading" value={String(dash.data.reading)} />
                <Stat label="Finished" value={String(dash.data.finished)} />
                <Stat label="Pages read" value={String(dash.data.pages_read_total)} />
                <Stat
                  label="Avg rating"
                  value={dash.data.avg_rating != null ? dash.data.avg_rating.toFixed(1) : "—"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Stat label="Highlights" value={String(dash.data.highlights_total)} />
                <Stat label="Quotes" value={String(dash.data.quotes_total)} />
                <Stat label="Vocabulary" value={String(dash.data.vocab_total)} />
              </div>

              {stats.data ? (
                <Panel title="Reading Statistics">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label="Finished this year" value={String(stats.data.finished_this_year)} />
                    <Stat label="Finished this month" value={String(stats.data.finished_this_month)} />
                    <Stat label="Pages this year" value={String(stats.data.pages_read_this_year)} />
                    <Stat
                      label="Avg progress"
                      value={`${stats.data.avg_progress_reading}%`}
                    />
                  </div>
                  {stats.data.top_authors.length > 0 ? (
                    <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                      {stats.data.top_authors.map((a) => (
                        <li key={a.author}>
                          {a.author} · {a.count}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Panel>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Currently Reading">
                  <BookList
                    books={dash.data.currently_reading}
                    onSelect={(id) => {
                      setSelectedId(id)
                      setTab("library")
                    }}
                  />
                </Panel>
                <Panel title="Recent Highlights">
                  {(dash.data.recent_highlights ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No highlights yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dash.data.recent_highlights.map((h) => (
                        <li key={h.id} className="rounded-2xl bg-foreground/[0.03] p-3 text-sm">
                          “{h.text}”
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <Panel title="Favorite Quotes">
                {(dash.data.favorite_quotes ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Star quotes from a book detail view.</p>
                ) : (
                  <ul className="space-y-2">
                    {dash.data.favorite_quotes.map((q) => (
                      <li key={q.id} className="rounded-2xl bg-foreground/[0.03] p-3 text-sm italic">
                        “{q.text}”
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>
      )}

      {tab === "library" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-5">
            <Panel title="Add Book">
              <form className="grid gap-2" onSubmit={onAddBook}>
                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Page count"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BookStatus)}
                  >
                    <option value="wanted">Wanted</option>
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                </div>
                <Button type="submit">Add book</Button>
              </form>
            </Panel>

            <Panel title="Library">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Search…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="reading">Reading</option>
                  <option value="wanted">Wanted</option>
                  <option value="finished">Finished</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>
              {books.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <BookList
                  books={books.data ?? []}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onDelete={(id) => {
                    m.deleteBook.mutate(id)
                    if (selectedId === id) setSelectedId(null)
                  }}
                />
              )}
            </Panel>
          </div>

          <div className="space-y-4 xl:col-span-7">
            {!selected ? (
              <Panel title="Book Detail">
                <p className="text-sm text-muted-foreground">Select a book to manage progress, notes, and more.</p>
              </Panel>
            ) : (
              <>
                <Panel
                  title={selected.title}
                  action={
                    <span className="text-xs text-muted-foreground capitalize">{selected.status}</span>
                  }
                >
                  <p className="text-sm text-muted-foreground">{selected.author || "Unknown author"}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Progress</span>
                      <span>
                        {selected.pages_read}
                        {selected.page_count ? ` / ${selected.page_count}` : ""} · {selected.progress_pct}%
                      </span>
                    </div>
                    <ProgressBar value={selected.progress_pct} />
                  </div>
                  <form
                    className="mt-3 flex flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      m.updateBook.mutate({
                        id: selected.id,
                        body: {
                          pages_read: pagesRead ? Number(pagesRead) : selected.pages_read,
                          status: "reading",
                        },
                      })
                      setPagesRead("")
                    }}
                  >
                    <Input
                      className="w-28"
                      placeholder="Pages read"
                      value={pagesRead}
                      onChange={(e) => setPagesRead(e.target.value)}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Update progress
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        m.updateBook.mutate({ id: selected.id, body: { status: "finished", progress_pct: 100 } })
                      }
                    >
                      Mark finished
                    </Button>
                  </form>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Book Summary</p>
                    <AITextarea
                      fieldId={`book-summary-${selected.id}`}
                      fieldName="Book Summary"
                      fieldDescription="Turn the book summary into polished prose without inventing details."
                      showFieldTitle={false}
                      value={summary || selected.summary || ""}
                      onChange={setSummary}
                      placeholder="Write or edit the book summary…"
                      minHeight={96}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        m.updateBook.mutate({
                          id: selected.id,
                          body: { summary: summary || selected.summary },
                        })
                      }
                    >
                      Save summary
                    </Button>
                  </div>
                </Panel>

                <div className="grid gap-4 md:grid-cols-2">
                  <Panel title="Highlights">
                    <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                      {(detail.highlights.data ?? []).map((h) => (
                        <li key={h.id} className="rounded-xl bg-foreground/[0.03] p-2">
                          <div className="flex justify-between gap-2">
                            <span>“{h.text}”</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => m.deleteHighlight.mutate(h.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!highlightText.trim()) return
                        m.createHighlight.mutate(
                          { bookId: selected.id, body: { text: highlightText.trim() } },
                          { onSuccess: () => setHighlightText("") },
                        )
                      }}
                    >
                      <Input
                        value={highlightText}
                        onChange={(e) => setHighlightText(e.target.value)}
                        placeholder="Add highlight"
                      />
                      <Button type="submit" size="icon" variant="secondary">
                        +
                      </Button>
                    </form>
                  </Panel>

                  <Panel title="Quotes">
                    <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                      {(detail.quotes.data ?? []).map((q) => (
                        <li key={q.id} className="rounded-xl bg-foreground/[0.03] p-2">
                          <div className="flex justify-between gap-2">
                            <button
                              type="button"
                              className="text-left"
                              onClick={() =>
                                m.updateQuote.mutate({
                                  id: q.id,
                                  body: { is_favorite: !q.is_favorite },
                                })
                              }
                            >
                              {q.is_favorite ? "★ " : "☆ "}“{q.text}”
                            </button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => m.deleteQuote.mutate(q.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!quoteText.trim()) return
                        m.createQuote.mutate(
                          { bookId: selected.id, body: { text: quoteText.trim(), is_favorite: false } },
                          { onSuccess: () => setQuoteText("") },
                        )
                      }}
                    >
                      <Input
                        value={quoteText}
                        onChange={(e) => setQuoteText(e.target.value)}
                        placeholder="Add quote"
                      />
                      <Button type="submit" size="icon" variant="secondary">
                        +
                      </Button>
                    </form>
                  </Panel>
                </div>

                <Panel title="Reading Notes">
                  <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                    {(detail.notes.data ?? []).map((n) => (
                      <li key={n.id} className="rounded-xl bg-foreground/[0.03] p-2">
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase text-muted-foreground">{n.kind}</p>
                            <p>{n.body}</p>
                          </div>
                          <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteNote.mutate(n.id)}>
                            ×
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="grid gap-2 sm:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!noteBody.trim()) return
                      m.createNote.mutate(
                        {
                          bookId: selected.id,
                          body: { kind: noteKind, body: noteBody.trim() },
                        },
                        { onSuccess: () => setNoteBody("") },
                      )
                    }}
                  >
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                      value={noteKind}
                      onChange={(e) => setNoteKind(e.target.value as NoteKind)}
                    >
                      <option value="note">Note</option>
                      <option value="summary">Summary</option>
                      <option value="insight">Insight</option>
                      <option value="action">Action</option>
                    </select>
                    <Input
                      className="sm:col-span-2"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Reading note…"
                    />
                    <Button type="submit">Add</Button>
                  </form>
                </Panel>

                <Panel title="Vocabulary from this book">
                  <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                    {(detail.vocab.data ?? [])
                      .filter((v) => v.book_id === selected.id)
                      .map((v) => (
                        <li key={v.id} className="flex justify-between gap-2 rounded-xl bg-foreground/[0.03] p-2">
                          <span>
                            <strong>{v.word}</strong> — {v.meaning}
                          </span>
                          <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteVocab.mutate(v.id)}>
                            ×
                          </Button>
                        </li>
                      ))}
                  </ul>
                  <form
                    className="grid gap-2 sm:grid-cols-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!vocabWord.trim() || !vocabMeaning.trim()) return
                      m.createVocab.mutate(
                        {
                          word: vocabWord.trim(),
                          meaning: vocabMeaning.trim(),
                          book_id: selected.id,
                        },
                        {
                          onSuccess: () => {
                            setVocabWord("")
                            setVocabMeaning("")
                          },
                        },
                      )
                    }}
                  >
                    <Input value={vocabWord} onChange={(e) => setVocabWord(e.target.value)} placeholder="Word" />
                    <Input
                      value={vocabMeaning}
                      onChange={(e) => setVocabMeaning(e.target.value)}
                      placeholder="Meaning"
                    />
                    <Button type="submit">Add word</Button>
                  </form>
                </Panel>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "vocab" && (
        <Panel title="All Vocabulary">
          <form
            className="mb-4 grid gap-2 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!vocabWord.trim() || !vocabMeaning.trim()) return
              m.createVocab.mutate(
                { word: vocabWord.trim(), meaning: vocabMeaning.trim() },
                {
                  onSuccess: () => {
                    setVocabWord("")
                    setVocabMeaning("")
                  },
                },
              )
            }}
          >
            <Input value={vocabWord} onChange={(e) => setVocabWord(e.target.value)} placeholder="Word" />
            <Input value={vocabMeaning} onChange={(e) => setVocabMeaning(e.target.value)} placeholder="Meaning" />
            <Button type="submit">Add</Button>
          </form>
          <ul className="space-y-2">
            {(detail.vocab.data ?? []).map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-2 rounded-2xl bg-foreground/[0.03] p-3 text-sm">
                <div>
                  <p className="font-medium">{v.word}</p>
                  <p className="text-muted-foreground">{v.meaning}</p>
                  {v.example ? <p className="mt-1 text-xs italic text-muted-foreground">{v.example}</p> : null}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteVocab.mutate(v.id)}>
                  ×
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </ModuleHomeShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-card/70 px-3 py-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function BookList({
  books,
  selectedId,
  onSelect,
  onDelete,
}: {
  books: Book[]
  selectedId?: string | null
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
}) {
  if (books.length === 0) {
    return <p className="text-sm text-muted-foreground">No books yet.</p>
  }
  return (
    <ul className="space-y-2">
      {books.map((book) => (
        <li key={book.id}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors",
              selectedId === book.id ? "bg-foreground/10" : "bg-foreground/[0.03] hover:bg-foreground/[0.06]",
            )}
          >
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(book.id)}>
              <p className="truncate text-sm font-medium">{book.title}</p>
              <p className="text-xs text-muted-foreground">
                {book.author || "Unknown"} · {book.status} · {book.progress_pct}%
              </p>
              <ProgressBar value={book.progress_pct} />
            </button>
            {onDelete ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(book.id)}>
                ×
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
