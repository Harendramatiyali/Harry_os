import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CloudUpload, RefreshCw, Trash2, X } from "lucide-react"

import {
  ImportCard,
  ImportShell,
  ImportStatus,
  ProcessingPanel,
} from "@/features/ai/components/importUi"
import { pageFileUrl } from "@/features/ai/importMappers"
import { useImportJob, useImportMutations } from "@/features/ai/hooks"
import { ModuleThemeProvider, useModuleManifest } from "@/features/modules"
import { ApiError } from "@/shared/api/types"
import { useAuthStore } from "@/features/auth/store"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

type Stage = "idle" | "uploading" | "processing" | "error"

export function ImportUploadPage() {
  const navigate = useNavigate()
  const { jobId: jobIdParam } = useParams<{ jobId?: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const m = useImportMutations()
  const fileRef = useRef<HTMLInputElement>(null)
  const changeFileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLLabelElement>(null)

  const [jobId, setJobId] = useState<string | null>(jobIdParam ?? null)
  const [title, setTitle] = useState("")
  const [titleHydrated, setTitleHydrated] = useState(false)
  const [stage, setStage] = useState<Stage>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [processPct, setProcessPct] = useState(8)

  useEffect(() => {
    if (jobIdParam) setJobId(jobIdParam)
  }, [jobIdParam])

  const jobQuery = useImportJob(jobId)
  const pages = jobQuery.data?.pages ?? []

  useEffect(() => {
    if (!jobQuery.data || titleHydrated) return
    const restored = jobQuery.data.title || jobQuery.data.notebook_label || ""
    if (restored) setTitle(restored)
    setTitleHydrated(true)
    if (jobQuery.data.pages?.length) {
      setMessage(
        `${jobQuery.data.pages.length} image${jobQuery.data.pages.length === 1 ? "" : "s"} uploaded`,
      )
    }
  }, [jobQuery.data, titleHydrated])

  useEffect(() => {
    setTitleHydrated(false)
  }, [jobId])

  useEffect(() => {
    if (stage !== "processing") {
      setProcessPct(8)
      return
    }
    setProcessPct(12)
    const id = window.setInterval(() => {
      setProcessPct((p) => {
        if (p >= 96) return 96
        const bump = p < 40 ? 7 : p < 70 ? 4 : 2
        return Math.min(96, p + bump)
      })
    }, 280)
    return () => window.clearInterval(id)
  }, [stage])

  const ensureJob = async () => {
    if (jobId) return jobId
    const job = await m.createJob.mutateAsync({
      title: title.trim() || null,
      notebook_label: title.trim() || null,
    })
    setJobId(job.id)
    navigate(`/ai/imports/${job.id}`, { replace: true })
    return job.id
  }

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length || !token) return
    setError(null)
    setMessage(null)
    setStage("uploading")
    try {
      const id = await ensureJob()
      const files = Array.from(fileList)
      await m.uploadPages.mutateAsync({ jobId: id, files })
      setMessage(`${files.length} image${files.length === 1 ? "" : "s"} uploaded`)
      setStage("idle")
      if (fileRef.current) fileRef.current.value = ""
    } catch (err) {
      setStage("error")
      setError(err instanceof Error ? err.message : "Upload failed")
    }
  }

  async function onChangeImages(fileList: FileList | null) {
    if (!fileList?.length || !token) return
    setError(null)
    setMessage(null)
    setStage("uploading")
    try {
      const id = await ensureJob()
      for (const page of [...pages]) {
        await m.deletePage.mutateAsync({ jobId: id, pageId: page.id })
      }
      const files = Array.from(fileList)
      await m.uploadPages.mutateAsync({ jobId: id, files })
      setMessage(`${files.length} image${files.length === 1 ? "" : "s"} uploaded`)
      setStage("idle")
      if (changeFileRef.current) changeFileRef.current.value = ""
      if (lightbox) setLightbox(null)
    } catch (err) {
      setStage("error")
      setError(err instanceof Error ? err.message : "Could not change images")
    }
  }

  async function onDeletePage(pageId: string) {
    if (!jobId) return
    setError(null)
    try {
      await m.deletePage.mutateAsync({ jobId, pageId })
      if (lightbox) setLightbox(null)
      setMessage("Page removed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function onGeneratePreview() {
    if (!jobId || !token) return
    if (!pages.length) {
      setError("Add at least one notebook page before continuing.")
      return
    }
    setError(null)
    setMessage(null)
    setStage("processing")
    try {
      const preview = await m.generatePreview.mutateAsync({
        jobId,
        body: title.trim() ? { title: title.trim() } : null,
      })
      setProcessPct(100)
      setStage("idle")
      navigate(`/ai/imports/${jobId}/understand`, { state: { preview } })
    } catch (err) {
      setStage("error")
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Preview failed",
      )
    }
  }

  const busy = stage === "uploading" || stage === "processing"
  const sortedPages = pages.slice().sort((a, b) => a.page_index - b.page_index)
  const step = stage === "processing" ? "process" : "upload"
  const hasPages = sortedPages.length > 0
  const themeModule =
    jobQuery.data?.destination_confirmed && jobQuery.data.destination_module
      ? jobQuery.data.destination_module
      : "neutral"

  return (
    <ModuleThemeProvider moduleId={themeModule}>
      <UploadBody
        title={title}
        setTitle={setTitle}
        stage={stage}
        message={message}
        error={error}
        lightbox={lightbox}
        setLightbox={setLightbox}
        dragOver={dragOver}
        setDragOver={setDragOver}
        busy={busy}
        sortedPages={sortedPages}
        hasPages={hasPages}
        step={step}
        processPct={processPct}
        token={token}
        jobId={jobId}
        jobQuery={jobQuery}
        fileRef={fileRef}
        changeFileRef={changeFileRef}
        dropRef={dropRef}
        onPickFiles={onPickFiles}
        onChangeImages={onChangeImages}
        onDeletePage={onDeletePage}
        onGeneratePreview={onGeneratePreview}
        navigate={navigate}
      />
    </ModuleThemeProvider>
  )
}

