import { ChevronLeft } from "lucide-react"

export function ReviewBottomBar({
  onBack,
  onKeepForLater,
  onAddToHarryOs,
  primaryLabel = "Add To Harry OS",
  keepLabel = "Keep For Later",
  busy = false,
}: {
  onBack?: () => void
  onKeepForLater?: () => void
  onAddToHarryOs?: () => void
  primaryLabel?: string
  keepLabel?: string
  busy?: boolean
}) {
  return (
    <div className="re-bottom-bar">
      <button type="button" className="re-btn" onClick={onBack} disabled={busy}>
        <ChevronLeft className="size-4" />
        Back
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="re-btn" onClick={onKeepForLater} disabled={busy}>
          {keepLabel}
        </button>
        <button
          type="button"
          className="re-btn re-btn-primary"
          onClick={onAddToHarryOs}
          disabled={busy}
        >
          {busy ? "Saving…" : primaryLabel}
        </button>
      </div>
    </div>
  )
}
