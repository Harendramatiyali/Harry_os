import { useState, type ReactNode } from "react"

import {
  useKnowledgeDashboard,
  useKnowledgeMutations,
  useKnowledgeNote,
  useKnowledgeNotes,
} from "@/features/knowledge/hooks"
import type { ObsidianImportReport, PromoteReport } from "@/features/knowledge/types"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"

type Tab = "library" | "import" | "promote"

const DEFAULT_VAULT = "/Users/harrymati/Documents/EXECUTE- IQ200/EXECUTE"

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-card/70 p-3.5 backdrop-blur-xl">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message)
  }
  return "Request failed"
}

export function KnowledgePage() {
  const [tab, setTab] = useState<Tab>("library")
  const [area, setArea] = useState("")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [vaultPath, setVaultPath] = useState(DEFAULT_VAULT)
  const [skipEmpty, setSkipEmpty] = useState(false)
  const [includeHarendra, setIncludeHarendra] = useState(true)
  const [report, setReport] = useState<ObsidianImportReport | null>(null)
  const [promoteReport, setPromoteReport] = useState<PromoteReport | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [promoBooks, setPromoBooks] = useState(true)
  const [promoTrading, setPromoTrading] = useState(true)

  const dash = useKnowledgeDashboard()
  const notes = useKnowledgeNotes({
    area: area || undefined,
    q: query || undefined,
  })
  const detail = useKnowledgeNote(selectedId)
  const m = useKnowledgeMutations()

  async function runDry() {
    setBanner(null)
    try {
      const res = await m.dryRun.mutateAsync({
        vault_path: vaultPath,
        skip_empty: skipEmpty,
        include_harendra: includeHarendra,
      })
      setReport(res)
      setBanner(`Dry run: ${res.scanned} files · ${res.created} create · ${res.updated} update · ${res.skipped} skip`)
    } catch (err) {
      setBanner(errorMessage(err))
    }
  }

  async function runImport() {
    setBanner(null)
    try {
      const res = await m.importVault.mutateAsync({
        vault_path: vaultPath,
        dry_run: false,
        skip_empty: skipEmpty,
        include_harendra: includeHarendra,
      })
      setReport(res)
      if (res.created === 0 && res.updated === 0 && res.skipped > 0) {
        setBanner(
          `Already imported — ${res.skipped} notes unchanged (already in Library). Nothing more to do unless you edit files in Obsidian and re-import.`,
        )
      } else {
        setBanner(
          `Imported from Obsidian: ${res.created} created · ${res.updated} updated · ${res.skipped} unchanged`,
        )
      }
      // Stay on Import tab so the folder checklist remains visible
    } catch (err) {
      setBanner(errorMessage(err))
    }
  }

  async function runPromoteDry() {
    setBanner(null)
    const modules = [
      ...(promoBooks ? ["books"] : []),
      ...(promoTrading ? ["trading"] : []),
    ]
    if (modules.length === 0) {
      setBanner("Select at least one module (Books and/or Trading).")
      return
    }
    try {
      const res = await m.promoteDryRun.mutateAsync({ modules, dry_run: true })
      setPromoteReport(res)
      setBanner(
        `Promote dry run: ${res.eligible} eligible · ${res.created} create · ${res.updated} update · ${res.skipped} skip`,
      )
    } catch (err) {
      setBanner(errorMessage(err))
    }
  }

  async function runPromote() {
    setBanner(null)
    const modules = [
      ...(promoBooks ? ["books"] : []),
      ...(promoTrading ? ["trading"] : []),
    ]
    if (modules.length === 0) {
      setBanner("Select at least one module (Books and/or Trading).")
      return
    }
    try {
      const res = await m.promote.mutateAsync({ modules, dry_run: false })
      setPromoteReport(res)
      setBanner(
        `Promoted: ${res.created} created · ${res.updated} updated · ${res.skipped} skipped — open Books & Trading to verify.`,
      )
    } catch (err) {
      setBanner(errorMessage(err))
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Knowledge</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Second Brain
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Import-only from your Obsidian vault. Notes land here with folder → area mapping for AI later.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["library", "Library"],
            ["import", "Obsidian Import"],
            ["promote", "Promote to Modules"],
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

      {banner ? (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-100/90">
          {banner}
        </div>
      ) : null}

      {tab === "library" && (
        <div className="space-y-4">
          {dash.isLoading || !dash.data ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Notes" value={String(dash.data.total_notes)} />
              <Stat label="From Obsidian" value={String(dash.data.from_obsidian)} />
              <Stat label="Empty stubs" value={String(dash.data.empty_notes)} />
              <Stat
                label="Areas"
                value={String(dash.data.by_area.length)}
              />
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-5">
              <Panel title="Browse">
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Search title / body"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">All areas</option>
                    {(dash.data?.by_area ?? []).map((a) => (
                      <option key={a.area} value={a.area}>
                        {a.area} ({a.count})
                      </option>
                    ))}
                  </select>
                </div>
                {notes.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (notes.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No notes yet. Run Obsidian Import to pull your vault.
                  </p>
                ) : (
                  <ul className="max-h-[32rem] space-y-1 overflow-y-auto">
                    {(notes.data ?? []).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`flex w-full flex-col rounded-2xl px-3 py-2 text-left text-sm ${
                            selectedId === n.id
                              ? "bg-foreground/10"
                              : "bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                          }`}
                          onClick={() => setSelectedId(n.id)}
                        >
                          <span className="font-medium">{n.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {n.area} · {n.kind}
                            {n.is_empty ? " · empty" : ` · ${n.word_count}w`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="xl:col-span-7">
              <Panel
                title="Note"
                action={
                  selectedId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => m.deleteNote.mutate(selectedId, { onSuccess: () => setSelectedId(null) })}
                    >
                      Delete
                    </Button>
                  ) : null
                }
              >
                {!selectedId ? (
                  <p className="text-sm text-muted-foreground">Select a note.</p>
                ) : detail.isLoading || !detail.data ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">{detail.data.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {detail.data.source} · {detail.data.area} · {detail.data.kind}
                        {detail.data.vault_path ? ` · ${detail.data.vault_path}` : ""}
                      </p>
                    </div>
                    {detail.data.tags.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        tags: {detail.data.tags.join(", ")}
                      </p>
                    ) : null}
                    <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-foreground/[0.03] p-4 font-sans text-sm leading-relaxed">
                      {detail.data.body || "(empty note)"}
                    </pre>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="space-y-4">
          <Panel title="Import from Obsidian (one-way)">
            <p className="mb-3 text-sm text-muted-foreground">
              Reads markdown from your local vault. Re-import updates changed files by path hash —
              no sync back to Obsidian.
            </p>
            <div className="grid gap-3">
              <Input
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
                placeholder="Vault absolute path"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeHarendra}
                  onChange={(e) => setIncludeHarendra(e.target.checked)}
                />
                Include <code className="text-foreground">99 - Harendra OS</code>
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={skipEmpty}
                  onChange={(e) => setSkipEmpty(e.target.checked)}
                />
                Skip empty notes (keeps book title stubs if unchecked)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={runDry} disabled={m.dryRun.isPending}>
                  Dry run
                </Button>
                <Button type="button" onClick={runImport} disabled={m.importVault.isPending}>
                  Import now
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Folder → area mapping">
            <ul className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
              <li>00_Dashboard → dashboard</li>
              <li>01_Life OS → life</li>
              <li>02_Wealth OS / Trading → trading / wealth</li>
              <li>03_Career OS → career</li>
              <li>05_AI OS → ai</li>
              <li>06_Health OS → health</li>
              <li>07_Books → books</li>
              <li>08_Journals / Daily → daily_journal</li>
              <li>Trading Journal → trading_journal</li>
              <li>Weekly / Monthly Review → reviews</li>
              <li>9_Resources → resources</li>
              <li>99 - Harendra OS → project</li>
            </ul>
          </Panel>

          {report ? (
            <Panel title={report.dry_run ? "Dry-run checklist (vs Obsidian)" : "Import report"}>
              <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat label="Scanned" value={String(report.scanned)} />
                <Stat label="Create" value={String(report.created)} />
                <Stat label="Update" value={String(report.updated)} />
                <Stat label="Skip" value={String(report.skipped)} />
                <Stat label="Empty" value={String(report.empty)} />
              </div>
              <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {report.by_area.map((a) => (
                  <span key={a.area} className="rounded-full bg-foreground/[0.06] px-2 py-1">
                    {a.area}: {a.count}
                  </span>
                ))}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Grouped by Obsidian folder — open each section and tick off against your vault sidebar.
              </p>
              <div className="space-y-3">
                {(report.by_folder ?? []).map((folder) => (
                  <details
                    key={folder.folder_path}
                    open
                    className="rounded-[1.2rem] border border-white/10 bg-foreground/[0.02]"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <span className="text-foreground">{folder.folder_path}</span>
                          <span className="ml-2 text-muted-foreground">
                            → {folder.area} · {folder.count} notes
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          +{folder.create} / ~{folder.update} / ={folder.skip}
                          {folder.empty ? ` · ${folder.empty} empty` : ""}
                        </span>
                      </div>
                    </summary>
                    <ul className="border-t border-white/5 px-2 py-2">
                      {folder.files.map((s) => (
                        <li
                          key={s.vault_path}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-xl px-2 py-2 text-sm hover:bg-foreground/[0.04]"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{s.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{s.vault_path}</p>
                          </div>
                          <div className="shrink-0 text-right text-xs text-muted-foreground">
                            <p>
                              <span
                                className={
                                  s.action === "create"
                                    ? "text-emerald-300"
                                    : s.action === "update"
                                      ? "text-amber-200"
                                      : ""
                                }
                              >
                                {s.action}
                              </span>
                              {" · "}
                              {s.kind}
                            </p>
                            <p className="tabular-nums">
                              {s.is_empty ? "empty" : `${s.word_count}w`}
                              {s.journal_date ? ` · ${s.journal_date}` : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      )}

      {tab === "promote" && (
        <div className="space-y-4">
          <Panel title="Promote Knowledge → Books & Trading">
            <p className="mb-3 text-sm text-muted-foreground">
              Pushes mapped Obsidian notes into structured modules. Safe to re-run (skips unchanged).
              Does not invent trade rows — journals go to Trading mind log / weekly reviews.
            </p>
            <div className="mb-3 space-y-2 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={promoBooks}
                  onChange={(e) => setPromoBooks(e.target.checked)}
                />
                <span>
                  <span className="text-foreground">Books</span> — book notes → Books library (+ summary
                  note if body exists)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={promoTrading}
                  onChange={(e) => setPromoTrading(e.target.checked)}
                />
                <span>
                  <span className="text-foreground">Trading</span> — trading journals / rules → Mind log;
                  weekly reviews → Reviews
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={runPromoteDry}
                disabled={m.promoteDryRun.isPending}
              >
                Dry run
              </Button>
              <Button type="button" onClick={runPromote} disabled={m.promote.isPending}>
                Promote now
              </Button>
            </div>
          </Panel>

          {promoteReport ? (
            <Panel title={promoteReport.dry_run ? "Promote dry-run" : "Promote report"}>
              <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat label="Eligible" value={String(promoteReport.eligible)} />
                <Stat label="Create" value={String(promoteReport.created)} />
                <Stat label="Update" value={String(promoteReport.updated)} />
                <Stat label="Skip" value={String(promoteReport.skipped)} />
                <Stat label="Modules" value={promoteReport.modules.join(", ") || "—"} />
              </div>
              <div className="space-y-4">
                {(["books", "trading"] as const).map((mod) => {
                  const rows = promoteReport.items.filter((i) => i.target_module === mod)
                  if (rows.length === 0) return null
                  return (
                    <div key={mod}>
                      <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                        → {mod} ({rows.length})
                      </h3>
                      <ul className="space-y-1">
                        {rows.map((i) => (
                          <li
                            key={`${i.note_id}-${i.target_module}`}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">{i.title}</p>
                              <p className="text-xs text-muted-foreground">{i.detail}</p>
                            </div>
                            <span
                              className={`shrink-0 text-xs tabular-nums ${
                                i.action === "create"
                                  ? "text-emerald-300"
                                  : i.action === "update"
                                    ? "text-amber-200"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {i.action} · {i.target_entity_type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  )
}
