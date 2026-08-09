/**
 * Trading Module V2 — Phase 2 composed from reusable components.
 * Still static mock data. No API integration.
 */
import { useMemo, useState } from "react"
import { BookMarked, FileText, Filter, NotebookPen, Plus, Upload } from "lucide-react"

import "@/features/trading/v2/tradingV2.css"
import { ArticleRenderer } from "@/features/trading/v2/components/ArticleRenderer"
import { JournalCard } from "@/features/trading/v2/components/JournalCard"
import { PerformanceCard } from "@/features/trading/v2/components/PerformanceCard"
import { QuickActionCard } from "@/features/trading/v2/components/QuickActionCard"
import { StatCard } from "@/features/trading/v2/components/StatCard"
import { TagGroup } from "@/features/trading/v2/components/TagGroup"
import { TradeHistoryCard } from "@/features/trading/v2/components/TradeHistoryCard"
import { TradingFilterTabs } from "@/features/trading/v2/components/TradingTabs"
import { TradingSearchBar } from "@/features/trading/v2/components/TradingSearchBar"
import { TradingTabs } from "@/features/trading/v2/components/TradingTabs"
import {
  TradingModuleHeader,
  TradingV2Shell,
  WorkspaceToolbar,
} from "@/features/trading/v2/components/TradingV2Shell"
import type {
  ArticleBlock,
  JournalGroupModel,
  StatCardModel,
  TradeHistoryItem,
} from "@/features/trading/v2/types"

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

const JOURNAL_FILTERS = ["All", "AI Generated", "Obsidian", "Favorites"].map((label) => ({
  id: label.toLowerCase().replace(/\s+/g, "-"),
  label,
}))

const WORKSPACE_TABS = [
  "Overview",
  "Market Analysis",
  "Trades (11)",
  "Opportunity",
  "Learning",
  "Psychology",
  "Screenshots",
].map((label) => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label,
}))

const STATS: StatCardModel[] = [
  {
    id: "pnl",
    title: "P&L Today",
    value: "₹2,450.00",
    valueTone: "positive",
    badge: "+1.25%",
    badgeTone: "ai",
    trend: "up",
    subtitleLeft: "Realized ₹1,820",
    subtitleRight: "Unrealized ₹630",
  },
  {
    id: "winrate",
    title: "Win Rate",
    value: "72.73%",
    variant: "winRate",
    winRatePct: 72.73,
    wins: 8,
    losses: 3,
  },
  {
    id: "rr",
    title: "Risk Reward",
    value: "1.85",
    valueTone: "purple",
    trend: "purple",
    subtitleLeft: "Avg Win ₹820",
    subtitleRight: "Avg Loss ₹440",
  },
  {
    id: "trades",
    title: "Total Trades",
    value: "11",
    badge: "Today ▾",
    trend: "none",
    subtitleLeft: "Total Lots 215",
    subtitleRight: "Avg Hold 18m",
  },
  {
    id: "ai",
    title: "AI Market Insight",
    value: "",
    variant: "aiInsight",
    badge: "BETA",
    insightBody:
      "NIFTY holding above VWAP with bullish auction structure. Watch 24250 for continuation.",
    insightCta: "Ask AI Assistant",
  },
]

const JOURNAL_GROUPS: JournalGroupModel[] = [
  {
    group: "Today",
    items: [
      {
        id: "1",
        date: "31 Jul 2026",
        title: "NIFTY Strong Reversal Setup",
        source: "AI",
        trades: 11,
        pnl: 2450,
        favorite: true,
      },
      {
        id: "2",
        date: "31 Jul 2026",
        title: "BankNifty Morning Scalps",
        source: "Obsidian",
        trades: 4,
        pnl: -680,
        favorite: false,
      },
    ],
  },
  {
    group: "26 May 2024",
    items: [
      {
        id: "3",
        date: "26 May 2024",
        title: "Gap Fill + ORB Continuation",
        source: "AI",
        trades: 6,
        pnl: 1320,
        favorite: true,
      },
      {
        id: "4",
        date: "26 May 2024",
        title: "Failed Breakout Notes",
        source: "Obsidian",
        trades: 2,
        pnl: -410,
        favorite: false,
      },
    ],
  },
]

const TRADES: TradeHistoryItem[] = [
  { id: "t1", time: "09:22", name: "NIFTY 23 May 24200 CE", qty: "50", entry: "148.5", exit: "162.0", pnl: 675 },
  { id: "t2", time: "10:05", name: "NIFTY 23 May 24100 PE", qty: "50", entry: "92.0", exit: "78.5", pnl: -675 },
  { id: "t3", time: "11:40", name: "BANKNIFTY 52000 CE", qty: "15", entry: "310", exit: "348", pnl: 570 },
  { id: "t4", time: "13:15", name: "NIFTY 24250 CE", qty: "25", entry: "64.5", exit: "71.0", pnl: 162.5 },
]

