import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { FileWarning, Loader2, LogIn, Upload } from "lucide-react"

import {
  ImportEmptyState,
  ImportErrorState,
  ImportLoadingState,
  ImportShell,
  ImportStatus,
} from "@/features/ai/components/importUi"
import { destinationLabel } from "@/features/ai/destinations"
import { cloneImportReviewDraft, mapApiToReviewDraft, mapReviewDraftToApi } from "@/features/ai/importMappers"
import type {
  ImportReviewDraft,
  ReviewDaySection,
  ReviewTrade,
  ReviewTradeSection,
} from "@/features/ai/importReviewTypes"
import { useImportJob, useImportMutations } from "@/features/ai/hooks"
import type { ImportPreviewOut } from "@/features/ai/importTypes"
import {
  DynamicReviewWorkspace,
  ReviewSuccessScreen,
} from "@/features/ai/review/DynamicReviewWorkspace"
import {
  TradingReviewExperience,
  TradingReviewSuccess,
} from "@/features/ai/reviewExperience/TradingReviewExperience"
import {
  BooksReviewExperience,
  BooksReviewSuccess,
} from "@/features/ai/reviewExperience/BooksReviewExperience"
import {
  FinanceReviewExperience,
  FinanceReviewSuccess,
} from "@/features/ai/reviewExperience/FinanceReviewExperience"
import {
  CareerReviewExperience,
  CareerReviewSuccess,
} from "@/features/ai/reviewExperience/CareerReviewExperience"
import "@/features/ai/reviewExperience/reviewExperience.css"
import { ModuleThemeProvider, resolveModule, useModuleManifest } from "@/features/modules"
import { useAuthStore } from "@/features/auth/store"
import { ApiError } from "@/shared/api/types"
import { Button } from "@/shared/ui/button"