function UploadBody({
  title,
  setTitle,
  stage,
  message,
  error,
  lightbox,
  setLightbox,
  dragOver,
  setDragOver,
  busy,
  sortedPages,
  hasPages,
  step,
  processPct,
  token,
  jobId,
  jobQuery,
  fileRef,
  changeFileRef,
  dropRef,
  onPickFiles,
  onChangeImages,
  onDeletePage,
  onGeneratePreview,
  navigate,
}: {
  title: string
  setTitle: (v: string) => void
  stage: Stage
  message: string | null
  error: string | null
  lightbox: { src: string; name: string } | null
  setLightbox: (v: { src: string; name: string } | null) => void
  dragOver: boolean
  setDragOver: (v: boolean) => void
  busy: boolean
  sortedPages: { id: string; page_index: number; original_file_name: string | null }[]
  hasPages: boolean
  step: "upload" | "process"
  processPct: number
  token: string | null
  jobId: string | null
  jobQuery: ReturnType<typeof useImportJob>
  fileRef: React.RefObject<HTMLInputElement | null>
  changeFileRef: React.RefObject<HTMLInputElement | null>
  dropRef: React.RefObject<HTMLLabelElement | null>
  onPickFiles: (f: FileList | null) => Promise<void>
  onChangeImages: (f: FileList | null) => Promise<void>
  onDeletePage: (id: string) => Promise<void>
  onGeneratePreview: () => Promise<void>
  navigate: ReturnType<typeof useNavigate>
}) {
  const manifest = useModuleManifest()
  const upload = manifest.import.upload

  return (
    <ImportShell compact step={step} backHref="/ai" backLabel="Back to AI">
      {error ? <ImportStatus tone="error" title="Something went wrong">{error}</ImportStatus> : null}
      {stage === "uploading" ? (
        <ImportStatus tone="progress" title="Uploading pages…">
          Keeping your session intact while images land.
        </ImportStatus>
      ) : null}

      {stage === "processing" ? (
        <ProcessingPanel
          active
          percent={processPct}
          label={`Extracting ${manifest.name.toLowerCase()} insights.`}
          lines={["Scanning...", "Analyzing handwriting...", `Extracting ${manifest.name.toLowerCase()} insights.`]}
        />
      ) : (
        <ImportCard className="mx-auto max-w-xl space-y-5 !p-6 md:!p-8">
          <div className="space-y-2">
            <Label htmlFor="import-title" className="text-[11px] tracking-wide text-muted-foreground uppercase">
              {upload.sessionLabel}
            </Label>
            <Input
              id="import-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={upload.sessionPlaceholder}
              disabled={busy}
              className="h-10 rounded-xl border-white/10 bg-black/25"
            />
          </div>

          <input
            ref={fileRef}
            id="import-files"
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            className="sr-only"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <input
            ref={changeFileRef}
            id="import-change-files"
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            className="sr-only"
            onChange={(e) => void onChangeImages(e.target.files)}
          />

          <label
            ref={dropRef}
            htmlFor="import-files"
            onDragEnter={(e) => {
              e.preventDefault()
              if (!busy) setDragOver(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!busy) setDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setDragOver(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (!busy) void onPickFiles(e.dataTransfer.files)
            }}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-all duration-300",
              dragOver
                ? "scale-[1.01]"
                : "hover:border-white/25",
              busy && "pointer-events-none opacity-60",
            )}
            style={{
              borderColor: dragOver ? "var(--module-accent)" : "rgba(255,255,255,0.14)",
              background: dragOver ? "var(--module-accent-soft)" : "rgba(0,0,0,0.22)",
            }}
          >
            <div
              className="flex size-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--module-accent-soft)", color: "var(--module-accent)" }}
            >
              <CloudUpload className="size-6" />
            </div>
            <p className="text-[15px] font-medium tracking-tight">
              Drag & drop images or click to browse
            </p>
            <p className="text-xs text-muted-foreground">{upload.dropHint}</p>
          </label>

          {sortedPages.length > 0 && token ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {sortedPages.length} image{sortedPages.length === 1 ? "" : "s"} uploaded
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => changeFileRef.current?.click()}
                  className="h-8 gap-1 rounded-lg text-xs"
                >
                  <RefreshCw className="size-3" />
                  Change
                </Button>
              </div>
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {sortedPages.map((p) => {
                  const src = pageFileUrl(p.id, token!)
                  const name = p.original_file_name ?? `page-${p.page_index + 1}`
                  return (
                    <li key={p.id} className="group relative shrink-0">
                      <button
                        type="button"
                        className="block h-20 w-14 overflow-hidden rounded-lg border border-white/10"
                        onClick={() => setLightbox({ src, name })}
                        disabled={busy}
                      >
                        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onDeletePage(p.id)}
                        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-white/15 bg-[#12151c] text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-rose-300"
                        aria-label="Remove page"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : message ? (
            <p className="text-center text-xs text-muted-foreground">{message}</p>
          ) : null}

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button
              type="button"
              disabled={busy || !jobId || !hasPages}
              onClick={() => void onGeneratePreview()}
              className="rounded-xl px-6 font-semibold"
              style={{ background: "var(--module-accent)", color: "#0a0a0a" }}
            >
              {jobQuery.data?.has_draft ? upload.reprocessLabel : upload.processLabel}
            </Button>
            {jobId && jobQuery.data?.has_draft ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="rounded-xl"
                onClick={() =>
                  navigate(
                    jobQuery.data?.destination_confirmed
                      ? `/ai/imports/review/${jobId}`
                      : `/ai/imports/${jobId}/understand`,
                  )
                }
              >
                Continue
              </Button>
            ) : null}
          </div>
        </ImportCard>
      )}

      <Dialog open={Boolean(lightbox)} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-h-[95vh] w-[min(96vw,900px)] max-w-none overflow-hidden border-white/[0.08] bg-[#0f1115]/95 p-5 backdrop-blur-2xl sm:rounded-3xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
            <div>
              <DialogTitle>{lightbox?.name ?? "Page image"}</DialogTitle>
              <DialogDescription>Check clarity before generating the draft.</DialogDescription>
            </div>
            <Button type="button" size="icon" variant="outline" className="rounded-xl" onClick={() => setLightbox(null)}>
              <X className="size-4" />
            </Button>
          </DialogHeader>
          <div className="max-h-[72vh] overflow-auto rounded-2xl border border-white/10 bg-black/50 p-3">
            {lightbox ? (
              <img src={lightbox.src} alt={lightbox.name} className="mx-auto max-h-[68vh] w-auto max-w-full rounded-lg" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </ImportShell>
  )
}
