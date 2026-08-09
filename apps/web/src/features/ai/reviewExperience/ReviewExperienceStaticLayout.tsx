/**
 * Phase 2 — Exact AI Review Experience composed from reusable components.
 * Interactive locally (section select, card edit expand, notebook zoom).
 * No backend / import job wiring yet.
 */
import { useMemo, useState } from "react"
import {
  Brain,
  CandlestickChart,
  Eye,
  Lightbulb,
  LineChart,
  Notebook,
  Target,
  Zap,
} from "lucide-react"

import { ReviewBottomBar } from "@/features/ai/reviewExperience/ReviewBottomBar"
import { ReviewExperienceShell } from "@/features/ai/reviewExperience/ReviewExperienceShell"
import { ReviewHeader } from "@/features/ai/reviewExperience/ReviewHeader"
import { ReviewNotebookViewer } from "@/features/ai/reviewExperience/ReviewNotebookViewer"
import { ReviewSectionCard } from "@/features/ai/reviewExperience/ReviewSectionCard"
import { ReviewSectionSidebar } from "@/features/ai/reviewExperience/ReviewSectionSidebar"
import type {
  ReviewNotebookPage,
  ReviewSectionCardModel,
  ReviewSectionItem,
} from "@/features/ai/reviewExperience/types"

const TRADING_SECTIONS: ReviewSectionItem[] = [
  { id: "market", label: "Market Context", icon: LineChart },
  { id: "setup", label: "Trade Setup", icon: Target },
  { id: "execution", label: "Execution", icon: Zap },
  { id: "psychology", label: "Psychology", icon: Brain },
  { id: "lessons", label: "Lessons", icon: Lightbulb },
  { id: "notebook", label: "Notebook", icon: Notebook },
]

const TRADING_CARDS: ReviewSectionCardModel[] = [
  {
    id: "market",
    title: "Market Context",
    icon: LineChart,
    confidence: 0.94,
    summary:
      "Today market opened with a strong gap-up on NIFTY. Bank Nifty led the move while broader midcaps stayed cautious. Overall bias remained bullish into the opening auction with clean higher-timeframe structure.",
  },
  {
    id: "observation",
    title: "Market Observation",
    icon: Eye,
    confidence: 0.88,
    summary:
      "Price respected the overnight high and held above VWAP through the first hour. Volume confirmed continuation on the first pullback.",
  },
  {
    id: "setup",
    title: "Trade Setup",
    icon: Target,
    confidence: 0.91,
    summary:
      "Long setup above opening range high with defined invalidation under VWAP. Target: prior day high extension.",
  },
  {
    id: "execution",
    title: "Execution",
    icon: Zap,
    confidence: 0.86,
    summary:
      "Entered on break-and-retest. Size: half risk. Exit: partial at 1R, runner trailed under swing low.",
  },
  {
    id: "psychology",
    title: "Psychology",
    icon: Brain,
    confidence: 0.82,
    summary:
      "Patient on the open. Avoided chasing the first spike. Held runner without anxiety.",
  },
  {
    id: "lessons",
    title: "Lessons",
    icon: Lightbulb,
    confidence: 0.9,
    summary:
      "Wait for retest after ORB. Protect runners with structure, not round numbers.",
  },
]

const PLACEHOLDER_PAGES: ReviewNotebookPage[] = [
  { id: "1", label: "Page 1", tone: "#1a2332" },
  { id: "2", label: "Page 2", tone: "#1e2a24" },
  { id: "3", label: "Page 3", tone: "#241e2e" },
  { id: "4", label: "Page 4", tone: "#2a2218" },
]

export function ReviewExperienceStaticLayout() {
  const [activeSectionId, setActiveSectionId] = useState("market")
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [summaries, setSummaries] = useState<Record<string, string>>(() =>
    Object.fromEntries(TRADING_CARDS.map((c) => [c.id, c.summary])),
  )

  const visibleCards = useMemo(() => {
    if (activeSectionId === "notebook") return []
    if (activeSectionId === "market") {
      return TRADING_CARDS.filter((c) => c.id === "market" || c.id === "observation")
    }
    return TRADING_CARDS.filter((c) => c.id === activeSectionId)
  }, [activeSectionId])

  return (
    <ReviewExperienceShell
      moduleId="trading"
      header={
        <ReviewHeader
          model={{
            moduleId: "trading",
            moduleName: "Trading",
            moduleIcon: CandlestickChart,
            title: "NIFTY Monday Open",
            dateLabel: "22 Jul 2026",
            confidence: 0.97,
            destinationLabel: "Trading",
          }}
        />
      }
      sidebar={
        <ReviewSectionSidebar
          moduleName="Trading"
          moduleIcon={CandlestickChart}
          sections={TRADING_SECTIONS}
          activeSectionId={activeSectionId}
          onSelectSection={setActiveSectionId}
        />
      }
      center={
        activeSectionId === "notebook" ? (
          <div className="re-card flex min-h-[240px] items-center justify-center p-8">
            <p className="re-caption text-center">
              Use the Original Notebook panel on the right to inspect pages.
            </p>
          </div>
        ) : (
          visibleCards.map((card) => (
            <ReviewSectionCard
              key={card.id}
              model={{ ...card, accepted: Boolean(accepted[card.id]) }}
              summaryValue={summaries[card.id] ?? card.summary}
              onSummaryChange={(value) =>
                setSummaries((prev) => ({ ...prev, [card.id]: value }))
              }
              onAccept={() => setAccepted((prev) => ({ ...prev, [card.id]: true }))}
            />
          ))
        )
      }
      notebook={<ReviewNotebookViewer pages={PLACEHOLDER_PAGES} />}
      bottomBar={<ReviewBottomBar />}
    />
  )
}
