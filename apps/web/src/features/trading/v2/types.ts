import type { ComponentType, ReactNode } from "react"
import type { TradeDetailModel } from "@/features/trading/v2/tradeDetail/types"
import type { JournalWorkspacePanel } from "@/features/trading/v2/journalWorkspace/types"

export type TradingTabItem = {
  id: string
  label: string
}

export type StatCardModel = {
  id: string
  title: string
  value: string
  valueTone?: "positive" | "negative" | "purple" | "default"
  badge?: string
  badgeTone?: "ai" | "beta" | "default"
  subtitleLeft?: string
  subtitleRight?: string
  trend?: "up" | "down" | "purple" | "none"
  variant?: "default" | "winRate" | "aiInsight"
  winRatePct?: number
  wins?: number
  losses?: number
  /** Breakeven / cost-to-cost trades (neither win nor loss). */
  flats?: number
  insightBody?: string
  insightCta?: string
  /** Structured rows for the AI insight card (preferred over a single clumpy sentence). */
  insightRows?: Array<{ label: string; value: string }>
}

export type JournalSource = "AI" | "Obsidian" | "Manual"

export type JournalCardModel = {
  id: string
  date: string
  title: string
  source: JournalSource
  trades: number
  pnl: number
  favorite?: boolean
}

export type JournalGroupModel = {
  group: string
  items: JournalCardModel[]
}

export type TradeHistoryItem = {
  id: string
  time: string
  name: string
  qty: string
  entry: string
  exit: string
  pnl: number
  direction?: string | null
  setup?: string | null
  grade?: string | null
  result?: string | null
  stop?: string
  chartCount?: number
}

export type PerformanceMetric = {
  label: string
  value: number
}

export type TagItem = {
  id: string
  label: string
  count?: number
}

export type QuickActionItem = {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export type ArticleCallout = {
  title: string
  body: string
}

export type ArticleBlock =
  | { type: "heading"; text: string }
  | { type: "section"; title: string; icon?: ComponentType<{ className?: string }>; body: string }
  | { type: "callout"; callout: ArticleCallout }
  | { type: "chart" }
  | { type: "gallery"; images: { id: string; label: string; tone?: string; src?: string; attachmentId?: string; status?: string }[]; showAdd?: boolean }
  | { type: "tradeDetail"; trade: TradeDetailModel }
  | { type: "journalPanel"; panel: JournalWorkspacePanel }
  | { type: "custom"; node: ReactNode }
