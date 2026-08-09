import { Camera } from "lucide-react"
import { AuthAttachmentThumb } from "@/features/trading/v2/components/AuthAttachmentThumb"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"
import type { TradeDetailScreenshot } from "@/features/trading/v2/tradeDetail/types"

export function TradeScreenshots({ shots }: { shots: TradeDetailScreenshot[] }) {
  if (!shots.length) return null
  return (
    <CollapsibleSection
      title={
        <>
          <Camera size={14} strokeWidth={1.75} />
          Screenshots
        </>
      }
      subtitle={`${shots.length} image${shots.length === 1 ? "" : "s"}`}
      defaultOpen={false}
      className="td-section td-section--collapse"
    >
      <div className="td-shots">
        {shots.map((s) => (
          <AuthAttachmentThumb
            key={s.id}
            attachmentId={s.attachmentId}
            label={s.label}
            status={s.status}
            className="td-shot"
          />
        ))}
      </div>
    </CollapsibleSection>
  )
}
