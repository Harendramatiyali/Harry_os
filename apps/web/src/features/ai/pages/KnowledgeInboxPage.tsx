import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Inbox, Sparkles } from "lucide-react"

import { useInboxMutations, useKnowledgeInbox } from "@/features/ai/hooks"
import type { KnowledgeInboxItem } from "@/features/ai/importTypes"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"

const DESTINATIONS = [
  { id: "trading", label: "Trading Journal", hint: "Commit as a normal trading day" },
  { id: "books", label: "Books", hint: "Book notes (parser coming soon)" },
  { id: "finance", label: "Finance", hint: "Investment notes (coming soon)" },
  { id: "health", label: "Health", hint: "Workout / nutrition (coming soon)" },
  { id: "career", label: "Career", hint: "Meetings / projects (coming soon)" },
  { id: "knowledge", label: "Knowledge", hint: "General knowledge base" },
  { id: "inbox", label: "Keep in Inbox", hint: "Decide later" },
] as const

function statusTone(status: string) {
  if (status === "queued") return "border-amber-400/25 bg-amber-400/10 text-amber-100"
  if (status === "routed") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
  if (status === "assigned") return "border-sky-400/25 bg-sky-400/10 text-sky-100"
  return "border-white/10 bg-white/[0.04]"
}

export function KnowledgeInboxPage() {
  const inbox = useKnowledgeInbox()
  const mutations = useInboxMutations()
  const [filter, setFilter] = useState<"all" | "queued" | "assigned" | "routed">("queued")
  const [selected, setSelected] = useState<KnowledgeInboxItem | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const items = useMemo(() => {
    const rows = inbox.data ?? []
    if (filter === "all") return rows
    return rows.filter((r) => r.status === filter)
  }, [inbox.data, filter])

  async function assign(destination: string) {
    if (!selected) return
    setError(null)
    setMessage(null)
    try {
      const result = await mutations.assignDestination.mutateAsync({
        itemId: selected.id,
        body: {
          destination_module: destination,
          parser_type: destination === "trading" ? "trading" : null,
        },
      })
      setMessage(result.message)
      if (result.journal_day_id) {
        window.location.assign(
          `/trading?tab=days&day=${encodeURIComponent(result.journal_day_id)}`,
        )
        return
      }
      setSelected(null)
      await inbox.refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign destination")
    }
  }

  return (
    <div className="relative isolate space-y-8 animate-in fade-in duration-500">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-8 h-48 rounded-[2rem] bg-[radial-gradient(ellipse_at_top,rgba(148,163,184,0.12),transparent_65%)]"
      />

      <header className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            AI · Knowledge Inbox
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.1] font-semibold tracking-tight md:text-[2.35rem]">
            Route unmatched imports
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Low-confidence or unknown notebook pages land here. Pick a destination — Harry AI
            records the correction to learn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild className="rounded-xl">
            <Link to="/ai/imports">Import Notebook</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild className="rounded-xl">
            <Link to="/ai">Back to AI</Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["queued", "assigned", "routed", "all"] as const).map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => setFilter(id)}
          >
            {id}
          </Button>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      {inbox.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading inbox…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[1.35rem] border border-dashed border-white/12 bg-black/15 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground">
            <Inbox className="size-5" />
          </div>
          <div className="space-y-1.5">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold">Inbox clear</p>
            <p className="text-sm text-muted-foreground">
              Unmatched imports appear here after Classify Later or low-confidence routing.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="rounded-[1.35rem] border border-white/[0.08] bg-card/55 p-5 backdrop-blur-xl transition hover:border-white/15 animate-in fade-in slide-in-from-bottom-1"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium tracking-tight">
                      {item.title || "Untitled import"}
                    </p>
                    <Badge className={cn("rounded-full capitalize", statusTone(item.status))}>
                      {item.status}
                    </Badge>
                    <Badge className="rounded-full border border-white/10 bg-white/[0.04] capitalize">
                      {item.parser_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Suggested: {item.suggested_destination || "inbox"}
                    {item.classification_confidence != null
                      ? ` · confidence ${Math.round(item.classification_confidence * 100)}%`
                      : ""}
                    {item.chosen_destination ? ` · chosen ${item.chosen_destination}` : ""}
                  </p>
                  {item.ocr_summary ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground/90">{item.ocr_summary}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  disabled={item.status === "routed" || item.status === "dismissed"}
                  onClick={() => {
                    setSelected(item)
                    setMessage(null)
                    setError(null)
                  }}
                >
                  Choose destination
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg border-white/[0.08] bg-[#0f1115] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)]">
              {selected?.title || "Choose destination"}
            </DialogTitle>
            <DialogDescription>
              Your choice is saved as a correction so classification can improve over time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={mutations.assignDestination.isPending}
                onClick={() => void assign(d.id)}
                className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-left transition hover:border-white/20 hover:bg-black/35"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium tracking-tight">{d.label}</span>
                  <span className="block text-xs text-muted-foreground">{d.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
