import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import type { ReviewNotebookPage } from "@/features/ai/reviewExperience/types"
import { cn } from "@/shared/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"

export function ReviewNotebookViewer({
  pages,
  selectedPageId: selectedControlled,
  onSelectPage,
  title = "Original Notebook",
}: {
  pages: ReviewNotebookPage[]
  selectedPageId?: string
  onSelectPage?: (id: string) => void
  title?: string
}) {
  const [selectedInternal, setSelectedInternal] = useState(pages[0]?.id ?? "")
  const selectedId = selectedControlled ?? selectedInternal
  const setSelected = (id: string) => {
    onSelectPage?.(id)
    if (selectedControlled === undefined) setSelectedInternal(id)
  }

  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const selected = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? pages[0],
    [pages, selectedId],
  )
  const index = pages.findIndex((p) => p.id === selected?.id)

  function goPrev() {
    if (index <= 0) return
    setSelected(pages[index - 1]!.id)
    setZoom(1)
    setRotation(0)
  }

  function goNext() {
    if (index < 0 || index >= pages.length - 1) return
    setSelected(pages[index + 1]!.id)
    setZoom(1)
    setRotation(0)
  }

  return (
    <>
      <aside className="re-right re-card flex flex-col gap-4 p-4">
        <div>
          <p className="text-[14px] font-semibold">{title}</p>
          <p className="re-caption mt-0.5">
            {pages.length} page{pages.length === 1 ? "" : "s"}
          </p>
        </div>

        {pages.length === 0 ? (
          <p className="re-caption py-8 text-center">No pages</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {pages.map((page) => {
              const active = page.id === selected?.id
              return (
                <button
                  key={page.id}
                  type="button"
                  className="re-thumb"
                  data-active={active}
                  style={!page.src ? { background: page.tone ?? "#1a2332" } : undefined}
                  onClick={() => {
                    setSelected(page.id)
                    setZoom(1)
                    setRotation(0)
                  }}
                >
                  {page.src ? (
                    <img src={page.src} alt={page.label} />
                  ) : (
                    <div className="flex h-full items-end p-2">
                      <span className="re-caption text-[11px] text-white/70">{page.label}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="re-btn re-btn-sm"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            className="re-btn re-btn-sm"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            className="re-btn re-btn-sm"
            aria-label="Rotate"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="size-3.5" />
          </button>
          <button
            type="button"
            className="re-btn re-btn-sm ml-auto"
            disabled={!selected}
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="size-3.5" />
            Fullscreen
          </button>
        </div>

        <div className="re-preview">
          {selected?.src ? (
            <div className="flex h-[220px] w-full items-center justify-center overflow-auto p-3">
              <img
                src={selected.src}
                alt={selected.label}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              />
            </div>
          ) : (
            <div
              className="flex h-[220px] w-full items-center justify-center transition-transform duration-200"
              style={{
                background: selected?.tone ?? "#1a2332",
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <p className="re-caption">{selected?.label ?? "Preview"}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            className={cn("re-btn re-btn-sm re-btn-ghost", index <= 0 && "opacity-40")}
            onClick={goPrev}
            disabled={index <= 0}
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <span className="re-caption">
            {index >= 0 ? index + 1 : 0} / {pages.length}
          </span>
          <button
            type="button"
            className={cn(
              "re-btn re-btn-sm re-btn-ghost",
              (index < 0 || index >= pages.length - 1) && "opacity-40",
            )}
            onClick={goNext}
            disabled={index < 0 || index >= pages.length - 1}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </aside>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[95vh] w-[min(96vw,1100px)] max-w-none overflow-hidden border-[color:var(--re-border)] bg-[#0b0d10] p-5 sm:rounded-[16px]">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
            <div>
              <DialogTitle className="font-[Inter,sans-serif]">{selected?.label ?? "Notebook page"}</DialogTitle>
              <DialogDescription>Inspect the original notebook page.</DialogDescription>
            </div>
            <button type="button" className="re-btn re-btn-sm" onClick={() => setFullscreen(false)}>
              <Minimize2 className="size-3.5" />
            </button>
          </DialogHeader>
          <div className="max-h-[78vh] overflow-auto rounded-[16px] border border-[color:var(--re-border)] bg-[#0a0c0f]">
            <div
              className="flex min-h-[60vh] items-center justify-center p-6 transition-transform duration-200"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center top" }}
            >
              {selected?.src ? (
                <img src={selected.src} alt={selected.label} className="max-w-full rounded-lg" />
              ) : (
                <div
                  className="flex h-80 w-56 items-center justify-center rounded-[12px]"
                  style={{ background: selected?.tone ?? "#1a2332" }}
                >
                  <p className="re-caption">{selected?.label}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
