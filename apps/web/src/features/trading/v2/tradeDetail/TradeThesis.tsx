import { BookOpen } from "lucide-react"
import { FormattedJournalBody } from "@/features/trading/v2/components/ArticleRenderer"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradeThesis({ thesis }: { thesis: string }) {
  if (!thesis.trim()) return null
  return (
    <CollapsibleSection
      title={
        <>
          <BookOpen size={14} strokeWidth={1.75} />
          Trade Thesis
        </>
      }
      defaultOpen
      className="td-section td-section--collapse"
    >
      <div className="td-prose-card">
        <FormattedJournalBody text={thesis} />
      </div>
    </CollapsibleSection>
  )
}
