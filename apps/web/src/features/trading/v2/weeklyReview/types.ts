/** Weekly Review dashboard models — aggregated from daily journals. */

export type ImpactLevel = "high" | "medium" | "low"
export type Severity = "high" | "medium" | "low"
export type PriorityLevel = "high" | "medium" | "low"

export type WeeklyKpi = {
  id: string
  label: string
  value: string
  comparison: string
  tone: "positive" | "negative" | "neutral" | "purple" | "amber" | "blue"
  spark: number[]
}

export type WeeklyInsightItem = {
  id: string
  title: string
  description: string
  evidence?: string
  impact: ImpactLevel
}

export type WeeklyMistakeItem = {
  id: string
  title: string
  description: string
  /** AI / mentor root-cause explanation */
  rootCause: string
  recommendation: string
  moneyLostLabel: string
  moneyLost: number | null
  severity: Severity
  count: number
  days: string[]
  relatedTradeLabels: string[]
}

export type WeeklyLessonItem = {
  id: string
  title: string
  body: string
  whyItMatters: string
  sourceCount: number
}

export type WeeklyDayBrief = {
  id: string
  date: string
  dayLabel: string
  pnlLabel: string
  pnl: number
  highlights: string[]
  issues: string[]
}

export type WeeklyChecklistItem = {
  id: string
  label: string
}

export type WeeklyPriorityItem = {
  id: string
  number: number
  title: string
  description: string
  priority: PriorityLevel
}

export type WeeklyDailyPnl = {
  date: string
  dayLabel: string
  pnl: number
}

export type WeeklySetupStat = {
  setup: string
  count: number
  winRate: number | null
  wins: number
  losses: number
  netPnl: number
  netPnlLabel: string
  avgRr: number | null
  avgRrLabel: string
}

export type WeeklyOutcomeSlice = {
  name: string
  value: number
  color: string
}

export type WeeklyTimeBucket = {
  label: string
  pnl: number
  trades: number
}

export type WeeklyScore = {
  id: string
  label: string
  value: number
}

export type WeeklyCoachModel = {
  summary: string
  strengths: string[]
  weaknesses: string[]
  advice: string
  challenge: string
}

export type WeeklyFooterStats = {
  bestDayLabel: string
  bestDayPnl: string
  worstDayLabel: string
  worstDayPnl: string
  bestTradeLabel: string
  bestTradePnl: string
  worstTradeLabel: string
  worstTradePnl: string
  scores: WeeklyScore[]
  bestSetup: string
  worstSetup: string
}

export type WeeklyReviewModel = {
  weekStart: string
  weekEnd: string
  weekLabel: string
  empty: boolean
  daysWithJournals: number
  kpis: WeeklyKpi[]
  grade: string
  gradeStars: number
  whatWorked: WeeklyInsightItem[]
  mistakes: WeeklyMistakeItem[]
  lessons: WeeklyLessonItem[]
  dayBriefs: WeeklyDayBrief[]
  continueDoing: WeeklyChecklistItem[]
  stopDoing: WeeklyChecklistItem[]
  focusAreas: WeeklyPriorityItem[]
  dailyPnl: WeeklyDailyPnl[]
  outcomes: WeeklyOutcomeSlice[]
  setups: WeeklySetupStat[]
  timeBuckets: WeeklyTimeBucket[]
  coach: WeeklyCoachModel
  footer: WeeklyFooterStats
  netPnl: number
  /** Compact digest sent to Harry AI for mentoring synthesis */
  aiDigest: string
  insightsSource: "deterministic" | "ai"
}
