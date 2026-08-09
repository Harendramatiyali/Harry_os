import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Save, Share2, Star, Trash2, X } from "lucide-react"

import type { JournalDay, JournalTrade } from "@/features/trading/types"

export type JournalEditDraft = {
  title: string
  day_bias: string
  day_result: string
  day_pnl: string
  daily_rating: string
  overall_grade: string
  primary_instrument: string
  market: string
  sections: Array<{ id: string; heading: string; body: string; key: string }>
  trades: Array<{
    id: string
    instrument: string
    direction: string
    quantity: string
    entry_price: string
    exit_price: string
    stop_price: string
    result: string
    pnl: string
    setup: string
    grade: string
    sections: Array<{ id: string; heading: string; body: string; key: string }>
  }>
}

function str(v: string | number | null | undefined): string {
  if (v == null) return ""
  return String(v)
}

export function dayToDraft(day: JournalDay): JournalEditDraft {
  return {
    title: str(day.title),
    day_bias: str(day.day_bias),
    day_result: str(day.day_result),
    day_pnl: str(day.day_pnl ?? ""),
    daily_rating: str(day.daily_rating ?? ""),
    overall_grade: str(day.overall_grade),
    primary_instrument: str(day.primary_instrument),
    market: str(day.market),
    sections: (day.sections ?? []).map((s) => ({
      id: s.id,
      heading: s.heading_original || s.section_key,
      body: s.body_markdown || "",
      key: s.section_key,
    })),
    trades: (day.trades ?? [])
      .slice()
      .sort((a, b) => a.trade_index - b.trade_index)
      .map((t: JournalTrade) => ({
        id: t.id,
        instrument: str(t.instrument),
        direction: str(t.direction || "long"),
        quantity: str(t.quantity ?? ""),
        entry_price: str(t.entry_price ?? ""),
        exit_price: str(t.exit_price ?? ""),
        stop_price: str(t.stop_price ?? ""),
        result: str(t.result),
        pnl: str(t.pnl ?? ""),
        setup: str(t.setup),
        grade: str(t.grade),
        sections: (t.sections ?? []).map((s) => ({
          id: s.id,
          heading: s.heading_original || s.section_key,
          body: s.body_markdown || "",
          key: s.section_key,
        })),
      })),
  }
}

export function draftToPayload(draft: JournalEditDraft): Record<string, unknown> {
  const num = (v: string) => {
    const t = v.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  return {
    title: draft.title.trim() || null,
    day_bias: draft.day_bias.trim() || null,
    day_result: draft.day_result.trim() || null,
    day_pnl: num(draft.day_pnl),
    daily_rating: num(draft.daily_rating),
    overall_grade: draft.overall_grade.trim() || null,
    primary_instrument: draft.primary_instrument.trim() || null,
    market: draft.market.trim() || null,
    sections: draft.sections.map((s) => ({
      id: s.id,
      body_markdown: s.body,
      heading_original: s.heading || null,
    })),
    trades: draft.trades.map((t) => ({
      id: t.id,
      instrument: t.instrument.trim() || null,
      direction: t.direction || null,
      quantity: num(t.quantity),
      entry_price: num(t.entry_price),
      exit_price: num(t.exit_price),
      stop_price: num(t.stop_price),
      result: t.result.trim() || null,
      pnl: num(t.pnl),
      setup: t.setup.trim() || null,
      grade: t.grade.trim() || null,
      sections: t.sections.map((s) => ({
        id: s.id,
        body_markdown: s.body,
        heading_original: s.heading || null,
      })),
    })),
  }
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`tv2-field ${className}`}>
      <span className="tv2-field-label">{label}</span>
      {children}
    </label>
  )
}

