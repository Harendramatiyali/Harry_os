import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { ReviewSectionCard } from "@/features/trading/v2/createJournal/trades/ReviewSectionCard"
import {
  MOOD_OPTIONS,
  type TradePsychology,
} from "@/features/trading/v2/createJournal/trades/tradeTypes"

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="trw-slider">
      <span className="trw-slider-label">
        {label}
        <strong>{value}/10</strong>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function TradePsychology({
  tradeId,
  value,
  onChange,
}: {
  tradeId: string
  value: TradePsychology
  onChange: (next: TradePsychology) => void
}) {
  return (
    <ReviewSectionCard id={`${tradeId}-psychology`} title="Psychology">
      <p className="tr-field-label" style={{ marginBottom: 8 }}>
        Mood
      </p>
      <div className="trw-mood-row">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.id}
            type="button"
            className="trw-mood"
            data-active={value.mood === m.id}
            onClick={() => onChange({ ...value, mood: value.mood === m.id ? "" : m.id })}
          >
            <span aria-hidden>{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
      <div className="trw-sliders">
        <Slider
          label="Confidence"
          value={value.confidence}
          onChange={(n) => onChange({ ...value, confidence: n })}
        />
        <Slider
          label="Discipline"
          value={value.discipline}
          onChange={(n) => onChange({ ...value, discipline: n })}
        />
        <Slider
          label="Patience"
          value={value.patience}
          onChange={(n) => onChange({ ...value, patience: n })}
        />
        <Slider
          label="Execution Focus"
          value={value.executionFocus}
          onChange={(n) => onChange({ ...value, executionFocus: n })}
        />
      </div>
      <p className="tr-field-label" style={{ margin: "12px 0 8px" }}>
        Emotion Notes
      </p>
      <MarkdownEditor
        fieldId={`${tradeId}-psychology`}
        fieldName="Psychology"
        fieldDescription="Turn emotional and discipline notes into polished journal prose without inventing feelings."
        value={value.emotionNotes}
        onChange={(emotionNotes) => onChange({ ...value, emotionNotes })}
        placeholder="How did you feel before, during, and after the trade?"
        minHeight={120}
      />
    </ReviewSectionCard>
  )
}
