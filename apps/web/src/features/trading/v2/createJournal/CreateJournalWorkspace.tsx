import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react"
import { flushSync } from "react-dom"
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  Bot,
  CalendarDays,
  CandlestickChart,
  Check,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import { useAuthStore } from "@/features/auth/store"
import { tradingApi } from "@/features/trading/api"
import { useJournalDay, useJournalDays, useTradingMutations } from "@/features/trading/hooks"
import { ApiError } from "@/shared/api/types"
import { AICoachPanel } from "@/features/trading/v2/createJournal/AICoachPanel"
import { MistakesChecklist } from "@/features/trading/v2/createJournal/MistakesChecklist"
import "@/features/trading/v2/createJournal/createJournal.css"
import {
  type BiasOption,
  type GradeOption,
  type JournalDraftState,
  type ScreenshotItem,
  type SessionOption,
  POPULAR_TAGS,
  computeProgress,
  createEmptyDraft,
  draftToApiPayload,
  formatJournalDateLong,
  todayISO,
} from "@/features/trading/v2/createJournal/draftState"
import { hydrateJournalDraft } from "@/features/trading/v2/createJournal/hydrateJournalDraft"
import { JournalProgress } from "@/features/trading/v2/createJournal/JournalProgress"
import {
  JournalTimeline,
  type TimelineFilter,
} from "@/features/trading/v2/createJournal/JournalTimeline"
import { MarkdownEditor } from "@/features/trading/v2/createJournal/MarkdownEditor"
import { TodaysTradesPanel } from "@/features/trading/v2/createJournal/trades"
import { toDec2 } from "@/features/trading/v2/createJournal/trades/tradeTypes"
import { AuthAttachmentThumb } from "@/features/trading/v2/components/AuthAttachmentThumb"
import "@/features/trading/v2/tradingV2.css"

