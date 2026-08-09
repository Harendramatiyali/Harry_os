/**
 * Trading Module V2 — production connected layout.
 * Legacy tools remain at /trading/classic.
 *
 * Calendar / date range is the global filter for journals, stats, analytics, and trades.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { BookMarked, Filter, NotebookPen, Plus, Settings2, Upload } from "lucide-react"

import "@/features/trading/v2/tradingV2.css"
import { useJournalDay, useJournalDays, useTradingAnalytics, useTradingMutations } from "@/features/trading/hooks"
import type { JournalDayFilters } from "@/features/trading/types"
import { ArticleRenderer } from "@/features/trading/v2/components/ArticleRenderer"
import {
  draftToPayload,
  JournalEditForm,
  useEditableDraft,
  useJournalDayNeighbors,
} from "@/features/trading/v2/components/JournalEditForm"
import { JournalCard } from "@/features/trading/v2/components/JournalCard"
import { PerformanceCard } from "@/features/trading/v2/components/PerformanceCard"
import { QuickActionCard } from "@/features/trading/v2/components/QuickActionCard"
import { StatCard } from "@/features/trading/v2/components/StatCard"
import { TagGroup } from "@/features/trading/v2/components/TagGroup"
import { TradeHistoryCard } from "@/features/trading/v2/components/TradeHistoryCard"
import { TradingDateRangeControl } from "@/features/trading/v2/components/TradingDateRangeControl"
import {
  AnalyticsSection,
  CalendarSection,
  ComingSoonSection,
} from "@/features/trading/v2/components/TradingV2SectionViews"
import { WeeklyReviewDashboard } from "@/features/trading/v2/weeklyReview/WeeklyReviewDashboard"
import { TradingFilterTabs, TradingTabs } from "@/features/trading/v2/components/TradingTabs"
import { TradingSearchBar } from "@/features/trading/v2/components/TradingSearchBar"
import {
  TradingModuleHeader,
  TradingV2Shell,
  WorkspaceToolbar,
} from "@/features/trading/v2/components/TradingV2Shell"
import {
  formatJournalDate,
  groupJournalCards,
  mapDayToArticleBlocks,
  mapJournalSource,
  mapStatsFromAnalytics,
  mapTagsFromAnalytics,
  mapTradeHistory,
  performanceFromDay,
} from "@/features/trading/v2/mapJournalToV2"
import {
  dateRangeToApiParams,
  dateRangeToDateTimeParams,
  useTradingDateRangeStore,
} from "@/features/trading/v2/tradingDateRangeStore"

const SECONDARY_TABS = [
  "Overview",
  "Journal",
  "Weekly Review",
  "Analytics",
  "Calendar",
  "Watchlist",
  "Notes",
  "Strategies",
  "Rules",
].map((label) => ({
  id: label.toLowerCase().replace(/\s+/g, "-"),
  label,
}))

const VALID_SECTIONS = new Set(SECONDARY_TABS.map((t) => t.id))

const JOURNAL_FILTERS = [
  { id: "all", label: "All" },
  { id: "ai-generated", label: "AI Generated" },
  { id: "obsidian", label: "Obsidian" },
  { id: "favorites", label: "Favorites" },
]

const WORKSPACE_BASE = [
  { id: "overview", label: "Overview" },
  { id: "market-analysis", label: "Market Analysis" },
  { id: "trades", label: "Trades" },
  { id: "opportunity-analysis", label: "Opportunity" },
  { id: "learning", label: "Learning" },
  { id: "psychology", label: "Psychology" },
  { id: "screenshots", label: "Screenshots" },
]

function JournalListSkeleton() {
  return (
    <div className="space-y-2 px-1" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="tv2-skeleton h-[4.5rem] w-full" />
      ))}
    </div>
  )
}

export function TradingV2ConnectedLayout() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const dayFromUrl = searchParams.get("day")
  const sectionFromUrl = searchParams.get("section")

  const range = useTradingDateRangeStore((s) => s.range)
  const hydrateFromUrl = useTradingDateRangeStore((s) => s.hydrateFromUrl)
  const apiRange = useMemo(() => dateRangeToApiParams(range), [range])
  const analyticsRange = useMemo(() => dateRangeToDateTimeParams(range), [range])
  const hydratedRef = useRef(false)

  const [secondaryTab, setSecondaryTab] = useState(() => {
    if (sectionFromUrl === "trades") return "journal"
    if (sectionFromUrl && VALID_SECTIONS.has(sectionFromUrl)) return sectionFromUrl
    return "overview"
  })
  const [journalFilter, setJournalFilter] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [appliedQ, setAppliedQ] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(dayFromUrl)
  const [workspaceTab, setWorkspaceTab] = useState("overview")
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  /** Overview KPI cards = all-time. Journal list + Calendar/Analytics/Trades = month filter. */
  const cardsAreAllTime = secondaryTab === "overview"

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    hydrateFromUrl({
      month: searchParams.get("month"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      preset: searchParams.get("preset"),
    })
  }, [hydrateFromUrl, searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setAppliedQ(searchInput.trim()), 320)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (sectionFromUrl === "trades") {
      setSecondaryTab("journal")
      const next = new URLSearchParams(searchParams)
      next.set("section", "journal")
      setSearchParams(next, { replace: true })
      return
    }
    if (sectionFromUrl && VALID_SECTIONS.has(sectionFromUrl) && sectionFromUrl !== secondaryTab) {
      setSecondaryTab(sectionFromUrl)
    }
  }, [sectionFromUrl, secondaryTab, searchParams, setSearchParams])

  // Persist month in URL only — never re-read into the store (prevents month freezing).
  useEffect(() => {
    const month = range.startDate.slice(0, 7)
    if (searchParams.get("month") === month) return
    const next = new URLSearchParams(searchParams)
    next.set("month", month)
    next.delete("from")
    next.delete("to")
    next.delete("preset")
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate])

  const baseFilters = useMemo(
    () => ({
      q: appliedQ || undefined,
      favorite_only: journalFilter === "favorites" || undefined,
    }),
    [appliedQ, journalFilter],
  )

  // Left panel always follows the month arrows
  const journalFilters: JournalDayFilters = useMemo(
    () => ({
      ...baseFilters,
      date_from: apiRange.date_from,
      date_to: apiRange.date_to,
    }),
    [baseFilters, apiRange],
  )

  // Overview cards need unscoped journal totals
  const allTimeFilters: JournalDayFilters = useMemo(() => ({ ...baseFilters }), [baseFilters])

  const listQuery = useJournalDays(journalFilters)
  const allTimeListQuery = useJournalDays(allTimeFilters, { enabled: cardsAreAllTime })
  const analyticsQuery = useTradingAnalytics(cardsAreAllTime ? undefined : analyticsRange)
  const detailQuery = useJournalDay(selectedId)
  const { updateJournal, deleteJournalTrade, deleteJournal } = useTradingMutations()

  const days = listQuery.data ?? []
  const allTimeDays = allTimeListQuery.data ?? []

  const filteredDays = useMemo(() => {
    if (journalFilter === "ai-generated") {
      return days.filter((d) => mapJournalSource(d.source) === "AI")
    }
    if (journalFilter === "obsidian") {
      return days.filter((d) => mapJournalSource(d.source) === "Obsidian")
    }
    return days
  }, [days, journalFilter])

  const { prevDay, nextDay } = useJournalDayNeighbors(filteredDays, selectedId)
  const journalGroups = useMemo(() => groupJournalCards(filteredDays), [filteredDays])
  const statsPeriodLabel = cardsAreAllTime ? "All time" : range.label
  const statsSourceDays = cardsAreAllTime ? allTimeDays : days
  const stats = useMemo(
    () => mapStatsFromAnalytics(analyticsQuery.data, statsSourceDays, statsPeriodLabel),
    [analyticsQuery.data, statsSourceDays, statsPeriodLabel],
  )
  const tags = useMemo(() => mapTagsFromAnalytics(analyticsQuery.data), [analyticsQuery.data])

  useEffect(() => {
    if (dayFromUrl) setSelectedId(dayFromUrl)
  }, [dayFromUrl])

  useEffect(() => {
    if (!selectedId && filteredDays.length) {
      setSelectedId(filteredDays[0]!.id)
    }
  }, [filteredDays, selectedId])

  useEffect(() => {
    // When month changes, jump selection to a day that exists in the filtered list
    if (selectedId && filteredDays.length && !filteredDays.some((d) => d.id === selectedId)) {
      const nextId = filteredDays[0]?.id ?? null
      setSelectedId(nextId)
      if (nextId) updateParamsRef.current({ day: nextId })
      else updateParamsRef.current({ day: null })
    }
    if (selectedId && !filteredDays.length) {
      setSelectedId(null)
      updateParamsRef.current({ day: null })
    }
  }, [filteredDays, selectedId])

  function updateParams(patch: { day?: string | null; section?: string | null }) {
    const next = new URLSearchParams(searchParams)
    if (patch.day !== undefined) {
      if (patch.day) next.set("day", patch.day)
      else next.delete("day")
    }
    if (patch.section !== undefined) {
      if (patch.section && patch.section !== "overview") next.set("section", patch.section)
      else next.delete("section")
    }
    if (range.startDate) next.set("month", range.startDate.slice(0, 7))
    setSearchParams(next, { replace: true })
  }

  const updateParamsRef = useRef(updateParams)
  updateParamsRef.current = updateParams

  function selectJournal(id: string) {
    setEditing(false)
    setSaveError(null)
    setSelectedId(id)
    setWorkspaceTab("overview")
    if (secondaryTab !== "overview" && secondaryTab !== "journal" && secondaryTab !== "calendar") {
      setSecondaryTab("overview")
      updateParams({ day: id, section: "overview" })
      return
    }
    updateParams({ day: id })
  }

  function onSecondaryTabChange(id: string) {
    setEditing(false)
    setSaveError(null)
    setSecondaryTab(id)
    updateParams({ section: id })
    if (id === "trades") setWorkspaceTab("trades")
    if (id === "journal" || id === "overview") setWorkspaceTab("overview")
  }

  const day = detailQuery.data
  const { draft, setDraft } = useEditableDraft(day, editing)

  async function handleSave() {
    if (!selectedId || !draft) return
    setSaveError(null)
    try {
      await updateJournal.mutateAsync({ id: selectedId, body: draftToPayload(draft) })
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save journal")
    }
  }
  const activeSummary = filteredDays.find((d) => d.id === selectedId)
  const dateLabel = day
    ? formatJournalDate(day.journal_date)
    : activeSummary
      ? formatJournalDate(activeSummary.journal_date)
      : "—"
  const source = mapJournalSource(day?.source ?? activeSummary?.source)
  const isFavorite =
    localFavorites[selectedId ?? ""] ??
    Boolean(day?.is_favorite ?? activeSummary?.is_favorite)

  const tradeCount = day?.trades?.length ?? day?.trade_count ?? activeSummary?.trade_count ?? 0
  const workspaceTabs = useMemo(
    () =>
      WORKSPACE_BASE.map((t) =>
        t.id === "trades" ? { ...t, label: `Trades (${tradeCount})` } : t,
      ),
    [tradeCount],
  )

  const articleBlocks = useMemo(() => {
    if (!day) return []
    return mapDayToArticleBlocks(day, workspaceTab)
  }, [day, workspaceTab])

  const trades = useMemo(() => mapTradeHistory(day?.trades ?? []), [day])
  const performance = useMemo(() => performanceFromDay(day), [day])
  const showDetailLoading = detailQuery.isFetching && !day
  const showJournalChrome = secondaryTab === "overview" || secondaryTab === "journal"

  function onQuickAction(id: string) {
    if (id === "journal") {
      navigate("/trading/journals/new")
      return
    }
    if (id === "obsidian") {
      navigate("/ai/imports")
      return
    }
    if (id === "note") {
      navigate("/trading/classic?tab=entry")
      return
    }
    if (id === "classic") {
      navigate("/trading/classic?tab=days")
    }
  }

  const journalList = (
    <div className="tv2-card flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="tv2-h2" id="tv2-journals-heading">
            Trading Journals
          </h2>
          <p className="tv2-caption mt-0.5">{range.label}</p>
        </div>
        <button
          type="button"
          className="tv2-btn tv2-btn-sm tv2-btn-primary"
          onClick={() => navigate("/trading/journals/new")}
        >
          <Plus className="size-3.5" aria-hidden />
          New Journal
        </button>
      </div>
      <TradingDateRangeControl showPresets={false} />
      <TradingSearchBar
        placeholder="Search journals…"
        value={searchInput}
        onChange={setSearchInput}
        aria-label="Search journals"
        trailing={
          <button
            type="button"
            className="rounded-lg p-1.5 text-[color:var(--tv2-muted)]"
            aria-label="Apply search now"
            onClick={() => setAppliedQ(searchInput.trim())}
          >
            <Filter className="size-3.5" aria-hidden />
          </button>
        }
      />
      <TradingFilterTabs
        items={JOURNAL_FILTERS}
        activeId={journalFilter}
        onChange={(id) => {
          setJournalFilter(id)
          setSelectedId(null)
        }}
      />
      <div
        className="max-h-[min(70vh,40rem)] space-y-4 overflow-y-auto pr-1"
        role="listbox"
        aria-labelledby="tv2-journals-heading"
        aria-busy={listQuery.isLoading || listQuery.isFetching}
      >
        {listQuery.isLoading && !days.length ? (
          <>
            <p className="sr-only">Loading journals</p>
            <JournalListSkeleton />
          </>
        ) : journalGroups.length === 0 ? (
          <p className="tv2-caption px-2 py-6 text-center" role="status">
            No journals in {range.label}. Try another month or import from Obsidian.
          </p>
        ) : (
          journalGroups.map((group) => (
            <div key={group.group} className="space-y-1.5">
              <p className="tv2-caption px-2 uppercase tracking-[0.12em]">{group.group}</p>
              <div className="tv2-stagger space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.id} role="option" aria-selected={item.id === selectedId}>
                    <JournalCard
                      model={{
                        ...item,
                        favorite: localFavorites[item.id] ?? item.favorite,
                      }}
                      active={item.id === selectedId}
                      onSelect={selectJournal}
                      onToggleFavorite={(id) =>
                        setLocalFavorites((prev) => {
                          const base =
                            prev[id] ??
                            Boolean(filteredDays.find((d) => d.id === id)?.is_favorite)
                          return { ...prev, [id]: !base }
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const journalWorkspace = (
    <div
      className="tv2-card min-h-[40rem] p-4 md:p-5"
      aria-busy={showDetailLoading || detailQuery.isFetching}
    >
      {!selectedId ? (
        <p className="tv2-caption py-16 text-center">Select a journal to review.</p>
      ) : showDetailLoading ? (
        <div className="space-y-3 py-6" aria-live="polite">
          <p className="sr-only">Loading journal</p>
          <div className="tv2-skeleton h-8 w-2/3" />
          <div className="tv2-skeleton h-4 w-full" />
          <div className="tv2-skeleton h-4 w-5/6" />
          <div className="tv2-skeleton mt-6 h-40 w-full" />
        </div>
      ) : detailQuery.isError ? (
        <p className="tv2-caption py-16 text-center text-[color:var(--tv2-negative)]" role="alert">
          Failed to load journal. Try another day or refresh.
        </p>
      ) : (
        <div key={`${selectedId}-${workspaceTab}-${editing ? "edit" : "view"}`} className="tv2-workspace-pane">
          <WorkspaceToolbar
            dateLabel={dateLabel}
            sourceBadge={source === "Manual" ? undefined : source}
            favorite={isFavorite}
            canGoPrev={Boolean(prevDay)}
            canGoNext={Boolean(nextDay)}
            onPrevDay={() => prevDay && selectJournal(prevDay.id)}
            onNextDay={() => nextDay && selectJournal(nextDay.id)}
            editing={editing}
            saving={updateJournal.isPending}
            deleting={deleteJournal.isPending}
            onEdit={() => {
              setSaveError(null)
              setEditing(true)
              setWorkspaceTab("overview")
            }}
            onCancel={() => {
              setSaveError(null)
              setEditing(false)
            }}
            onSave={() => void handleSave()}
            onDelete={() => {
              if (!selectedId || !day) return
              if (
                !window.confirm(
                  `Delete journal for ${formatJournalDate(day.journal_date)}? This removes the day and any linked trades.`,
                )
              ) {
                return
              }
              deleteJournal.mutate(selectedId, {
                onSuccess: () => {
                  setEditing(false)
                  setSelectedId(null)
                  updateParams({ day: null })
                },
              })
            }}
          />
          {saveError ? (
            <p className="tv2-caption mb-3 text-[color:var(--tv2-negative)]" role="alert">
              {saveError}
            </p>
          ) : null}
          {editing && draft ? (
            <JournalEditForm
              draft={draft}
              onChange={setDraft}
              deletingTradeId={
                deleteJournalTrade.isPending ? deleteJournalTrade.variables ?? null : null
              }
              onDeleteTrade={(tradeId) => {
                deleteJournalTrade.mutate(tradeId, {
                  onSuccess: () => {
                    setDraft((prev) =>
                      prev
                        ? { ...prev, trades: prev.trades.filter((t) => t.id !== tradeId) }
                        : prev,
                    )
                    void detailQuery.refetch()
                  },
                })
              }}
            />
          ) : (
            <>
              <div className="mb-5 border-b border-[color:var(--tv2-border-soft)] pb-2">
                <TradingTabs
                  items={workspaceTabs}
                  activeId={workspaceTab}
                  onChange={setWorkspaceTab}
                  label="Journal workspace sections"
                />
              </div>
              <ArticleRenderer blocks={articleBlocks} />
            </>
          )}
        </div>
      )}
    </div>
  )

  const center = (() => {
    switch (secondaryTab) {
      case "weekly-review":
        return <WeeklyReviewDashboard />
      case "analytics":
        return <AnalyticsSection />
      case "calendar":
        return (
          <CalendarSection
            days={days}
            selectedId={selectedId}
            onSelectDay={(id) => {
              selectJournal(id)
              setSecondaryTab("overview")
              updateParams({ day: id, section: "overview" })
            }}
          />
        )
      case "watchlist":
      case "notes":
      case "strategies":
      case "rules":
        return <ComingSoonSection sectionId={secondaryTab} />
      case "journal":
      case "overview":
      default:
        return journalWorkspace
    }
  })()

  const left = showJournalChrome ? (
    journalList
  ) : secondaryTab === "calendar" ? (
    journalList
  ) : secondaryTab === "weekly-review" ? (
    <div className="tv2-card space-y-3 p-4">
      <h2 className="tv2-h2">Weekly Review</h2>
      <p className="tv2-caption">
        Five-minute coach view of your week — KPIs, repeating mistakes, setups, and next-week focus.
      </p>
      <button type="button" className="tv2-btn tv2-btn-sm" onClick={() => onSecondaryTabChange("journal")}>
        Open Journal
      </button>
    </div>
  ) : (
    <div className="tv2-card space-y-3 p-4">
      <h2 className="tv2-h2">{SECONDARY_TABS.find((t) => t.id === secondaryTab)?.label}</h2>
      <p className="tv2-caption">
        Use the top tabs to move between Overview, Journal, Trades, Analytics, and more.
      </p>
      <button type="button" className="tv2-btn tv2-btn-sm" onClick={() => onSecondaryTabChange("overview")}>
        Back to Overview
      </button>
    </div>
  )

  return (
    <TradingV2Shell
      header={
        <div className="space-y-0">
          <TradingModuleHeader onQuickNote={() => navigate("/trading/classic?tab=entry")} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--tv2-border)] px-4 py-2.5 md:px-5">
            <p className="tv2-caption">
              {cardsAreAllTime
                ? "Overview cards = all-time · journal list follows the month arrows"
                : `Period filter · ${range.label}`}
            </p>
            <TradingDateRangeControl />
          </div>
        </div>
      }
      secondaryTabs={SECONDARY_TABS}
      activeSecondaryTab={secondaryTab}
      onSecondaryTabChange={onSecondaryTabChange}
      stats={stats.map((model) => (
        <StatCard key={model.id} model={model} />
      ))}
      left={left}
      center={center}
      right={
        <>
          <TradeHistoryCard
            items={trades.slice(0, 8)}
            deletingId={deleteJournalTrade.isPending ? deleteJournalTrade.variables ?? null : null}
            onDelete={(tradeId) => {
              deleteJournalTrade.mutate(tradeId, {
                onSuccess: () => {
                  void detailQuery.refetch()
                },
              })
            }}
          />
          <PerformanceCard
            score={performance.score}
            checklist={performance.checklist}
            metrics={performance.metrics}
          />
          <TagGroup tags={tags.length ? tags : [{ id: "empty", label: "No tags yet" }]} />
          <QuickActionCard
            actions={[
              { id: "note", label: "New Trade Note", icon: NotebookPen },
              { id: "journal", label: "New Journal", icon: BookMarked },
              { id: "obsidian", label: "Import from Obsidian", icon: Upload },
              { id: "classic", label: "Classic tools & media sync", icon: Settings2 },
            ]}
            onAction={onQuickAction}
          />
        </>
      }
    />
  )
}
