import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  AlertTriangle,
  BookMarked,
  Brain,
  Check,
  Flame,
  Lightbulb,
  Pin,
  Sparkles,
  Star,
  Target,
} from "lucide-react"
import type {
  CoachLessonItem,
  CoachMistakeItem,
  LearningCoachModel,
} from "@/features/trading/v2/learningCoach/types"
import { cn } from "@/shared/lib/utils"
import "@/features/trading/v2/learningCoach/learningCoach.css"

type SortKey = "severity" | "frequency" | "impact"

function stars(n: number) {
  return "★".repeat(Math.max(1, Math.min(5, n))) + "☆".repeat(Math.max(0, 5 - n))
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function BigMistakeCard({ item }: { item: CoachMistakeItem }) {
  return (
    <section className="lc-card lc-card--hero-mistake" id="lc-biggest-mistake">
      <p className="lc-card__kicker lc-card__kicker--rose">
        <Flame size={14} strokeWidth={1.75} />
        Biggest Mistake Today
      </p>
      <h3 className="lc-hero-title">{item.title}</h3>
      <div className="lc-pills">
        <span className="lc-pill lc-pill--rose">{item.severity} severity</span>
        {item.tradeIndex != null ? (
          <span className="lc-pill lc-pill--slate">Trade #{item.tradeIndex}</span>
        ) : (
          <span className="lc-pill lc-pill--slate">{item.source}</span>
        )}
      </div>
      <p className="lc-hero-copy">{item.explanation}</p>
    </section>
  )
}

function BigLessonCard({ item }: { item: CoachLessonItem }) {
  return (
    <section className="lc-card lc-card--hero-lesson" id="lc-biggest-lesson">
      <p className="lc-card__kicker lc-card__kicker--amber">
        <Lightbulb size={14} strokeWidth={1.75} />
        Today&apos;s Biggest Lesson
      </p>
      <h3 className="lc-hero-title">{item.title}</h3>
      <p className="lc-hero-copy">{item.body}</p>
      <div className="lc-pills">
        <span className="lc-pill lc-pill--amber">{item.category}</span>
        <span className="lc-pill lc-pill--slate">
          <span className="lc-stars">{stars(item.importance)}</span>
        </span>
        <span className="lc-pill lc-pill--slate">{item.appliesTo}</span>
      </div>
    </section>
  )
}

function ImprovementChecklist({
  journalId,
  items,
}: {
  journalId: string
  items: LearningCoachModel["plan"]
}) {
  const storageKey = `harry-os.lc.plan.${journalId}`
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const stored = loadJson<Record<string, boolean>>(storageKey, {})
    const seed: Record<string, boolean> = { ...stored }
    for (const it of items) {
      if (seed[it.id] == null && it.suggestedDone) seed[it.id] = true
    }
    return seed
  })

  useEffect(() => {
    saveJson(storageKey, done)
  }, [storageKey, done])

  const completed = items.filter((it) => done[it.id]).length

  if (!items.length) return null

  return (
    <section className="lc-card" id="lc-plan">
      <div className="lc-section-head">
        <h3>
          <Target size={15} strokeWidth={1.75} />
          Improvement Plan
        </h3>
        <span className="lc-pill lc-pill--emerald">
          {completed} / {items.length} done
        </span>
      </div>
      <div className="lc-check">
        {items.map((it) => {
          const isDone = Boolean(done[it.id])
          return (
            <button
              key={it.id}
              type="button"
              className={cn("lc-check__row", isDone && "is-done")}
              onClick={() => setDone((prev) => ({ ...prev, [it.id]: !prev[it.id] }))}
            >
              <span className="lc-check__box" aria-hidden>
                {isDone ? "✓" : ""}
              </span>
              <span className="lc-check__label">{it.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function MistakeCards({
  items,
}: {
  items: CoachMistakeItem[]
}) {
  const [sort, setSort] = useState<SortKey>("severity")
  const sorted = useMemo(() => {
    const rank = { high: 3, medium: 2, low: 1 }
    return [...items].sort((a, b) => {
      if (sort === "frequency") return b.sessionCount - a.sessionCount
      if (sort === "impact") return (b.impact ?? -1) - (a.impact ?? -1)
      return rank[b.severity] - rank[a.severity]
    })
  }, [items, sort])

  if (!items.length) return null

  return (
    <section className="lc-card" id="lc-mistakes">
      <div className="lc-section-head">
        <h3>
          <AlertTriangle size={15} strokeWidth={1.75} />
          Mistakes
        </h3>
        <div className="lc-sort" role="group" aria-label="Sort mistakes">
          {(["severity", "frequency", "impact"] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={cn(sort === k && "is-active")}
              onClick={() => setSort(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="lc-grid">
        {sorted.map((m) => (
          <article key={m.id} className="lc-tile">
            <h4 className="lc-tile__title">{m.title}</h4>
            <div className="lc-pills">
              <span className={cn("lc-pill", m.severity === "high" ? "lc-pill--rose" : "lc-pill--amber")}>
                {m.severity}
              </span>
              <span className="lc-pill lc-pill--slate">{m.source}</span>
            </div>
            <div className="lc-tile__meta">
              <div>
                Frequency <strong>{m.sessionCount}× this session</strong>
              </div>
              <div>
                Impact <strong>{m.impactLabel}</strong>
              </div>
            </div>
            {m.body ? <p className="lc-toast">{m.body.slice(0, 140)}</p> : null}
            <div className="lc-tile__actions">
              <button type="button" className="lc-btn" disabled title="Coming soon">
                View Similar Trades
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function LessonCards({
  journalId,
  items,
}: {
  journalId: string
  items: CoachLessonItem[]
}) {
  const favKey = `harry-os.lc.fav.${journalId}`
  const pinKey = `harry-os.lc.pin.${journalId}`
  const [favs, setFavs] = useState(() => loadJson<Record<string, boolean>>(favKey, {}))
  const [pins, setPins] = useState(() => loadJson<Record<string, boolean>>(pinKey, {}))
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => saveJson(favKey, favs), [favKey, favs])
  useEffect(() => saveJson(pinKey, pins), [pinKey, pins])

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => Number(Boolean(pins[b.id])) - Number(Boolean(pins[a.id])))
  }, [items, pins])

  if (!items.length) return null

  return (
    <section className="lc-card" id="lc-lessons">
      <div className="lc-section-head">
        <h3>
          <BookMarked size={15} strokeWidth={1.75} />
          Lessons Learned
        </h3>
      </div>
      <div className="lc-grid">
        {ordered.map((l) => (
          <article key={l.id} className="lc-tile">
            <h4 className="lc-tile__title">{l.title}</h4>
            <p className="lc-toast">{l.body.slice(0, 180)}</p>
            <div className="lc-pills">
              <span className="lc-pill lc-pill--amber">{l.category}</span>
              <span className="lc-pill lc-pill--slate">
                <span className="lc-stars">{stars(l.importance)}</span>
              </span>
            </div>
            <div className="lc-tile__meta">
              <div>
                Applies to <strong>{l.appliesTo}</strong>
              </div>
              <div>
                Created <strong>{l.createdLabel}</strong>
              </div>
              <div>
                Source <strong>{l.source}</strong>
              </div>
            </div>
            <div className="lc-tile__actions">
              <button
                type="button"
                className="lc-btn lc-btn--ghost"
                onClick={() => setFavs((p) => ({ ...p, [l.id]: !p[l.id] }))}
              >
                <Star size={13} fill={favs[l.id] ? "currentColor" : "none"} />
                Favorite
              </button>
              <button
                type="button"
                className="lc-btn lc-btn--ghost"
                onClick={() => setPins((p) => ({ ...p, [l.id]: !p[l.id] }))}
              >
                <Pin size={13} />
                {pins[l.id] ? "Pinned" : "Pin"}
              </button>
              <button
                type="button"
                className="lc-btn"
                onClick={() => {
                  setToast(`“${l.title.slice(0, 48)}” queued for Rule Book (coming soon).`)
                  window.setTimeout(() => setToast(null), 2500)
                }}
              >
                <Check size={13} />
                Add to Rule Book
              </button>
            </div>
          </article>
        ))}
      </div>
      {toast ? <p className="lc-toast" style={{ marginTop: 12 }}>{toast}</p> : null}
    </section>
  )
}

function AICoachCard({ model }: { model: LearningCoachModel }) {
  return (
    <section className="lc-card lc-card--coach" id="lc-coach">
      <div className="lc-section-head">
        <h3>
          <Brain size={15} strokeWidth={1.75} />
          AI Coach
        </h3>
        <div className="lc-grade">
          <span>Overall Grade</span>
          <strong>{model.overallGrade}</strong>
        </div>
      </div>
      <div className="lc-score-grid">
        {model.scores.map((s) => (
          <div key={s.id} className="lc-score">
            <div className="lc-score__top">
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
            <div className="lc-score__track" aria-hidden>
              <div className="lc-score__fill" style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="lc-cols">
        <div>
          <h4>Top Strengths</h4>
          <ul>
            {model.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Top Weaknesses</h4>
          <ul>
            {model.weaknesses.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="lc-action">
        <h4>One Action for Tomorrow</h4>
        <p>{model.tomorrowAction}</p>
      </div>
      <p className="lc-note">
        <Sparkles size={13} style={{ display: "inline", marginRight: 6 }} />
        {model.coachNote}
      </p>
    </section>
  )
}

function LearningMemory({ items }: { items: LearningCoachModel["memory"] }) {
  if (!items.length) return null
  return (
    <section className="lc-card" id="lc-memory">
      <div className="lc-section-head">
        <h3>
          <Sparkles size={15} strokeWidth={1.75} />
          Learning Memory
        </h3>
        <span className="lc-pill lc-pill--slate">Session heuristic</span>
      </div>
      <div className="lc-memory">
        {items.map((m) => {
          const total = Math.max(1, m.seen)
          const appliedPct = (m.applied / total) * 100
          const ignoredPct = (m.ignored / total) * 100
          return (
            <div key={m.id} className="lc-memory__item">
              <p className="lc-memory__title">{m.title}</p>
              <div className="lc-memory__stats">
                <div className="lc-memory__stat">
                  <span>Seen</span>
                  <strong>{m.seen}</strong>
                </div>
                <div className="lc-memory__stat">
                  <span>Ignored</span>
                  <strong>{m.ignored}</strong>
                </div>
                <div className="lc-memory__stat">
                  <span>Applied</span>
                  <strong>{m.applied}</strong>
                </div>
                <div className="lc-memory__stat">
                  <span>Success</span>
                  <strong>{m.successRate != null ? `${m.successRate}%` : "—"}</strong>
                </div>
              </div>
              <div className="lc-bar" aria-hidden>
                <div className="lc-bar__applied" style={{ width: `${appliedPct}%` }} />
                <div className="lc-bar__ignored" style={{ width: `${ignoredPct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <p className="lc-toast" style={{ marginTop: 12 }}>
        Cross-month applied/ignored tracking ships with Rule Book events — session counts only for now.
      </p>
    </section>
  )
}

function MistakeHeatmap({ items }: { items: LearningCoachModel["heatmap"] }) {
  if (!items.length) return null
  return (
    <section className="lc-card" id="lc-heatmap">
      <div className="lc-section-head">
        <h3>
          <Flame size={15} strokeWidth={1.75} />
          Recurring Mistakes
        </h3>
      </div>
      <div className="lc-heat">
        {items.map((h) => (
          <div key={h.id} className="lc-heat__row">
            <span className="lc-heat__label">{h.label}</span>
            <div className="lc-heat__bar" aria-hidden>
              <div
                className="lc-heat__fill"
                  style={
                    {
                      width: `${Math.max(12, h.intensity * 100)}%`,
                      "--intensity": String(h.intensity),
                    } as CSSProperties
                  }
              />
            </div>
            <span className="lc-heat__count">{h.count}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LearningCoachDashboard({ model }: { model: LearningCoachModel }) {
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (model.empty) {
    return (
      <p className="lc-empty">
        No coaching content yet. Add Mistakes, Lessons, and Action Items in Edit Journal — this
        dashboard turns them into your session mentor.
      </p>
    )
  }

  return (
    <div className="lc-root">
      <header className="lc-header">
        <div>
          <p className="lc-header__eyebrow">Learning Coach</p>
          <h2 className="lc-header__title">{model.title}</h2>
          <p className="lc-header__sub">
            {model.dateLabel} · Your trading mentor for this session
          </p>
        </div>
        <nav className="lc-nav" aria-label="Learning sections">
          <button type="button" onClick={() => jump("lc-biggest-mistake")}>
            Mistake
          </button>
          <button type="button" onClick={() => jump("lc-biggest-lesson")}>
            Lesson
          </button>
          <button type="button" onClick={() => jump("lc-plan")}>
            Plan
          </button>
          <button type="button" onClick={() => jump("lc-coach")}>
            Coach
          </button>
        </nav>
      </header>

      {model.biggestMistake ? <BigMistakeCard item={model.biggestMistake} /> : null}
      {model.biggestLesson ? <BigLessonCard item={model.biggestLesson} /> : null}
      <ImprovementChecklist journalId={model.journalId} items={model.plan} />
      <MistakeCards items={model.mistakes} />
      <LessonCards journalId={model.journalId} items={model.lessons} />
      <AICoachCard model={model} />
      <LearningMemory items={model.memory} />
      <MistakeHeatmap items={model.heatmap} />
    </div>
  )
}
