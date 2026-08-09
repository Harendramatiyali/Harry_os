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
  spark: number[] // 0–1 normalized
}

export type WeeklyInsightItem = {
  id: string
  title: string
  description: string
  impact: ImpactLevel
}

export type WeeklyMistakeItem = {
  id: string
  title: string
  description: string
  moneyLostLabel: string
  moneyLost: number | null
  severity: Severity
  count: number
  relatedTradeLabels: string[]
}

export type WeeklyLessonItem = {
  id: string
  title: string
  body: string
  source: string
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
  dayLabel: string // Mon, Tue…
  pnl: number
}

export type WeeklySetupStat = {
  setup: string
  count: number
  winRate: number | null
  wins: number
  losses: number
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
  value: number // 0–100
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
}
