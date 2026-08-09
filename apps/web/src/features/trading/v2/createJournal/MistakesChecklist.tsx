import { useState } from "react"
import { Plus } from "lucide-react"

import type { MistakeItem } from "@/features/trading/v2/createJournal/draftState"

function newCustomId() {
  try {
    return `custom_${crypto.randomUUID().slice(0, 8)}`
  } catch {
    return `custom_${Date.now().toString(36)}`
  }
}

export function MistakesChecklist({
  mistakes,
  onChange,
  notesPlaceholder = "What went wrong, why it happened, and what you’ll do differently…",
}: {
  mistakes: MistakeItem[]
  onChange: (next: MistakeItem[]) => void
  notesPlaceholder?: string
}) {
  const [customLabel, setCustomLabel] = useState("")
  const [customSeverity, setCustomSeverity] = useState<MistakeItem["severity"]>("medium")

  const checked = mistakes.filter((m) => m.checked)

  const toggle = (id: string) => {
    onChange(mistakes.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)))
  }

  const patch = (id: string, next: Partial<MistakeItem>) => {
    onChange(mistakes.map((m) => (m.id === id ? { ...m, ...next } : m)))
  }

  const addCustom = () => {
    const label = customLabel.trim()
    if (!label) return
    const exists = mistakes.some((m) => m.label.toLowerCase() === label.toLowerCase())
    if (exists) {
      onChange(
        mistakes.map((m) =>
          m.label.toLowerCase() === label.toLowerCase() ? { ...m, checked: true } : m,
        ),
      )
      setCustomLabel("")
      return
    }
    onChange([
      ...mistakes,
      {
        id: newCustomId(),
        label,
        checked: true,
        notes: "",
        severity: customSeverity,
        custom: true,
      },
    ])
    setCustomLabel("")
    setCustomSeverity("medium")
  }

  return (
    <div className="cj-mistakes-editor">
      <p className="cj-mistakes-editor__hint">
        Tap tags that applied today, then write a note under each one.
      </p>

      <div className="cj-mistake-chips" role="group" aria-label="Mistake tags">
        {mistakes.map((m) => (
          <button
            key={m.id}
            type="button"
            className="cj-mistake-chip"
            data-checked={m.checked}
            data-severity={m.severity}
            onClick={() => toggle(m.id)}
            aria-pressed={m.checked}
          >
            <span className="cj-mistake-chip__mark" aria-hidden>
              {m.checked ? "✓" : ""}
            </span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="trw-custom-mistake">
        <input
          className="cj-input"
          placeholder="Custom mistake label…"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            addCustom()
          }}
        />
        <select
          className="cj-select"
          value={customSeverity}
          onChange={(e) => setCustomSeverity(e.target.value as MistakeItem["severity"])}
          aria-label="Severity"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="button"
          className="cj-btn cj-btn-ghost"
          onClick={addCustom}
          disabled={!customLabel.trim()}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {checked.length ? (
        <div className="cj-mistake-notes-list">
          {checked.map((m) => (
            <div key={m.id} className="cj-mistake-note-card" data-severity={m.severity}>
              <div className="cj-mistake-note-card__head">
                <strong>{m.label}</strong>
                <select
                  className="cj-select"
                  value={m.severity}
                  onChange={(e) =>
                    patch(m.id, { severity: e.target.value as MistakeItem["severity"] })
                  }
                  aria-label={`${m.label} severity`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <textarea
                className="cj-mistake-notes"
                value={m.notes}
                onChange={(e) => patch(m.id, { notes: e.target.value })}
                placeholder={notesPlaceholder}
                rows={4}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="cj-mistake-notes-empty">
          Select at least one mistake tag above to start writing notes.
        </div>
      )}
    </div>
  )
}
