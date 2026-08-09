import { useEffect, useMemo, useState } from "react"
import { Download, Expand, ImageIcon, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react"

import { useAuthStore } from "@/features/auth/store"
import { tradingApi } from "@/features/trading/api"
import type { JournalAttachment } from "@/features/trading/types"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { Skeleton } from "@/shared/ui/skeleton"

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(blob)
  })
}

function useAttachmentDataUrl(attachmentId: string | null) {
  const token = useAuthStore((s) => s.accessToken)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!attachmentId || !token) {
      setDataUrl(null)
      setError(attachmentId ? "Sign in required" : null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setDataUrl(null)
    tradingApi
      .fetchJournalAttachmentBlob(attachmentId, token)
      .then((blob) => {
        if (!blob.type.startsWith("image/") && blob.size < 32) {
          throw new Error("Not an image")
        }
        return blobToDataUrl(blob)
      })
      .then((next) => {
        if (!cancelled) setDataUrl(next)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attachmentId, token])

  return { dataUrl, error, loading }
}

async function downloadAttachment(attachment: JournalAttachment, token: string) {
  const blob = await tradingApi.fetchJournalAttachmentBlob(attachment.id, token)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = attachment.file_name || `notebook-page-${attachment.id}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Original Notebook Viewer — page gallery, zoom, fullscreen, download.
 * Shown on Trading Journal day detail when day-level page images exist.
 */
export function OriginalNotebookViewer({ pages }: { pages: JournalAttachment[] }) {
  const token = useAuthStore((s) => s.accessToken)
  const sorted = useMemo(
    () => [...pages].sort((a, b) => a.sort_order - b.sort_order),
    [pages],
  )
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? "")
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenZoom, setFullscreenZoom] = useState(1)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!sorted.some((p) => p.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? "")
      setZoom(1)
    }
  }, [sorted, selectedId])

  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0]
  const { dataUrl, error, loading } = useAttachmentDataUrl(selected?.id ?? null)

  if (!sorted.length) return null

  async function onDownload() {
    if (!selected || !token) return
    setDownloading(true)
    try {
      await downloadAttachment(selected, token)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
          Original Notebook
        </h3>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" />
          {sorted.length} page{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Page Gallery */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sorted.map((page, index) => (
          <NotebookThumb
            key={page.id}
            attachmentId={page.id}
            label={`P${index + 1}`}
            active={page.id === selected?.id}
            onSelect={() => {
              setSelectedId(page.id)
              setZoom(1)
            }}
          />
        ))}
      </div>

      {/* Zoom + Fullscreen + Download */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}
          >
            <ZoomOut />
          </Button>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-28 accent-sky-400"
            aria-label="Zoom level"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(2.5, Number((zoom + 0.25).toFixed(2))))}
          >
            <ZoomIn />
          </Button>
          <span className="ml-1 text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!selected || downloading || !token}
            onClick={() => void onDownload()}
          >
            <Download className="size-3.5" />
            {downloading ? "Downloading…" : "Download"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!dataUrl}
            onClick={() => {
              setFullscreenZoom(zoom)
              setFullscreen(true)
            }}
          >
            <Maximize2 className="size-3.5" />
            Fullscreen
          </Button>
        </div>
      </div>

      <div className="relative min-h-[22rem] overflow-auto rounded-2xl border border-white/10 bg-zinc-950">
        {loading ? <Skeleton className="absolute inset-0 rounded-2xl" /> : null}
        {error ? (
          <div className="flex min-h-[22rem] items-center justify-center text-xs text-red-300/80">
            {error}
          </div>
        ) : null}
        {dataUrl ? (
          <div
            className="flex min-h-[22rem] min-w-full items-center justify-center p-4 transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          >
            <img
              src={dataUrl}
              alt={selected?.file_name ?? "Notebook page"}
              className="max-h-[28rem] w-auto max-w-full rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              draggable={false}
            />
          </div>
        ) : null}
      </div>

      {selected ? (
        <p className="truncate text-xs text-muted-foreground">{selected.file_name}</p>
      ) : null}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[95vh] w-[min(96vw,1100px)] max-w-none overflow-hidden border-white/10 bg-[#121417] p-4 sm:rounded-2xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
            <div>
              <DialogTitle className="font-[family-name:var(--font-display)]">
                {selected?.file_name ?? "Notebook page"}
              </DialogTitle>
              <DialogDescription>Zoom and inspect the original notebook page.</DialogDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  setFullscreenZoom(Math.max(0.5, Number((fullscreenZoom - 0.25).toFixed(2))))
                }
              >
                <ZoomOut />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  setFullscreenZoom(Math.min(3, Number((fullscreenZoom + 0.25).toFixed(2))))
                }
              >
                <ZoomIn />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={!selected || downloading || !token}
                onClick={() => void onDownload()}
              >
                <Download className="size-3.5" />
                Download
              </Button>
              <Button type="button" size="icon" variant="outline" onClick={() => setFullscreen(false)}>
                <Minimize2 />
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[78vh] overflow-auto rounded-xl border border-white/10 bg-black/40">
            <div
              className="flex min-h-[60vh] items-center justify-center p-6 transition-transform duration-300 ease-out"
              style={{ transform: `scale(${fullscreenZoom})`, transformOrigin: "center top" }}
            >
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={selected?.file_name ?? "Notebook page"}
                  className="max-w-full rounded-md shadow-2xl"
                />
              ) : null}
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Expand className="size-3.5" />
            Scroll to pan · {Math.round(fullscreenZoom * 100)}% zoom
          </p>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function NotebookThumb({
  attachmentId,
  label,
  active,
  onSelect,
}: {
  attachmentId: string
  label: string
  active: boolean
  onSelect: () => void
}) {
  const { dataUrl, error, loading } = useAttachmentDataUrl(attachmentId)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-xl border transition duration-300",
        active ? "border-sky-400/50 ring-2 ring-sky-400/30" : "border-white/10 hover:border-white/25",
      )}
    >
      <div className="h-24 w-[4.5rem] bg-zinc-950">
        {loading ? <Skeleton className="h-full w-full rounded-none" /> : null}
        {error ? (
          <div className="flex h-full items-center justify-center text-[9px] text-red-300/80">!</div>
        ) : null}
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={label}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-[10px] text-white/90">
        {label}
      </span>
    </button>
  )
}