export function ImportReviewScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobId } = useParams<{ jobId: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const jobQuery = useImportJob(jobId)
  const mutations = useImportMutations()
  const previewFromNav = (location.state as { preview?: ImportPreviewOut } | null)?.preview

  const [baseline, setBaseline] = useState<ImportReviewDraft | null>(null)
  const [draft, setDraft] = useState<ImportReviewDraft | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [successRoute, setSuccessRoute] = useState<string | null>(null)
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId || !jobQuery.data) return
    if (jobQuery.data.status === "committed") return
    if (!jobQuery.data.destination_confirmed) {
      navigate(`/ai/imports/${jobId}/understand`, {
        replace: true,
        state: previewFromNav ? { preview: previewFromNav } : undefined,
      })
    }
  }, [jobId, jobQuery.data, navigate, previewFromNav])

  useEffect(() => {
    if (!jobId || !token) return

    const apply = (
      apiDraft: NonNullable<ImportPreviewOut["draft"]>,
      confidence: ImportPreviewOut["confidence"] | null | undefined,
      pages: NonNullable<typeof jobQuery.data>["pages"],
      version: number,
    ) => {
      const key = `${jobId}:${version}:${token}:p${pages.length}`
      if (hydratedKey === key) return
      try {
        const mapped = mapApiToReviewDraft({
          jobId,
          draft: apiDraft,
          confidence,
          pages,
          accessToken: token,
        })
        setBaseline(cloneImportReviewDraft(mapped))
        setDraft(cloneImportReviewDraft(mapped))
        setHydratedKey(key)
        setErrorBanner(null)
      } catch (err) {
        setErrorBanner(err instanceof Error ? err.message : "Failed to load draft")
      }
    }

    if (previewFromNav?.draft) {
      apply(
        previewFromNav.draft,
        previewFromNav.confidence,
        jobQuery.data?.pages ?? [],
        previewFromNav.draft_version,
      )
      return
    }

    if (jobQuery.isLoading || jobQuery.isFetching) return
    if (jobQuery.isError) return
    if (!jobQuery.data) {
      setErrorBanner("Import session not found.")
      return
    }
    if (!jobQuery.data.draft) {
      setErrorBanner("No preview draft on this session. Generate a preview first.")
      return
    }
    apply(
      jobQuery.data.draft,
      jobQuery.data.confidence,
      jobQuery.data.pages,
      jobQuery.data.draft_version,
    )
  }, [
    jobId,
    token,
    previewFromNav,
    jobQuery.data,
    jobQuery.isLoading,
    jobQuery.isFetching,
    jobQuery.isError,
    hydratedKey,
  ])

  const dirty = useMemo(
    () => Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline)),
    [draft, baseline],
  )

  const destination =
    jobQuery.data?.destination_module ||
    previewFromNav?.classification?.destination ||
    "trading"

  const parserType =
    jobQuery.data?.parser_type || previewFromNav?.parser_type || "trading"

  const updateSection = useCallback((id: string, patch: Partial<ReviewDaySection>) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          }
        : prev,
    )
  }, [])

  const updateTrade = useCallback((id: string, patch: Partial<ReviewTrade>) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            trades: prev.trades.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          }
        : prev,
    )
  }, [])

  const updateTradeSection = useCallback(
    (tradeId: string, sectionId: string, patch: Partial<ReviewTradeSection>) => {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              trades: prev.trades.map((t) =>
                t.id !== tradeId
                  ? t
                  : {
                      ...t,
                      sections: t.sections.map((s) =>
                        s.id === sectionId ? { ...s, ...patch } : s,
                      ),
                    },
              ),
            }
          : prev,
      )
    },
    [],
  )

  async function regenerateSection(_kind: "day" | "trade", id: string, _tradeId?: string) {
    if (!jobId || !token) return
    setRegeneratingId(id)
    setBanner(null)
    setErrorBanner(null)
    try {
      const preview = await mutations.generatePreview.mutateAsync({
        jobId,
        body: { parser_type: parserType },
      })
      await mutations.confirmDestination.mutateAsync({
        jobId,
        body: {
          destination_module: destination,
          parser_type: parserType,
        },
      })
      const refreshed = await jobQuery.refetch()
      const pages = refreshed.data?.pages ?? jobQuery.data?.pages ?? []
      const mapped = mapApiToReviewDraft({
        jobId,
        draft: preview.draft,
        confidence: preview.confidence,
        pages,
        accessToken: token,
      })
      setBaseline(cloneImportReviewDraft(mapped))
      setDraft(cloneImportReviewDraft(mapped))
      setHydratedKey(`${jobId}:${preview.draft_version}:${token}:p${pages.length}`)
      setBanner("Preview regenerated from notebook pages.")
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Regenerate failed")
    } finally {
      setRegeneratingId(null)
    }
  }

  function onSaveDraft() {
    if (!draft) return
    setBaseline(cloneImportReviewDraft(draft))
    setBanner("Draft saved locally. Commit when you’re ready.")
  }

  async function onKeepForLater() {
    if (!jobId) return
    setSaving(true)
    setBanner(null)
    setErrorBanner(null)
    try {
      await mutations.confirmDestination.mutateAsync({
        jobId,
        body: {
          destination_module: "inbox",
          parser_type: "general",
          classify_later: true,
        },
      })
      navigate("/ai/knowledge/inbox")
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Could not keep for later")
    } finally {
      setSaving(false)
    }
  }

  async function onSave() {
    if (!jobId || !draft) return
    setSaving(true)
    setBanner(null)
    setErrorBanner(null)
    try {
      const result = await mutations.commit.mutateAsync({
        jobId,
        body: {
          draft: mapReviewDraftToApi(draft),
          approve: true,
          destination_module: destination,
        },
      })
      setBaseline(cloneImportReviewDraft(draft))
      const mod = resolveModule(destination)
      const route =
        result.journal_day_id
          ? `/trading?tab=days&day=${encodeURIComponent(result.journal_day_id)}`
          : mod.import.review.successRoute || mod.route || "/"
      setSuccessRoute(route)
      setSaveSuccess(true)
      setBanner(result.message || `Saved to ${destinationLabel(result.destination || destination)}.`)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Save failed"
      setErrorBanner(msg)
    } finally {
      setSaving(false)
    }
  }

  function onBackToUnderstand() {
    if (!jobId) {
      navigate("/ai/imports")
      return
    }
    navigate(`/ai/imports/${jobId}/understand`)
  }

  const understandBack = jobId ? `/ai/imports/${jobId}/understand` : "/ai/imports"
  const understandBackLabel = jobId ? "Back to Understanding" : "Back to Upload"

  if (!jobId) {
    return (
      <ImportShell title="Review Import" step="review" backHref="/ai/imports" backLabel="Back to Upload">
        <ImportEmptyState
          icon={<Upload className="size-5" />}
          title="No import session"
          description="Upload notebook pages and generate a preview before reviewing."
          action={
            <Button type="button" asChild className="rounded-xl">
              <Link to="/ai/imports">Go to Upload</Link>
            </Button>
          }
        />
      </ImportShell>
    )
  }

  if (!token) {
    return (
      <ImportShell
        title="Review Import"
        step="review"
        backHref={`/ai/imports/${jobId}`}
        backLabel="Back to Upload"
      >
        <ImportEmptyState
          icon={<LogIn className="size-5" />}
          title="Sign in required"
          description="Sign in to review and save import drafts."
        />
      </ImportShell>
    )
  }

  if (jobQuery.data && !jobQuery.data.destination_confirmed && jobQuery.data.status !== "committed") {
    return (
      <ImportShell
        title="Review Import"
        step="understand"
        backHref={understandBack}
        backLabel={understandBackLabel}
      >
        <ImportLoadingState label="Confirm destination first…" />
      </ImportShell>
    )
  }

  if ((jobQuery.isLoading || jobQuery.isFetching) && !draft && !previewFromNav?.draft) {
    return (
      <ImportShell
        title="Review Import"
        step="review"
        backHref={understandBack}
        backLabel={understandBackLabel}
      >
        <ImportLoadingState label="Loading import draft…" />
      </ImportShell>
    )
  }

  if (jobQuery.isError && !draft) {
    return (
      <ImportShell
        title="Review Import"
        step="review"
        backHref={understandBack}
        backLabel={understandBackLabel}
      >
        <ImportErrorState
          title="Couldn’t load import"
          description={
            jobQuery.error instanceof Error ? jobQuery.error.message : "Failed to load import"
          }
          action={
            <Button type="button" variant="outline" asChild className="rounded-xl">
              <Link to="/ai/imports">Back to Upload</Link>
            </Button>
          }
        />
      </ImportShell>
    )
  }

  if (!draft) {
    return (
      <ImportShell title="Review Import" step="review" backHref={`/ai/imports/${jobId}`} backLabel="Back to Upload">
        {errorBanner ? (
          <ImportErrorState
            title="No draft available"
            description={errorBanner}
            action={
              <Button type="button" asChild className="rounded-xl">
                <Link to={`/ai/imports/${jobId}`}>Generate preview</Link>
              </Button>
            }
          />
        ) : (
          <ImportEmptyState
            icon={<FileWarning className="size-5" />}
            title="No draft loaded"
            description="Generate a preview from your uploaded pages first."
            action={
              <Button type="button" asChild className="rounded-xl">
                <Link to={`/ai/imports/${jobId}`}>Generate preview</Link>
              </Button>
            }
          />
        )}
      </ImportShell>
    )
  }

  return (
    <ModuleThemeProvider moduleId={destination}>
      <ReviewThemed
        destination={destination}
        parserType={parserType}
        saving={saving}
        dirty={dirty}
        understandBack={understandBack}
        understandBackLabel={understandBackLabel}
        onBack={onBackToUnderstand}
        onSaveDraft={onSaveDraft}
        onKeepForLater={() => void onKeepForLater()}
        onSave={() => void onSave()}
        committed={jobQuery.data?.status === "committed"}
        errorBanner={errorBanner}
        banner={banner}
        draft={draft}
        regeneratingId={regeneratingId}
        setDraft={setDraft}
        updateSection={updateSection}
        updateTrade={updateTrade}
        updateTradeSection={updateTradeSection}
        regenerateSection={regenerateSection}
        saveSuccess={saveSuccess}
        successRoute={successRoute}
        onSuccessContinue={() => {
          navigate(successRoute || resolveModule(destination).import.review.successRoute || "/")
        }}
      />
    </ModuleThemeProvider>
  )
}

