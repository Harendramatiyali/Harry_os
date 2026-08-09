/** Structured model for the premium published Trade Details card. */

export type TradeDetailStatus = "win" | "loss" | "flat"

export type TradeDetailMetric = {
  id: string
  label: string
  value: string
  tone?: "positive" | "negative" | "neutral" | "accent"
}

export type TradeDetailChip = {
  id: string
  label: string
  tone: "blue" | "violet" | "amber" | "emerald" | "rose" | "slate"
}

export type TradeDetailTimelineEvent = {
  id: string
  time?: string
  title: string
  detail?: string
}

export type TradeDetailSuccessPoint = {
  id: string
  text: string
}

export type TradeDetailMistake = {
  id: string
  label: string
  severity: "low" | "medium" | "high"
  description: string
}

export type TradeDetailPsychBar = {
  id: string
  label: string
  value: number // 0–10
}

export type TradeDetailScreenshot = {
  id: string
  label: string
  attachmentId: string
  status?: string
}

export type TradeDetailAIReview = {
  overallGrade: string
  executionScore: number
  psychologyScore: number
  riskManagement: number
  discipline: number
  tradeQuality: number
  topMistakes: string[]
  topStrengths: string[]
  nextAction: string
}

export type TradeDetailModel = {
  id: string
  tradeIndex: number
  instrument: string
  strike?: string
  direction: string | null
  grade: string | null
  result: string | null
  status: TradeDetailStatus
  pnl: number
  pnlLabel: string
  tradeDate: string
  metrics: TradeDetailMetric[]
  setupChips: TradeDetailChip[]
  thesis: string
  timeline: TradeDetailTimelineEvent[]
  /** Fallback prose when timeline couldn't be structured */
  whatHappenedProse: string
  whatWentWell: TradeDetailSuccessPoint[]
  mistakes: TradeDetailMistake[]
  lesson: string
  psychology: {
    mood: string
    bars: TradeDetailPsychBar[]
    overallScore: number
    notes: string
  } | null
  screenshots: TradeDetailScreenshot[]
  aiReview: TradeDetailAIReview
  notes: string
}
