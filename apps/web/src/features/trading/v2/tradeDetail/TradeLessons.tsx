import { Lightbulb } from "lucide-react"
import { FormattedJournalBody } from "@/features/trading/v2/components/ArticleRenderer"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"

export function TradeLessons({ lesson }: { lesson: string }) {
  if (!lesson.trim()) return null
  return (
    <CollapsibleSection
      title={
        <>
          <Lightbulb size={14} strokeWidth={1.75} />
          Lesson Learned
        </>
      }
      defaultOpen
      className="td-section td-section--collapse"
    >
      <div className="td-lesson">
        <div className="td-lesson__icon" aria-hidden>
          <Lightbulb size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="td-lesson__body">
            <FormattedJournalBody text={lesson} />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
