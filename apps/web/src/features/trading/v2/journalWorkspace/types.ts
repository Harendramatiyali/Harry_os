/** Structured models for premium journal workspace tabs (read view). */

import type { OpportunityAnalysisModel } from "@/features/trading/v2/opportunityAnalysis/types"
import type { LearningCoachModel } from "@/features/trading/v2/learningCoach/types"

export type JournalMetric = {
  id: string
  label: string
  value: string
  tone?: "positive" | "negative" | "neutral" | "accent"
}

export type JournalChip = {
  id: string
  label: string
  tone?: "blue" | "violet" | "amber" | "emerald" | "rose" | "slate"
}

export type JournalProseBlock = {
  id: string
  title: string
  body: string
  tone?: "default" | "sky" | "amber" | "emerald" | "violet"
  icon?: "market" | "plan" | "brain" | "book" | "flag" | "camera" | "spark"
}

export type JournalPsychBar = {
  id: string
  label: string
  value: number // 0–10
}

export type JournalShot = {
  id: string
  label: string
  attachmentId: string
  status?: string
  scope?: string
}

export type JournalOverviewPanel = {
  tab: "overview"
  title: string
  dateLabel: string
  bias: string | null
  result: string | null
  grade: string | null
  pnl: number
  pnlLabel: string
  metrics: JournalMetric[]
  tags: JournalChip[]
  summary: JournalProseBlock | null
  takeaway: string | null
  shots: JournalShot[]
}

export type JournalMarketPanel = {
  tab: "market-analysis"
  title: string
  blocks: JournalProseBlock[]
  shots: JournalShot[]
  emptyHint?: string
}

export type JournalPsychologyPanel = {
  tab: "psychology"
  title: string
  overallScore: number | null
  mood: string | null
  bars: JournalPsychBar[]
  dayNotes: JournalProseBlock[]
  tradeNotes: JournalProseBlock[]
  synthesized: string | null
}

export type JournalScreenshotsPanel = {
  tab: "screenshots"
  title: string
  readyCount: number
  totalCount: number
  shots: JournalShot[]
  emptyHint?: string
}

export type JournalOpportunityPanel = {
  tab: "opportunity-analysis"
  title: string
  analyses: OpportunityAnalysisModel[]
  emptyHint?: string
}

export type JournalLearningPanel = {
  tab: "learning"
  title: string
  coach: LearningCoachModel
}

export type JournalWorkspacePanel =
  | JournalOverviewPanel
  | JournalMarketPanel
  | JournalPsychologyPanel
  | JournalScreenshotsPanel
  | JournalOpportunityPanel
  | JournalLearningPanel
