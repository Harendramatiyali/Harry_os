import { useEffect, useRef, useState } from "react"

import { useAuthStore } from "@/features/auth/store"
import { tradingApi } from "@/features/trading/api"
import { cn } from "@/shared/lib/utils"

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(blob)
  })
}

/** Authenticated journal attachment thumbnail — lazy-loads when visible. */
export function AuthAttachmentThumb({
  attachmentId,
  label,
  status,
  className,
}: {
  attachmentId: string
  label: string
  status?: string
  className?: string
}) {
  const token = useAuthStore((s) => s.accessToken)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const canFetch = (!status || status === "copied") && visible

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "120px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!token || !canFetch) return
    let cancelled = false
    setError(null)
    setSrc(null)
    tradingApi
      .fetchJournalAttachmentBlob(attachmentId, token)
      .then((blob) => {
        if (!blob.type.startsWith("image/") && blob.size < 32) {
          throw new Error("Not an image")
        }
        return blobToDataUrl(blob)
      })
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed")
      })
    return () => {
      cancelled = true
    }
  }, [attachmentId, token, canFetch])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false)
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [lightbox])

  if (status && status !== "copied") {
    return (
      <div
        ref={rootRef}
        className={cn("tv2-thumb tv2-thumb-lg", className)}
        title={label}
        role="img"
        aria-label={`${label}: ${status === "missing" ? "missing in vault" : "sync media required"}`}
      >
        <div className="flex h-full flex-col justify-end gap-0.5 bg-[#1a2332] p-2">
          <span className="tv2-caption line-clamp-2 text-[10px] text-white/70">{label}</span>
          <span className="text-[9px] text-amber-300/90">
            {status === "missing" ? "Missing in vault" : "Sync media"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      <button
        type="button"
        className={cn("tv2-thumb tv2-thumb-lg text-left", className)}
        aria-label={src ? `Open screenshot ${label}` : `Screenshot ${label}`}
        disabled={!src}
        onClick={() => src && setLightbox(true)}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : error ? (
          <div className="flex h-full items-end bg-[#2a1518] p-2">
            <span className="tv2-caption text-[10px] text-rose-300/80">{error}</span>
          </div>
        ) : (
          <div className="flex h-full items-end bg-[#1a2332] p-2">
            <span className="tv2-caption text-[10px] text-white/60">
              {visible ? "Loading…" : "…"}
            </span>
          </div>
        )}
      </button>
      {lightbox && src ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="tv2-btn tv2-btn-sm absolute top-4 right-4"
            onClick={() => setLightbox(false)}
          >
            Close
          </button>
          <img
            src={src}
            alt={label}
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  )
}
