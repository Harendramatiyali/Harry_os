import { Plus } from "lucide-react"

import { AuthAttachmentThumb } from "@/features/trading/v2/components/AuthAttachmentThumb"

export function ImageGallery({
  images,
  showAdd = true,
  onAdd,
}: {
  images: { id: string; label: string; tone?: string; src?: string; attachmentId?: string; status?: string }[]
  showAdd?: boolean
  onAdd?: () => void
}) {
  if (!images.length && !showAdd) {
    return <p className="tv2-caption">No screenshots attached to this journal.</p>
  }

  return (
    <div className="flex flex-wrap gap-3 pb-1">
      {images.map((img) =>
        img.attachmentId ? (
          <AuthAttachmentThumb
            key={img.id}
            attachmentId={img.attachmentId}
            label={img.label}
            status={img.status}
          />
        ) : (
          <div
            key={img.id}
            className="tv2-thumb tv2-thumb-lg"
            style={!img.src ? { background: img.tone ?? "#1a2332" } : undefined}
          >
            {img.src ? (
              <img src={img.src} alt={img.label} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-end p-2">
                <span className="tv2-caption text-[10px] text-white/60">{img.label}</span>
              </div>
            )}
          </div>
        ),
      )}
      {showAdd ? (
        <button
          type="button"
          className="tv2-thumb tv2-thumb-lg flex items-center justify-center border-dashed text-[color:var(--tv2-muted)]"
          onClick={onAdd}
          aria-label="Add image"
        >
          <Plus className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