export function JournalEditForm({
  draft,
  onChange,
  onDeleteTrade,
  deletingTradeId,
}: {
  draft: JournalEditDraft
  onChange: (next: JournalEditDraft) => void
  onDeleteTrade?: (tradeId: string) => void
  deletingTradeId?: string | null
}) {
  const setDay = <K extends keyof JournalEditDraft>(key: K, value: JournalEditDraft[K]) => {
    onChange({ ...draft, [key]: value })
  }

  const setTrade = (tradeId: string, patch: Partial<JournalEditDraft["trades"][number]>) => {
    onChange({
      ...draft,
      trades: draft.trades.map((t) => (t.id === tradeId ? { ...t, ...patch } : t)),
    })
  }

  const addTrade = () => {
    onChange({
      ...draft,
      trades: [
        ...draft.trades,
        {
          id: crypto.randomUUID(),
          instrument: "",
          direction: "long",
          quantity: "1",
          entry_price: "",
          exit_price: "",
          stop_price: "",
          result: "",
          pnl: "",
          setup: "",
          grade: "",
          sections: [],
        },
      ],
    })
  }

  const setTradeSection = (tradeId: string, sectionId: string, body: string) => {
    onChange({
      ...draft,
      trades: draft.trades.map((t) =>
        t.id !== tradeId
          ? t
          : {
              ...t,
              sections: t.sections.map((s) => (s.id === sectionId ? { ...s, body } : s)),
            },
      ),
    })
  }

  const setSection = (sectionId: string, body: string) => {
    onChange({
      ...draft,
      sections: draft.sections.map((s) => (s.id === sectionId ? { ...s, body } : s)),
    })
  }

  return (
    <div className="tv2-edit-form space-y-6">
      <div className="tv2-edit-banner" role="status">
        Editing journal — changes are not saved until you click Save.
      </div>

      <section className="space-y-3">
        <h3 className="tv2-h3">Session</h3>
        <div className="tv2-field-grid">
          <Field label="Title" className="sm:col-span-2">
            <input
              className="tv2-field-input"
              value={draft.title}
              onChange={(e) => setDay("title", e.target.value)}
            />
          </Field>
          <Field label="Primary instrument">
            <input
              className="tv2-field-input"
              value={draft.primary_instrument}
              onChange={(e) => setDay("primary_instrument", e.target.value)}
            />
          </Field>
          <Field label="Market">
            <input
              className="tv2-field-input"
              value={draft.market}
              onChange={(e) => setDay("market", e.target.value)}
            />
          </Field>
          <Field label="Day bias">
            <input
              className="tv2-field-input"
              value={draft.day_bias}
              onChange={(e) => setDay("day_bias", e.target.value)}
              placeholder="Bullish / Bearish / Neutral"
            />
          </Field>
          <Field label="Day result">
            <input
              className="tv2-field-input"
              value={draft.day_result}
              onChange={(e) => setDay("day_result", e.target.value)}
            />
          </Field>
          <Field label="Day P&L (₹)">
            <input
              className="tv2-field-input"
              type="number"
              step="0.01"
              value={draft.day_pnl}
              onChange={(e) => setDay("day_pnl", e.target.value)}
            />
          </Field>
          <Field label="Daily rating">
            <input
              className="tv2-field-input"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={draft.daily_rating}
              onChange={(e) => setDay("daily_rating", e.target.value)}
            />
          </Field>
          <Field label="Overall grade">
            <select
              className="tv2-field-input"
              value={draft.overall_grade}
              onChange={(e) => setDay("overall_grade", e.target.value)}
            >
              <option value="">—</option>
              {["A+", "A", "A-", "B+", "B", "B-", "C", "D", "F"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {draft.trades.map((trade, idx) => (
        <section key={trade.id} className="tv2-edit-trade space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="tv2-h3">Trade {idx + 1}</h3>
            {onDeleteTrade ? (
              <button
                type="button"
                className="tv2-btn tv2-btn-sm"
                style={{ color: "#f87171", borderColor: "rgba(248, 113, 113, 0.35)" }}
                disabled={deletingTradeId === trade.id}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete trade ${trade.instrument || idx + 1}? This removes it from the journal and trade log.`,
                    )
                  ) {
                    onDeleteTrade(trade.id)
                  }
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {deletingTradeId === trade.id ? "Deleting…" : "Delete trade"}
              </button>
            ) : null}
          </div>
          <div className="tv2-field-grid">
            <Field label="Instrument" className="sm:col-span-2">
              <input
                className="tv2-field-input"
                value={trade.instrument}
                onChange={(e) => setTrade(trade.id, { instrument: e.target.value })}
                placeholder="NIFTY 24600 PE"
              />
            </Field>
            <Field label="Direction">
              <select
                className="tv2-field-input"
                value={trade.direction}
                onChange={(e) => setTrade(trade.id, { direction: e.target.value })}
              >
                <option value="long">Buy / Long</option>
                <option value="short">Sell / Short</option>
              </select>
            </Field>
            <Field label="Quantity">
              <input
                className="tv2-field-input"
                type="number"
                step="1"
                min="0"
                value={trade.quantity}
                onChange={(e) => setTrade(trade.id, { quantity: e.target.value })}
              />
            </Field>
            <Field label="Entry price">
              <input
                className="tv2-field-input"
                type="number"
                step="0.01"
                value={trade.entry_price}
                onChange={(e) => setTrade(trade.id, { entry_price: e.target.value })}
              />
            </Field>
            <Field label="Exit price">
              <input
                className="tv2-field-input"
                type="number"
                step="0.01"
                value={trade.exit_price}
                onChange={(e) => setTrade(trade.id, { exit_price: e.target.value })}
              />
            </Field>
            <Field label="Stop loss">
              <input
                className="tv2-field-input"
                type="number"
                step="0.01"
                value={trade.stop_price}
                onChange={(e) => setTrade(trade.id, { stop_price: e.target.value })}
              />
            </Field>
            <Field label="P&L (₹)">
              <input
                className="tv2-field-input"
                type="number"
                step="0.01"
                value={trade.pnl}
                onChange={(e) => setTrade(trade.id, { pnl: e.target.value })}
              />
            </Field>
            <Field label="Setup">
              <input
                className="tv2-field-input"
                value={trade.setup}
                onChange={(e) => setTrade(trade.id, { setup: e.target.value })}
              />
            </Field>
            <Field label="Result">
              <input
                className="tv2-field-input"
                value={trade.result}
                onChange={(e) => setTrade(trade.id, { result: e.target.value })}
              />
            </Field>
            <Field label="Grade">
              <select
                className="tv2-field-input"
                value={trade.grade}
                onChange={(e) => setTrade(trade.id, { grade: e.target.value })}
              >
                <option value="">—</option>
                {["A+", "A", "A-", "B+", "B", "B-", "C", "D", "F"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {trade.sections.map((sec) => (
            <Field key={sec.id} label={sec.heading || sec.key} className="block">
              <textarea
                className="tv2-field-input tv2-field-textarea"
                rows={4}
                value={sec.body}
                onChange={(e) => setTradeSection(trade.id, sec.id, e.target.value)}
              />
            </Field>
          ))}
        </section>
      ))}

      <button type="button" className="tv2-btn tv2-btn-sm" onClick={addTrade}>
        + Add Trade
      </button>

      {draft.sections.length ? (
        <section className="space-y-3">
          <h3 className="tv2-h3">Day notes</h3>
          {draft.sections.map((sec) => (
            <Field key={sec.id} label={sec.heading || sec.key} className="block">
              <textarea
                className="tv2-field-input tv2-field-textarea"
                rows={5}
                value={sec.body}
                onChange={(e) => setSection(sec.id, e.target.value)}
              />
            </Field>
          ))}
        </section>
      ) : null}
    </div>
  )
}

export function WorkspaceToolbar({
  dateLabel,
  sourceBadge,
  favorite,
  canGoPrev,
  canGoNext,
  onPrevDay,
  onNextDay,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onShare,
}: {
  dateLabel: string
  sourceBadge?: string
  favorite?: boolean
  canGoPrev?: boolean
  canGoNext?: boolean
  onPrevDay?: () => void
  onNextDay?: () => void
  editing?: boolean
  onEdit?: () => void
  onSave?: () => void
  onCancel?: () => void
  saving?: boolean
  onShare?: () => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-ghost"
          aria-label="Previous trading day"
          disabled={!canGoPrev || editing}
          onClick={onPrevDay}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="tv2-caption min-w-[6.5rem] text-center font-medium text-[color:var(--tv2-fg)]">
          {dateLabel}
        </span>
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-ghost"
          aria-label="Next trading day"
          disabled={!canGoNext || editing}
          onClick={onNextDay}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        {sourceBadge ? <span className="tv2-badge tv2-badge-ai">{sourceBadge}</span> : null}
        {favorite ? (
          <Star
            className="size-3.5"
            aria-label="Favorited"
            style={{ color: "var(--tv2-amber)", fill: "var(--tv2-amber)" }}
          />
        ) : null}
        {editing ? <span className="tv2-badge tv2-badge-amber">Editing</span> : null}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              className="tv2-btn tv2-btn-sm"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="size-3.5" aria-hidden />
              Cancel
            </button>
            <button
              type="button"
              className="tv2-btn tv2-btn-sm tv2-btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              <Save className="size-3.5" aria-hidden />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="tv2-btn tv2-btn-sm" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </button>
            <button type="button" className="tv2-btn tv2-btn-sm" onClick={onShare}>
              <Share2 className="size-3.5" aria-hidden />
              Share
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Hook helpers kept here for the connected layout */
export function useJournalDayNeighbors(
  days: Array<{ id: string; journal_date: string }>,
  selectedId: string | null,
) {
  return useMemo(() => {
    const asc = [...days].sort((a, b) => a.journal_date.localeCompare(b.journal_date))
    const idx = selectedId ? asc.findIndex((d) => d.id === selectedId) : -1
    return {
      prevDay: idx > 0 ? asc[idx - 1]! : null,
      nextDay: idx >= 0 && idx < asc.length - 1 ? asc[idx + 1]! : null,
    }
  }, [days, selectedId])
}

export function useEditableDraft(day: JournalDay | undefined, editing: boolean) {
  const [draft, setDraft] = useState<JournalEditDraft | null>(null)

  useEffect(() => {
    if (editing && day) {
      setDraft(dayToDraft(day))
    }
    if (!editing) {
      setDraft(null)
    }
  }, [editing, day])

  return { draft, setDraft }
}
