export type PlannerBlock = {
  id: string
  time: string
  title: string
  tag: string
  done: boolean
}

export type TaskItem = {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  due: string
  done: boolean
}

export type GoalItem = {
  id: string
  title: string
  domain: string
  progress: number
}

export type TradingSummary = {
  dayPnl: number
  weekPnl: number
  winRate: number
  tradesToday: number
  openRisk: number
}

export type BookProgress = {
  id: string
  title: string
  author: string
  progress: number
  pagesLeft: number
}

export type FinanceSummary = {
  cash: number
  spentThisMonth: number
  budget: number
  investments: number
  currency: string
}

export type QuickNote = {
  id: string
  body: string
  updatedAt: string
}

export type UpcomingEvent = {
  id: string
  title: string
  when: string
  type: "meeting" | "review" | "personal" | "market"
}

export type JournalEntry = {
  id: string
  title: string
  excerpt: string
  date: string
  mood: string
}

export type ChartPoint = {
  label: string
  value: number
}

export type DashboardData = {
  planner: PlannerBlock[]
  tasks: TaskItem[]
  goals: GoalItem[]
  trading: TradingSummary
  books: BookProgress[]
  finance: FinanceSummary
  notes: QuickNote[]
  events: UpcomingEvent[]
  journal: JournalEntry[]
  focusSeries: ChartPoint[]
  pnlSeries: ChartPoint[]
}