function ReviewThemed({
  destination,
  parserType,
  saving,
  dirty,
  understandBack,
  understandBackLabel,
  onBack,
  onSaveDraft,
  onKeepForLater,
  onSave,
  committed,
  errorBanner,
  banner,
  draft,
  regeneratingId,
  setDraft,
  updateSection,
  updateTrade,
  updateTradeSection,
  regenerateSection,
  saveSuccess,
  successRoute,
  onSuccessContinue,
}: {
  destination: string
  parserType: string
  saving: boolean
  dirty: boolean
  understandBack: string
  understandBackLabel: string
  onBack: () => void
  onSaveDraft: () => void
  onKeepForLater: () => void
  onSave: () => void
  committed: boolean
  errorBanner: string | null
  banner: string | null
  draft: ImportReviewDraft
  regeneratingId: string | null
  setDraft: React.Dispatch<React.SetStateAction<ImportReviewDraft | null>>
  updateSection: (id: string, patch: Partial<ReviewDaySection>) => void
  updateTrade: (id: string, patch: Partial<ReviewTrade>) => void
  updateTradeSection: (
    tradeId: string,
    sectionId: string,
    patch: Partial<ReviewTradeSection>,
  ) => void
  regenerateSection: (kind: "day" | "trade", id: string, tradeId?: string) => void
  saveSuccess: boolean
  successRoute: string | null
  onSuccessContinue: () => void
}) {
  const manifest = useModuleManifest()
  const isTrading = destination === "trading" || parserType === "trading"
  const isBooks = destination === "books" || parserType === "book"
  const isFinance = destination === "finance" || parserType === "finance"
  const isCareer =
    destination === "career" ||
    destination === "planner" ||
    parserType === "meeting"
  const useExactExperience = isTrading || isBooks || isFinance || isCareer

  useEffect(() => {
    if (!saveSuccess || !successRoute) return
    const t = window.setTimeout(() => onSuccessContinue(), 2200)
    return () => window.clearTimeout(t)
  }, [saveSuccess, successRoute, onSuccessContinue])

  if (useExactExperience) {
    const accent = isCareer
      ? "#f59e0b"
      : isFinance
        ? "#3b82f6"
        : isBooks
          ? "#a855f7"
          : "#22c55e"
    const patchDraft = (patch: Partial<ImportReviewDraft>) =>
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev))

    const sharedProps = {
      draft,
      saving,
      committed,
      regeneratingId,
      onBack,
      onChangeDestination: onBack,
      onKeepForLater,
      onAddToHarryOs: onSave,
      onUpdateSection: updateSection,
      onPatchDraft: patchDraft,
      onRegenerate: regenerateSection,
    }

    return (
      <div className="space-y-4">
        {errorBanner ? (
          <div className="mx-auto max-w-[1400px] px-4 md:px-6">
            <ImportStatus tone="error" title="Something went wrong">
              {errorBanner}
            </ImportStatus>
          </div>
        ) : null}
        {banner && !saveSuccess ? (
          <div className="mx-auto max-w-[1400px] px-4 md:px-6">
            <ImportStatus tone="info" title="Update">
              {banner}
            </ImportStatus>
          </div>
        ) : null}

        {saveSuccess ? (
          isCareer ? (
            <CareerReviewSuccess onContinue={onSuccessContinue} />
          ) : isFinance ? (
            <FinanceReviewSuccess onContinue={onSuccessContinue} />
          ) : isBooks ? (
            <BooksReviewSuccess onContinue={onSuccessContinue} />
          ) : (
            <TradingReviewSuccess onContinue={onSuccessContinue} />
          )
        ) : isCareer ? (
          <CareerReviewExperience {...sharedProps} />
        ) : isFinance ? (
          <FinanceReviewExperience {...sharedProps} />
        ) : isBooks ? (
          <BooksReviewExperience {...sharedProps} />
        ) : (
          <TradingReviewExperience {...sharedProps} onUpdateTrade={updateTrade} />
        )}

        {saving ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className="flex items-center gap-3 rounded-[16px] border px-5 py-4"
              style={{
                background: "#12151a",
                borderColor: "rgba(255,255,255,0.08)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Loader2 className="size-5 animate-spin" style={{ color: accent }} />
              <span className="text-sm font-medium text-white">Saving…</span>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <ImportShell
      compact
      step={saveSuccess || saving ? "save" : "review"}
      backHref={understandBack}
      backLabel={understandBackLabel}
    >
      {errorBanner ? (
        <ImportStatus tone="error" title="Something went wrong">
          {errorBanner}
        </ImportStatus>
      ) : null}
      {banner && !saveSuccess ? (
        <ImportStatus tone="info" title="Update">
          {banner}
        </ImportStatus>
      ) : null}

      {saveSuccess ? (
        <ReviewSuccessScreen
          moduleName={manifest.name}
          title={manifest.import.review.successTitle}
          ctaLabel={manifest.import.review.successCta}
          onContinue={onSuccessContinue}
        />
      ) : (
        <DynamicReviewWorkspace
          draft={draft}
          destination={destination}
          parserType={parserType}
          dirty={dirty}
          saving={saving}
          committed={committed}
          regeneratingId={regeneratingId}
          handlers={{
            setDraft,
            updateSection,
            updateTrade,
            updateTradeSection,
            regenerateSection,
            regeneratingId,
          }}
          onBack={onBack}
          onSaveDraft={onSaveDraft}
          onSave={onSave}
          onChangeDestination={onBack}
        />
      )}

      {saving ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="module-card flex items-center gap-3 border px-5 py-4">
            <Loader2 className="size-5 animate-spin" style={{ color: "var(--module-accent)" }} />
            <span className="text-sm font-medium">Saving…</span>
          </div>
        </div>
      ) : null}
    </ImportShell>
  )
}