const ARTICLE_BLOCKS: ArticleBlock[] = [
  { type: "heading", text: "NIFTY Strong Reversal Setup" },
  {
    type: "section",
    title: "Journal Summary",
    icon: FileText,
    body: "Market opened with a clean auction imbalance. Price rejected the overnight high and rotated back into value. I waited for the first pullback to VWAP and entered a long continuation once buyers reclaimed the opening range.",
  },
  {
    type: "callout",
    callout: {
      title: "Key Takeaway",
      body: "Patience on the open paid off. Protect runners with structure, not round numbers.",
    },
  },
  {
    type: "section",
    title: "Market Analysis",
    body: "Higher timeframe bias remained bullish. Intraday structure printed a clear higher low above 24150 support. Resistance at 24250 capped the first push — a break and hold above that level opened continuation toward the prior day extension.",
  },
  { type: "chart" },
  {
    type: "gallery",
    showAdd: true,
    images: [
      { id: "g1", label: "Chart 1", tone: "#1a2332" },
      { id: "g2", label: "Chart 2", tone: "#1e2a24" },
      { id: "g3", label: "Chart 3", tone: "#241e2e" },
      { id: "g4", label: "Chart 4", tone: "#2a2218" },
    ],
  },
]

export function TradingV2StaticLayout() {
  const [secondaryTab, setSecondaryTab] = useState("overview")
  const [journalFilter, setJournalFilter] = useState("all")
  const [activeJournalId, setActiveJournalId] = useState("1")
  const [workspaceTab, setWorkspaceTab] = useState(WORKSPACE_TABS[0]!.id)
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      JOURNAL_GROUPS.flatMap((g) => g.items.map((i) => [i.id, Boolean(i.favorite)])),
    ),
  )

  const activeJournal = useMemo(
    () => JOURNAL_GROUPS.flatMap((g) => g.items).find((j) => j.id === activeJournalId),
    [activeJournalId],
  )

  return (
    <TradingV2Shell
      header={<TradingModuleHeader />}
      secondaryTabs={SECONDARY_TABS}
      activeSecondaryTab={secondaryTab}
      onSecondaryTabChange={setSecondaryTab}
      stats={STATS.map((model) => (
        <StatCard key={model.id} model={model} />
      ))}
      left={
        <div className="tv2-card flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="tv2-h2">Trading Journals</h2>
            <button type="button" className="tv2-btn tv2-btn-sm tv2-btn-primary">
              <Plus className="size-3.5" />
              New Journal
            </button>
          </div>
          <TradingSearchBar
            placeholder="Search journals…"
            readOnly
            trailing={
              <button type="button" className="rounded-lg p-1.5 text-[color:var(--tv2-muted)]" aria-label="Filter">
                <Filter className="size-3.5" />
              </button>
            }
          />
          <TradingFilterTabs
            items={JOURNAL_FILTERS}
            activeId={journalFilter}
            onChange={setJournalFilter}
          />
          <div className="space-y-4">
            {JOURNAL_GROUPS.map((group) => (
              <div key={group.group} className="space-y-1.5">
                <p className="tv2-caption px-2 uppercase tracking-[0.12em]">{group.group}</p>
                {group.items.map((item) => (
                  <JournalCard
                    key={item.id}
                    model={{ ...item, favorite: favorites[item.id] }}
                    active={item.id === activeJournalId}
                    onSelect={setActiveJournalId}
                    onToggleFavorite={(id) =>
                      setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      }
      center={
        <div className="tv2-card min-h-[40rem] p-4 md:p-5">
          <WorkspaceToolbar
            dateLabel={activeJournal?.date ?? "31 Jul 2026"}
            sourceBadge={activeJournal?.source === "AI" ? "AI" : activeJournal?.source}
            favorite={favorites[activeJournalId]}
          />
          <div className="mb-5 border-b border-[color:var(--tv2-border-soft)] pb-2">
            <TradingTabs
              items={WORKSPACE_TABS}
              activeId={workspaceTab}
              onChange={setWorkspaceTab}
            />
          </div>
          <ArticleRenderer blocks={ARTICLE_BLOCKS} />
        </div>
      }
      right={
        <>
          <TradeHistoryCard items={TRADES} />
          <PerformanceCard
            score={83}
            checklist={[
              "You followed your plan",
              "Risk stayed within limits",
              "Avoided revenge trades",
            ]}
            metrics={[
              { label: "Discipline", value: 88 },
              { label: "Timing", value: 76 },
              { label: "Risk", value: 91 },
            ]}
          />
          <TagGroup
            tags={[
              { id: "1", label: "Breakout", count: 6 },
              { id: "2", label: "Nifty", count: 8 },
              { id: "3", label: "Reversal", count: 4 },
              { id: "4", label: "ORB", count: 3 },
              { id: "5", label: "Scalp", count: 5 },
            ]}
          />
          <QuickActionCard
            actions={[
              { id: "note", label: "New Trade Note", icon: NotebookPen },
              { id: "journal", label: "New Journal", icon: BookMarked },
              { id: "obsidian", label: "Import from Obsidian", icon: Upload },
            ]}
          />
        </>
      }
    />
  )
}