function SectionCard({
  id,
  title,
  icon,
  children,
  aiAssist = true,
}: {
  id: string
  title: string
  icon: ReactNode
  children: ReactNode
  aiAssist?: boolean
}) {
  return (
    <section id={id} className="cj-card scroll-mt-4">
      <div className="cj-card-head">
        <h3 className="cj-card-title">
          {icon}
          {title}
        </h3>
        {aiAssist ? (
          <button type="button" className="cj-ai-assist">
            <Sparkles size={12} />
            Writing Copilot
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function CreateJournalWorkspace() {
  const navigate = useNavigate()
  const { journalId: routeId } = useParams<{ journalId?: string }>()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get("date")
  const mutations = useTradingMutations()

  const [draft, setDraft] = useState<JournalDraftState>(() =>
    createEmptyDraft(dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayISO()),
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Ready")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<TimelineFilter>("all")
  const [aiOpen, setAiOpen] = useState(false)
  const [dupDialog, setDupDialog] = useState<{ existingId: string; date: string } | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [persistDialog, setPersistDialog] = useState<
    | { kind: "confirm"; status: "draft" | "published" }
    | { kind: "success"; status: "draft" | "published"; nextPath?: string }
    | null
  >(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const dragDepth = useRef(0)
  const [dropActive, setDropActive] = useState(false)
  const hydratedId = useRef<string | null>(null)
  const autosaveTimer = useRef<number | null>(null)
  const dirtyRef = useRef(false)
  const allowLeaveRef = useRef(false)
  const savingRef = useRef(false)
  const pendingPersistRef = useRef<"draft" | "published" | null>(null)
  dirtyRef.current = dirty

  const listQuery = useJournalDays({})
  const detailQuery = useJournalDay(routeId ?? null)

  /** Clear dirty + allow the next navigation without the unsaved-changes blocker. */
  const navigateAllowLeave = useCallback(
    (to: string, opts?: { replace?: boolean }) => {
      allowLeaveRef.current = true
      flushSync(() => setDirty(false))
      navigate(to, opts)
      queueMicrotask(() => {
        allowLeaveRef.current = false
      })
    },
    [navigate],
  )

  const uploadPendingScreenshots = useCallback(
    async (journalId: string, current: JournalDraftState): Promise<JournalDraftState> => {
      const token = useAuthStore.getState().accessToken
      if (!token) return current

      let changed = false
      const uploadOne = async (
        shot: ScreenshotItem,
        tradeId?: string,
      ): Promise<ScreenshotItem> => {
        if (!shot.file || shot.attachmentId) return shot
        const att = await tradingApi.uploadJournalAttachment(journalId, shot.file, token, {
          caption: shot.caption || undefined,
          journalTradeId: tradeId,
        })
        changed = true
        return {
          ...shot,
          attachmentId: att.id,
          file: undefined,
        }
      }

      const screenshots: ScreenshotItem[] = []
      for (const shot of current.screenshots) {
        screenshots.push(await uploadOne(shot))
      }

      const trades = []
      for (const trade of current.trades) {
        const tradeShots: ScreenshotItem[] = []
        for (const shot of trade.screenshots) {
          tradeShots.push(await uploadOne(shot, trade.id))
        }
        trades.push({ ...trade, screenshots: tradeShots })
      }

      if (!changed) return current
      return { ...current, screenshots, trades }
    },
    [],
  )

  const patchDraft = useCallback((partial: Partial<JournalDraftState>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
    setDirty(true)
  }, [])

  useEffect(() => {
    if (!routeId || !detailQuery.data) return
    // Hydrate once per journal id — do not re-run after save (that wiped edits / status)
    if (hydratedId.current === detailQuery.data.id) return
    hydratedId.current = detailQuery.data.id
    setDraft(hydrateJournalDraft(detailQuery.data))
    setDirty(false)
    setBanner(null)
    setSaveLabel("Loaded")
  }, [routeId, detailQuery.data])

  // Reset hydration marker when leaving edit → new
  useEffect(() => {
    if (!routeId) hydratedId.current = null
  }, [routeId])

  const journals = useMemo(() => {
    let rows = [...(listQuery.data ?? [])]
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (j) =>
          j.journal_date.includes(q) ||
          (j.title || "").toLowerCase().includes(q) ||
          (j.overall_grade || "").toLowerCase().includes(q),
      )
    }
    if (filter === "favourites") rows = rows.filter((j) => j.is_favorite)
    if (filter === "winning") rows = rows.filter((j) => Number(j.day_pnl ?? 0) > 0)
    if (filter === "losing") rows = rows.filter((j) => Number(j.day_pnl ?? 0) < 0)
    return rows.sort((a, b) => b.journal_date.localeCompare(a.journal_date))
  }, [listQuery.data, query, filter])

  const { pct, items } = useMemo(() => computeProgress(draft), [draft])
  const canPersist = !routeId || Boolean(draft.journalId)

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowLeaveRef.current) return false
    if (!dirtyRef.current) return false
    return currentLocation.pathname !== nextLocation.pathname
  })
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current || !dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  const persist = useCallback(
    async (status: "draft" | "published", source: "manual" | "auto" = "manual") => {
      if (savingRef.current) {
        // Prefer publish over draft if a manual action arrives mid-save
        if (source === "manual") {
          const prev = pendingPersistRef.current
          pendingPersistRef.current =
            status === "published" || prev === "published" ? "published" : status
        }
        return null
      }
      if (routeId && !draft.journalId) {
        setBanner("Journal is still loading — try again in a moment.")
        return null
      }
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current)
        autosaveTimer.current = null
      }

      savingRef.current = true
      setSaving(true)
      setBanner(null)
      setSaveLabel(status === "published" ? "Publishing…" : "Saving…")
      try {
        const body = draftToApiPayload(draft, status)
        if (!draft.journalId) {
          try {
            const created = await mutations.createJournal.mutateAsync({
              journal_date: draft.journalDate,
              title: body.title,
              market: body.market,
              primary_instrument: body.primary_instrument,
              day_bias: body.day_bias,
              day_result: body.day_result,
              day_pnl: body.day_pnl,
              overall_grade: body.overall_grade,
              tags: body.tags,
              publish_status: status,
              workspace_meta_json: body.workspace_meta_json,
            })
            // Persist sections + trades (create endpoint only seeds empty day shell)
            const updated = await mutations.updateJournal.mutateAsync({
              id: created.id,
              body: { ...body, publish_status: status },
            })
            hydratedId.current = updated.id
            const hydrated = hydrateJournalDraft(updated)
            let merged: JournalDraftState | null = null
            setDraft((prev) => {
              merged = {
                ...hydrated,
                journalId: updated.id,
                publishStatus: status,
                // Keep live typing — don't replace prose fields from re-hydrate
                title: prev.title,
                marketContext: prev.marketContext,
                preMarketPlan: prev.preMarketPlan,
                tradingPlan: prev.tradingPlan,
                psychology: prev.psychology,
                lessons: prev.lessons,
                actionItems: prev.actionItems,
                mistakes: prev.mistakes,
                tags: prev.tags,
                bias: prev.bias,
                biasDetail: prev.biasDetail,
                session: prev.session,
                dayGrade: prev.dayGrade,
                instrumentFocus: prev.instrumentFocus,
                market: prev.market,
                netPnl: toDec2(Number(updated.day_pnl ?? 0)),
                screenshots: prev.screenshots,
                trades: hydrated.trades.map((serverTrade, i) => {
                  const local = prev.trades.find((t) => t.id === serverTrade.id) || prev.trades[i]
                  if (!local) return serverTrade
                  return {
                    ...serverTrade,
                    ...local,
                    id: serverTrade.id,
                    tradeIndex: serverTrade.tradeIndex,
                    sectionIds: serverTrade.sectionIds,
                    screenshots: local.screenshots,
                  }
                }),
                tradeCount: hydrated.trades.length,
              }
              return merged
            })
            if (!merged) return null
            try {
              merged = await uploadPendingScreenshots(updated.id, merged)
              setDraft(merged)
            } catch (uploadErr) {
              setBanner(
                uploadErr instanceof Error
                  ? `Saved, but screenshot upload failed: ${uploadErr.message}`
                  : "Saved, but screenshot upload failed",
              )
            }
            flushSync(() => setDirty(false))
            setLastSavedAt(new Date())
            setSaveLabel(status === "published" ? "Published" : "Draft saved")
            const editPath = `/trading/journals/${updated.id}/edit`
            if (source === "manual") {
              setPersistDialog({ kind: "success", status, nextPath: editPath })
            } else {
              navigateAllowLeave(editPath, { replace: true })
            }
            return updated
          } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
              const details = (err.details ?? {}) as { existing_id?: string }
              setDupDialog({
                existingId: details.existing_id || "",
                date: draft.journalDate,
              })
              setSaveLabel("Conflict")
              return null
            }
            throw err
          }
        }

        const updated = await mutations.updateJournal.mutateAsync({
          id: draft.journalId,
          body: { ...body, publish_status: status },
        })
        // Keep local writing state; sync trade ids/sections from server
        hydratedId.current = updated.id
        const hydrated = hydrateJournalDraft(updated)
        let merged: JournalDraftState | null = null
        setDraft((prev) => {
          merged = {
            ...hydrated,
            journalId: updated.id,
            publishStatus: status,
            title: prev.title,
            marketContext: prev.marketContext,
            preMarketPlan: prev.preMarketPlan,
            tradingPlan: prev.tradingPlan,
            psychology: prev.psychology,
            lessons: prev.lessons,
            actionItems: prev.actionItems,
            mistakes: prev.mistakes,
            tags: prev.tags,
            bias: prev.bias,
            biasDetail: prev.biasDetail,
            session: prev.session,
            dayGrade: prev.dayGrade,
            instrumentFocus: prev.instrumentFocus,
            market: prev.market,
            netPnl: toDec2(Number(updated.day_pnl ?? 0)),
            screenshots: prev.screenshots,
            trades: hydrated.trades.map((serverTrade, i) => {
              const local = prev.trades.find((t) => t.id === serverTrade.id) || prev.trades[i]
              if (!local) return serverTrade
              return {
                ...serverTrade,
                ...local,
                id: serverTrade.id,
                tradeIndex: serverTrade.tradeIndex,
                sectionIds: serverTrade.sectionIds,
                screenshots: local.screenshots.length ? local.screenshots : serverTrade.screenshots,
                review: local.review,
                psychology: local.psychology,
                mistakes: local.mistakes,
              }
            }),
            tradeCount: hydrated.trades.length,
          }
          return merged
        })
        if (!merged) return null
        try {
          merged = await uploadPendingScreenshots(updated.id, merged)
          setDraft(merged)
        } catch (uploadErr) {
          setBanner(
            uploadErr instanceof Error
              ? `Saved, but screenshot upload failed: ${uploadErr.message}`
              : "Saved, but screenshot upload failed",
          )
        }
        flushSync(() => setDirty(false))
        setLastSavedAt(new Date())
        setSaveLabel(status === "published" ? "Published" : "Draft saved")
        if (source === "manual") {
          setPersistDialog({ kind: "success", status })
        } else {
          setSaveLabel(status === "published" ? "Auto-saved · Published" : "Auto-saved")
        }
        return updated
      } catch (err) {
        const detail =
          err instanceof ApiError && err.details
            ? typeof err.details === "string"
              ? err.details
              : JSON.stringify(err.details)
            : null
        const message =
          err instanceof ApiError
            ? [err.message || `Save failed (${err.status})`, detail].filter(Boolean).join(" — ")
            : err instanceof Error
              ? err.message
              : "Save failed"
        setBanner(message)
        setSaveLabel("Save failed")
        console.error("Journal save failed", err)
        return null
      } finally {
        savingRef.current = false
        setSaving(false)
        const pending = pendingPersistRef.current
        pendingPersistRef.current = null
        if (pending) {
          queueMicrotask(() => {
            void persist(pending, "manual")
          })
        }
      }
    },
    [
      draft,
      mutations.createJournal,
      mutations.updateJournal,
      navigateAllowLeave,
      routeId,
      uploadPendingScreenshots,
    ],
  )

  useEffect(() => {
    if (!dirty) return
    if (persistDialog?.kind === "confirm") return
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(() => {
      // Keep published journals published; don't silently downgrade on autosave
      const status = draft.publishStatus === "published" ? "published" : "draft"
      void persist(status, "auto")
    }, 1800)
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    }
  }, [dirty, draft, persist, persistDialog?.kind])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        setPersistDialog({ kind: "confirm", status: "draft" })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const jumpTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const onNew = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard and start a new journal?")) {
      return
    }
    hydratedId.current = null
    setDraft(createEmptyDraft())
    setSaveLabel("Ready")
    navigateAllowLeave("/trading/journals/new")
  }

  const onSelectJournal = (id: string) => {
    if (id === routeId) return
    if (dirty && !window.confirm("You have unsaved changes. Leave this journal?")) return
    navigateAllowLeave(`/trading/journals/${id}/edit`)
  }

  const onDateChange = (value: string) => {
    patchDraft({ journalDate: value })
    const existing = (listQuery.data ?? []).find((j) => j.journal_date === value)
    if (existing && existing.id !== draft.journalId) {
      setDupDialog({ existingId: existing.id, date: value })
    }
  }

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (!list.length) return
    const next: ScreenshotItem[] = list.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      file,
    }))
    patchDraft({ screenshots: [...draft.screenshots, ...next] })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDropActive(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const toggleTag = (tag: string) => {
    const has = draft.tags.includes(tag)
    patchDraft({ tags: has ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag] })
  }

  return (
    <div className="trading-v2">
      <div className="cj-root">
        <JournalTimeline
          journals={journals}
          activeId={draft.journalId}
          query={query}
          filter={filter}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          onSelect={onSelectJournal}
          onNew={onNew}
        />

        <main className="cj-center">
          <div className="cj-topbar">
            <div>
              <p className="cj-crumb">
                Trading Journal &gt; <span>{draft.journalId ? "Edit Journal" : "New Journal"}</span>
              </p>
              <h1 className="cj-page-title">
                {draft.journalId ? "Edit Trading Journal" : "Create Trading Journal"}
              </h1>
              <p className="cj-page-sub">
                Write like a notebook — capture market context, psychology, mistakes and lessons in
                one calm workspace.
              </p>
            </div>
            <div className="cj-actions">
              <span
                className={
                  draft.publishStatus === "published" ? "cj-status-pill published" : "cj-status-pill"
                }
                title={lastSavedAt ? `Last saved ${lastSavedAt.toLocaleString()}` : "Not saved yet"}
              >
                {draft.journalId
                  ? draft.publishStatus === "published"
                    ? "Published"
                    : "Draft"
                  : "Unsaved"}
              </span>
              <button type="button" className="cj-btn cj-ai-toggle" onClick={() => setAiOpen(true)}>
                <Bot size={14} /> AI Coach
              </button>
              <button
                type="button"
                className="cj-btn cj-btn-ghost"
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm("You have unsaved changes. Leave this journal?")
                  ) {
                    return
                  }
                  navigateAllowLeave("/trading")
                }}
              >
                Cancel
              </button>
              {(routeId || draft.journalId) ? (
                <button
                  type="button"
                  className="cj-btn cj-btn-danger"
                  disabled={mutations.deleteJournal.isPending}
                  onClick={() => {
                    const id = routeId || draft.journalId
                    if (!id) return
                    if (
                      !window.confirm(
                        `Delete journal for ${formatJournalDateLong(draft.journalDate)}? This cannot be undone easily.`,
                      )
                    ) {
                      return
                    }
                    mutations.deleteJournal.mutate(id, {
                      onSuccess: () => {
                        navigateAllowLeave("/trading", { replace: true })
                      },
                      onError: (err) => {
                        setBanner(
                          err instanceof ApiError ? err.message : "Failed to delete journal",
                        )
                      },
                    })
                  }}
                >
                  <Trash2 size={14} />
                  {mutations.deleteJournal.isPending ? "Deleting…" : "Delete Journal"}
                </button>
              ) : null}
              <button
                type="button"
                className="cj-btn"
                disabled={saving || !canPersist}
                onClick={() => setPersistDialog({ kind: "confirm", status: "draft" })}
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button
                type="button"
                className="cj-btn cj-btn-primary"
                disabled={saving || !canPersist}
                onClick={() => setPersistDialog({ kind: "confirm", status: "published" })}
              >
                <Plus size={14} />
                {saving ? "Publishing…" : "Publish Journal"}
              </button>
            </div>
          </div>

          {banner ? (
            <p className="tv2-caption tv2-negative" role="alert">
              {banner}
            </p>
          ) : null}
          {routeId && detailQuery.isLoading ? (
            <p className="tv2-caption">Loading journal…</p>
          ) : null}
          {routeId && detailQuery.isError ? (
            <p className="tv2-caption tv2-negative" role="alert">
              Could not load this journal. Refresh and try again.
            </p>
          ) : null}

          <div className="cj-date-progress">
            <div className="cj-card">
              <label className="cj-field-label" htmlFor="cj-date">
                Journal Date
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CalendarDays size={16} color="var(--tv2-muted)" />
                <input
                  id="cj-date"
                  className="cj-input"
                  type="date"
                  value={draft.journalDate}
                  onChange={(e) => onDateChange(e.target.value)}
                />
              </div>
              <p className="tv2-caption" style={{ marginTop: 8 }}>
                {formatJournalDateLong(draft.journalDate)}
              </p>
            </div>
            <JournalProgress pct={pct} items={items} onJump={jumpTo} />
          </div>

          <SectionCard
            id="section-summary"
            title="Session Summary"
            icon={<CandlestickChart size={15} />}
            aiAssist={false}
          >
            <div className="cj-summary-grid">
              <div>
                <label className="cj-field-label">Market</label>
                <select
                  className="cj-select"
                  value={draft.market}
                  onChange={(e) => patchDraft({ market: e.target.value })}
                >
                  <option>NIFTY</option>
                  <option>BANKNIFTY</option>
                  <option>FINNIFTY</option>
                  <option>SENSEX</option>
                </select>
              </div>
              <div>
                <label className="cj-field-label">Instrument Focus</label>
                <input
                  className="cj-input"
                  value={draft.instrumentFocus}
                  onChange={(e) => patchDraft({ instrumentFocus: e.target.value })}
                />
              </div>
              <div>
                <label className="cj-field-label">Overall Bias</label>
                <select
                  className="cj-select"
                  value={draft.bias}
                  onChange={(e) => patchDraft({ bias: e.target.value as BiasOption })}
                >
                  <option value="">Select</option>
                  <option>Bullish</option>
                  <option>Bearish</option>
                  <option>Neutral</option>
                </select>
                {draft.bias ? (
                  <span
                    className="cj-bias-pill"
                    data-tone={
                      draft.bias === "Bearish" ? "bear" : draft.bias === "Neutral" ? "neutral" : "bull"
                    }
                    style={{ marginTop: 8 }}
                  >
                    {draft.bias}
                  </span>
                ) : null}
                {draft.biasDetail && draft.biasDetail.length > 20 ? (
                  <p className="tv2-caption" style={{ marginTop: 8, lineHeight: 1.45 }}>
                    {draft.biasDetail}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="cj-field-label">Trading Session</label>
                <select
                  className="cj-select"
                  value={draft.session}
                  onChange={(e) => patchDraft({ session: e.target.value as SessionOption })}
                >
                  <option>Normal</option>
                  <option>Expiry</option>
                  <option>High Volatility</option>
                  <option>News Day</option>
                </select>
              </div>
              <div>
                <label className="cj-field-label">Day Grade</label>
                <select
                  className="cj-select"
                  value={draft.dayGrade}
                  onChange={(e) => patchDraft({ dayGrade: e.target.value as GradeOption })}
                >
                  <option value="">Select</option>
                  {["A+", "A", "B+", "B", "C", "D", "F"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="cj-field-label">Net P&amp;L</label>
                <input
                  className="cj-input"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="+₹0.00"
                  value={draft.netPnl}
                  onChange={(e) => patchDraft({ netPnl: e.target.value })}
                  onBlur={() => {
                    if (!draft.netPnl.trim()) return
                    patchDraft({ netPnl: toDec2(draft.netPnl) })
                  }}
                />
              </div>
              <div>
                <label className="cj-field-label">Number of Trades</label>
                <input
                  className="cj-input"
                  type="number"
                  min={0}
                  value={draft.tradeCount}
                  onChange={(e) => patchDraft({ tradeCount: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </SectionCard>

          <TodaysTradesPanel
            trades={draft.trades}
            journalDate={draft.journalDate}
            onChange={(trades) => {
              const sum = trades.reduce((s, t) => {
                const p = Number(String(t.pnl || "").replace(/[₹,\s]/g, ""))
                const n = Number.isFinite(p) ? p : 0
                return s + n
              }, 0)
              patchDraft({
                trades,
                tradeCount: trades.length,
                netPnl: trades.length ? toDec2(sum) : draft.netPnl,
              })
            }}
            deletingId={
              mutations.deleteJournalTrade.isPending
                ? mutations.deleteJournalTrade.variables ?? null
                : null
            }
            onDeleteTrade={(id) => {
              const removeLocal = () => {
                const next = draft.trades
                  .filter((x) => x.id !== id)
                  .map((x, i) => ({ ...x, tradeIndex: i + 1 }))
                patchDraft({ trades: next, tradeCount: next.length })
              }
              if (
                !window.confirm("Delete this trade from the journal?")
              ) {
                return
              }
              if (!(routeId || draft.journalId)) {
                removeLocal()
                return
              }
              mutations.deleteJournalTrade.mutate(id, {
                onSuccess: () => {
                  removeLocal()
                  setBanner("Trade deleted")
                },
                onError: (err) => {
                  if (err instanceof ApiError && err.status === 404) {
                    removeLocal()
                    return
                  }
                  setBanner(
                    err instanceof ApiError ? err.message : "Failed to delete trade",
                  )
                },
              })
            }}
          />


          <div className="cj-two-col">
            <div className="cj-stack">
              <SectionCard
                id="section-market-context"
                title="Market Context"
                icon={<CandlestickChart size={15} />}
              >
                <MarkdownEditor
                  fieldId="market-context"
                  fieldName="Market Context"
                  fieldDescription="Turn raw market observations into polished journal prose. Keep every level and fact; invent nothing."
                  value={draft.marketContext}
                  onChange={(v) => patchDraft({ marketContext: v })}
                  placeholder="Write raw thoughts — levels, bias, structure…"
                  minHeight={160}
                />
              </SectionCard>

              <SectionCard id="section-pre-market" title="Pre-Market Plan" icon={<Sparkles size={15} />}>
                <MarkdownEditor
                  fieldId="pre-market-plan"
                  fieldName="Pre-Market Plan"
                  fieldDescription="Turn the trader's pre-open plan into a clear journal narrative. Do not invent levels or bias."
                  value={draft.preMarketPlan}
                  onChange={(v) => patchDraft({ preMarketPlan: v })}
                  placeholder="What was your plan before the open?"
                />
              </SectionCard>

              <SectionCard
                id="section-trading-plan"
                title="Trading Plan"
                icon={<Check size={15} />}
              >
                <MarkdownEditor
                  fieldId="trading-plan"
                  fieldName="Trading Plan"
                  fieldDescription="Rewrite entry criteria, invalidation, and targets into polished journal English without inventing details."
                  value={draft.tradingPlan}
                  onChange={(v) => patchDraft({ tradingPlan: v })}
                  placeholder="Entry criteria, invalidation, targets…"
                />
              </SectionCard>

              <SectionCard id="section-lessons" title="Lessons Learned" icon={<Sparkles size={15} />}>
                <MarkdownEditor
                  fieldId="day-lessons"
                  fieldName="Today's Learning"
                  fieldDescription="Turn today's lessons into polished journal prose. Preserve meaning; invent nothing."
                  value={draft.lessons}
                  onChange={(v) => patchDraft({ lessons: v })}
                  placeholder="What will you carry into tomorrow?"
                />
              </SectionCard>

              <SectionCard
                id="section-screenshots"
                title="Screenshot Gallery"
                icon={<Plus size={15} />}
                aiAssist={false}
              >
                <div
                  className="cj-dropzone"
                  data-active={dropActive}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    dragDepth.current += 1
                    setDropActive(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    dragDepth.current -= 1
                    if (dragDepth.current <= 0) {
                      dragDepth.current = 0
                      setDropActive(false)
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                >
                  <p>Drag &amp; drop chart screenshots here</p>
                  <label className="cj-btn" style={{ marginTop: 10, cursor: "pointer" }}>
                    <Plus size={14} /> Upload Images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        if (e.target.files) addFiles(e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
                {draft.screenshots.length ? (
                  <div className="cj-thumbs">
                    {draft.screenshots.slice(0, 6).map((s) =>
                      s.attachmentId ? (
                        <div key={s.id} className="cj-thumb cj-thumb-auth" title={s.caption || s.name}>
                          <AuthAttachmentThumb
                            attachmentId={s.attachmentId}
                            label={s.caption || s.name}
                            status={s.importStatus}
                            className="cj-thumb-img"
                          />
                        </div>
                      ) : (
                        <div key={s.id} className="cj-thumb">
                          <img src={s.previewUrl} alt={s.caption || s.name} />
                          <button
                            type="button"
                            className="cj-md-tool"
                            style={{
                              position: "absolute",
                              top: 2,
                              right: 2,
                              background: "rgba(0,0,0,.55)",
                            }}
                            aria-label={`Remove ${s.name}`}
                            onClick={() =>
                              patchDraft({
                                screenshots: draft.screenshots.filter((x) => x.id !== s.id),
                              })
                            }
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ),
                    )}
                    {draft.screenshots.length > 6 ? (
                      <div className="cj-thumb-more">+{draft.screenshots.length - 6}</div>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>
            </div>

            <div className="cj-stack">
              <SectionCard id="section-psychology" title="Psychology" icon={<Sparkles size={15} />}>
                <MarkdownEditor
                  fieldId="day-psychology"
                  fieldName="Psychology"
                  fieldDescription="Turn emotional state, discipline notes, and triggers into polished journal prose without inventing feelings."
                  value={draft.psychology}
                  onChange={(v) => patchDraft({ psychology: v })}
                  placeholder="Emotional state, discipline notes, triggers…"
                />
              </SectionCard>

              <SectionCard id="section-mistakes" title="Mistakes" icon={<X size={15} />} aiAssist={false}>
                <MistakesChecklist
                  mistakes={draft.mistakes}
                  onChange={(mistakes) => patchDraft({ mistakes })}
                  notesPlaceholder="Describe what went wrong and why…"
                />
              </SectionCard>

              <SectionCard
                id="section-actions"
                title="Action Items for Tomorrow"
                icon={<Check size={15} />}
              >
                <MarkdownEditor
                  fieldId="action-items"
                  fieldName="Action Items"
                  fieldDescription="Turn tomorrow's action items into clear journal prose without inventing new tasks."
                  value={draft.actionItems}
                  onChange={(v) => patchDraft({ actionItems: v })}
                  placeholder="One clear focus for the next session…"
                  minHeight={110}
                />
              </SectionCard>

              <SectionCard id="section-tags" title="Tags" icon={<Plus size={15} />} aiAssist={false}>
                <div className="cj-tags-input">
                  {draft.tags.map((tag) => (
                    <button key={tag} type="button" className="cj-tag" onClick={() => toggleTag(tag)}>
                      {tag} <X size={11} />
                    </button>
                  ))}
                  <input
                    className="cj-input"
                    style={{ border: 0, background: "transparent", height: 28, flex: 1, minWidth: 120, boxShadow: "none" }}
                    placeholder="Add tags…"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return
                      e.preventDefault()
                      const v = (e.target as HTMLInputElement).value.trim()
                      if (!v) return
                      if (!draft.tags.includes(v)) patchDraft({ tags: [...draft.tags, v] })
                      ;(e.target as HTMLInputElement).value = ""
                    }}
                  />
                </div>
                <p className="cj-field-label" style={{ marginTop: 12 }}>
                  Popular Tags
                </p>
                <div className="cj-popular">
                  {POPULAR_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      data-on={draft.tags.includes(tag)}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const v = window.prompt("Custom tag")
                      if (!v?.trim()) return
                      if (!draft.tags.includes(v.trim())) {
                        patchDraft({ tags: [...draft.tags, v.trim()] })
                      }
                    }}
                  >
                    + Custom Tag
                  </button>
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="cj-footer-status">
            <span>
              {dirty ? (
                "Unsaved changes…"
              ) : (
                <>
                  <Check size={12} style={{ display: "inline", marginRight: 4 }} />
                  {saveLabel}
                </>
              )}
            </span>
            <span>
              {lastSavedAt
                ? `Last saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Not saved yet"}
              {" · ⌘S"}
            </span>
          </div>
        </main>

        <AICoachPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      </div>

      <button
        type="button"
        className="cj-fab-save"
        onClick={() => setPersistDialog({ kind: "confirm", status: "draft" })}
      >
        Save
      </button>

      {dupDialog ? (
        <div className="cj-dialog-backdrop" role="presentation">
          <div className="cj-dialog" role="dialog" aria-modal="true" aria-labelledby="cj-dup-title">
            <h3 id="cj-dup-title">A journal already exists for this date.</h3>
            <p>
              There is already a trading journal for {formatJournalDateLong(dupDialog.date)}. Open it
              to continue writing, or cancel and pick another date.
            </p>
            <div className="cj-dialog-actions">
              <button type="button" className="cj-btn cj-btn-ghost" onClick={() => setDupDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="cj-btn cj-btn-primary"
                onClick={() => {
                  const id = dupDialog.existingId
                  setDupDialog(null)
                  if (id) navigateAllowLeave(`/trading/journals/${id}/edit`)
                }}
              >
                Open Existing Journal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {blocker.state === "blocked" ? (
        <div className="cj-dialog-backdrop" role="presentation">
          <div className="cj-dialog" role="dialog" aria-modal="true">
            <h3>Unsaved changes</h3>
            <p>You have unsaved edits in this journal. Leave anyway?</p>
            <div className="cj-dialog-actions">
              <button type="button" className="cj-btn" onClick={() => blocker.reset?.()}>
                Stay
              </button>
              <button
                type="button"
                className="cj-btn cj-btn-primary"
                onClick={() => {
                  allowLeaveRef.current = true
                  flushSync(() => setDirty(false))
                  blocker.proceed?.()
                  queueMicrotask(() => {
                    allowLeaveRef.current = false
                  })
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {persistDialog?.kind === "confirm" ? (
        <div className="cj-dialog-backdrop" role="presentation">
          <div
            className="cj-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cj-persist-confirm-title"
          >
            <h3 id="cj-persist-confirm-title">
              {persistDialog.status === "published" ? "Publish journal?" : "Save draft?"}
            </h3>
            <p>
              {persistDialog.status === "published"
                ? `Publish the journal for ${formatJournalDateLong(draft.journalDate)}? You can still edit it later.`
                : `Save a draft for ${formatJournalDateLong(draft.journalDate)}? Your progress will be stored so you can continue later.`}
            </p>
            <div className="cj-dialog-actions">
              <button
                type="button"
                className="cj-btn cj-btn-ghost"
                disabled={saving}
                onClick={() => setPersistDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cj-btn cj-btn-primary"
                disabled={saving || !canPersist}
                onClick={() => {
                  const status = persistDialog.status
                  setPersistDialog(null)
                  void persist(status, "manual")
                }}
              >
                {persistDialog.status === "published" ? "Yes, publish" : "Yes, save draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {persistDialog?.kind === "success" ? (
        <div className="cj-dialog-backdrop" role="presentation">
          <div
            className="cj-dialog cj-dialog-success"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cj-persist-success-title"
          >
            <h3 id="cj-persist-success-title">
              {persistDialog.status === "published" ? "Journal published" : "Draft saved"}
            </h3>
            <p>
              {persistDialog.status === "published"
                ? "Your journal was published successfully."
                : "Your journal draft was saved successfully."}
            </p>
            <div className="cj-dialog-actions">
              <button
                type="button"
                className="cj-btn cj-btn-primary"
                onClick={() => {
                  const next = persistDialog.nextPath
                  setPersistDialog(null)
                  if (next) navigateAllowLeave(next, { replace: true })
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
