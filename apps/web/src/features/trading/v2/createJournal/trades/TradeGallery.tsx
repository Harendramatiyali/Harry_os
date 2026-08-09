import { ImagePlus, X } from "lucide-react"
import { useRef, useState, type ChangeEvent, type DragEvent } from "react"

import { AuthAttachmentThumb } from "@/features/trading/v2/components/AuthAttachmentThumb"
import type { ScreenshotItem } from "@/features/trading/v2/createJournal/trades/tradeTypes"

export function TradeGallery({
  screenshots,
  onChange,
}: {
  screenshots: ScreenshotItem[]
  onChange: (next: ScreenshotItem[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropActive, setDropActive] = useState(false)
  const depth = useRef(0)

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (!list.length) return
    const added: ScreenshotItem[] = list.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      file,
    }))
    onChange([...screenshots, ...added])
  }

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ""
  }

  return (
    <div className="tr-mini-card">
      <div className="tr-mini-title-row">
        <h4 className="tr-mini-title">Screenshots</h4>
        <button type="button" className="cj-btn cj-btn-ghost" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={14} /> Add
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onInput} />
      </div>
      <div
        className="tr-gallery-drop"
        data-active={dropActive}
        onDragEnter={(e: DragEvent) => {
          e.preventDefault()
          depth.current += 1
          setDropActive(true)
        }}
        onDragLeave={(e: DragEvent) => {
          e.preventDefault()
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setDropActive(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          depth.current = 0
          setDropActive(false)
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
        }}
      >
        {screenshots.length === 0 ? (
          <p className="tv2-caption">Drag &amp; drop charts here, or click Add.</p>
        ) : (
          <div className="tr-gallery-grid">
            {screenshots.map((s) => (
              <div key={s.id} className="tr-gallery-item">
                {s.attachmentId ? (
                  <AuthAttachmentThumb
                    attachmentId={s.attachmentId}
                    label={s.caption || s.name}
                    className="tr-gallery-thumb"
                  />
                ) : (
                  <img src={s.previewUrl} alt={s.caption || s.name} className="tr-gallery-thumb" />
                )}
                <input
                  className="cj-input tr-gallery-caption"
                  value={s.caption}
                  placeholder="Caption"
                  onChange={(e) =>
                    onChange(
                      screenshots.map((x) => (x.id === s.id ? { ...x, caption: e.target.value } : x)),
                    )
                  }
                />
                <button
                  type="button"
                  className="tr-gallery-remove"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => onChange(screenshots.filter((x) => x.id !== s.id))}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
