import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { Check, Loader2 } from "lucide-react"

import {
  ImportCard,
  ImportEmptyState,
  ImportErrorState,
  ImportLoadingState,
  ImportShell,
  ImportStatus,
} from "@/features/ai/components/importUi"
import {
  CLASSIFY_LATER,
  IMPORT_DESTINATIONS,
  LOW_CONFIDENCE_THRESHOLD,
  parserLabel,
  type ImportDestinationId,
} from "@/features/ai/destinations"
import { useImportJob, useImportMutations } from "@/features/ai/hooks"
import type { ImportPreviewOut } from "@/features/ai/importTypes"
import {
  ModuleThemeProvider,
  resolveModule,
  useModuleManifest,
} from "@/features/modules"
import { resolveModuleIcon } from "@/features/modules/moduleIcons"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

function formatConfidence(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${Math.round(value * 100)}%`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function ImportUnderstandingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobId } = useParams<{ jobId: string }>()
  const jobQuery = useImportJob(jobId)
  const mutations = useImportMutations()
  const previewFromNav = (location.state as { preview?: ImportPreviewOut } | null)?.preview

  const suggestedDestination = useMemo((): ImportDestinationId => {
    const fromPreview = previewFromNav?.classification?.destination
    const fromJob = jobQuery.data?.destination_module
    const raw = (fromPreview || fromJob || "trading").toLowerCase()
    if (raw === "planner" || raw === "career") return "career"
    if (IMPORT_DESTINATIONS.some((d) => d.id === raw)) return raw as ImportDestinationId
    if (raw === "inbox") return "trading"
    return "trading"
  }, [previewFromNav, jobQuery.data?.destination_module])

  const [selected, setSelected] = useState<ImportDestinationId | "inbox" | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveSelection = selected ?? suggestedDestination

  const detectedType =
    previewFromNav?.classification?.parser_type ||
    previewFromNav?.parser_type ||
    jobQuery.data?.parser_type ||
    "trading"

  const confidence =
    previewFromNav?.classification?.confidence ??
    jobQuery.data?.classification_confidence ??
    previewFromNav?.confidence?.overall ??
    jobQuery.data?.overall_confidence ??
    null

  const detectedDate =
    previewFromNav?.draft?.journal_date ||
    jobQuery.data?.draft?.journal_date ||
    jobQuery.data?.detected_journal_date ||
    null

  const draftSections =
    previewFromNav?.draft?.sections || jobQuery.data?.draft?.sections || []

  const lowConfidence = confidence != null && confidence < LOW_CONFIDENCE_THRESHOLD

  async function confirm(destination: ImportDestinationId | "inbox", classifyLater = false) {
    if (!jobId) return
    setBusy(true)
    setError(null)
    try {
      const result = await mutations.confirmDestination.mutateAsync({
        jobId,
        body: {
          destination_module: destination,
          parser_type:
            destination === "inbox"
              ? "general"
              : IMPORT_DESTINATIONS.find((d) => d.id === destination)?.parserType,
          classify_later: classifyLater || destination === "inbox",
        },
      })
      if (result.inbox_item_id || classifyLater || destination === "inbox") {
        navigate("/ai/knowledge/inbox")
        return
      }
      navigate(`/ai/imports/review/${jobId}`, {
        state: { preview: result.preview ?? previewFromNav },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm destination")
    } finally {
      setBusy(false)
    }
  }

  const uploadHref = jobId ? `/ai/imports/${jobId}` : "/ai/imports"

  if (!jobId) {
    return (
      <ImportShell compact step="understand" backHref="/ai/imports" backLabel="Back to Upload">
        <ImportEmptyState
          title="No import session"
          description="Upload pages and generate a preview first."
          action={
            <Button type="button" asChild className="rounded-xl">
              <Link to="/ai/imports">Go to Upload</Link>
            </Button>
          }
        />
      </ImportShell>
    )
  }

  if (jobQuery.isLoading && !previewFromNav) {
    return (
      <ImportShell compact step="understand" backHref={uploadHref} backLabel="Back to Upload">
        <ImportLoadingState label="Loading AI understanding…" />
      </ImportShell>
    )
  }

  if (jobQuery.isError && !previewFromNav) {
    return (
      <ImportShell compact step="understand" backHref={uploadHref} backLabel="Back to Upload">
        <ImportErrorState
          title="Couldn’t load import"
          description={
            jobQuery.error instanceof Error ? jobQuery.error.message : "Failed to load import"
          }
        />
      </ImportShell>
    )
  }

  if (!jobQuery.data?.has_draft && !previewFromNav?.draft) {
    return (
      <ImportShell compact step="understand" backHref={uploadHref} backLabel="Back to Upload">
        <ImportEmptyState
          title="No draft yet"
          description="Generate a preview so the AI can classify this document."
          action={
            <Button type="button" asChild className="rounded-xl">
              <Link to={uploadHref}>Back to Upload</Link>
            </Button>
          }
        />
      </ImportShell>
    )
  }

  return (
    <ModuleThemeProvider moduleId={effectiveSelection === "inbox" ? "neutral" : effectiveSelection}>
      <UnderstandingBody
        uploadHref={uploadHref}
        suggestedDestination={suggestedDestination}
        effectiveSelection={effectiveSelection}
        setSelected={setSelected}
        pickerOpen={pickerOpen}
        setPickerOpen={setPickerOpen}
        detectedType={detectedType}
        confidence={confidence}
        detectedDate={detectedDate}
        draftSections={draftSections}
        lowConfidence={lowConfidence}
        busy={busy}
        error={error}
        confirm={confirm}
      />
    </ModuleThemeProvider>
  )
}

function UnderstandingBody({
  uploadHref,
  suggestedDestination,
  effectiveSelection,
  setSelected,
  pickerOpen,
  setPickerOpen,
  detectedType,
  confidence,
  detectedDate,
  draftSections,
  lowConfidence,
  busy,
  error,
  confirm,
}: {
  uploadHref: string
  suggestedDestination: ImportDestinationId
  effectiveSelection: ImportDestinationId | "inbox"
  setSelected: (v: ImportDestinationId | "inbox") => void
  pickerOpen: boolean
  setPickerOpen: (v: boolean) => void
  detectedType: string
  confidence: number | null
  detectedDate: string | null
  draftSections: { heading?: string; section_key?: string }[]
  lowConfidence: boolean
  busy: boolean
  error: string | null
  confirm: (d: ImportDestinationId | "inbox", later?: boolean) => Promise<void>
}) {
  const manifest = useModuleManifest()
  const ModuleIcon = resolveModuleIcon(manifest.identity.icon)
  const selectionMeta =
    effectiveSelection === "inbox"
      ? CLASSIFY_LATER
      : IMPORT_DESTINATIONS.find((d) => d.id === effectiveSelection) ??
        IMPORT_DESTINATIONS.find((d) => d.id === suggestedDestination)!

  const keyItems = useMemo(() => {
    const fromDraft = draftSections
      .map((s) => s.heading || s.section_key || "")
      .filter(Boolean)
      .slice(0, 5)
    if (fromDraft.length) return fromDraft
    return (manifest.review.sections ?? [])
      .filter((s) => s.kind === "content")
      .slice(0, 4)
      .map((s) => s.label)
  }, [draftSections, manifest.review.sections])

  return (
    <ImportShell compact step="understand" backHref={uploadHref} backLabel="Back to Upload">
      {error ? (
        <ImportStatus tone="error" title="Something went wrong">
          {error}
        </ImportStatus>
      ) : null}

      {lowConfidence ? (
        <ImportStatus tone="info" title="Low confidence">
          Classification is uncertain ({formatConfidence(confidence)}). Review carefully or classify later.
        </ImportStatus>
      ) : null}

      {/* Mockup Understanding card */}
      <ImportCard className="mx-auto max-w-md space-y-5 !p-6 md:!p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ background: "var(--module-accent-soft)", color: "var(--module-accent)" }}
            >
              <ModuleIcon className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Detected Type
              </p>
              <p className="text-lg font-semibold tracking-tight">{parserLabel(detectedType)}</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--module-accent)" }}
            >
              {formatConfidence(confidence)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Confidence</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Key Items Found
          </p>
          <ul className="space-y-1.5">
            {keyItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--module-accent-soft)", color: "var(--module-accent)" }}
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Detected Date
            </p>
            <p className="mt-0.5 text-sm font-medium">{formatDate(detectedDate)}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-white/[0.06] pt-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Suggested Destination
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm(effectiveSelection, effectiveSelection === "inbox")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--module-accent)", color: "#0a0a0a" }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {selectionMeta.label}
            </button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="rounded-xl border-white/15"
              onClick={() => setPickerOpen((v) => !v)}
            >
              Change
            </Button>
          </div>

          {pickerOpen ? (
            <div className="space-y-1.5 rounded-xl border border-white/[0.08] bg-black/25 p-2 animate-in fade-in duration-200">
              {IMPORT_DESTINATIONS.map((dest) => {
                const theme = resolveModule(dest.id)
                const active = effectiveSelection === dest.id
                const Icon = resolveModuleIcon(theme.identity.icon)
                return (
                  <button
                    key={dest.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSelected(dest.id)
                      setPickerOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                      active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                    )}
                    style={active ? { color: theme.theme.tokens.accent } : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {dest.label}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelected("inbox")
                  setPickerOpen(false)
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-amber-200 transition hover:bg-white/[0.04]",
                  effectiveSelection === "inbox" && "bg-amber-400/10",
                )}
              >
                {CLASSIFY_LATER.label}
              </button>
            </div>
          ) : null}
        </div>
      </ImportCard>
    </ImportShell>
  )
}
