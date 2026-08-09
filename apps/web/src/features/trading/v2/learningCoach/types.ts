/** AI Coaching Dashboard models for journal Learning tab. */

export type CoachSeverity = "low" | "medium" | "high"

export type CoachMistakeItem = {
  id: string
  title: string
  severity: CoachSeverity
  source: string
  body?: string
  /** Times this label appears in the session (v1). */
  sessionCount: number
  /** Impact in currency when linked to opportunity; null → show — */
  impact: number | null
  impactLabel: string
  tradeIndex: number | null
  explanation: string
}

export type CoachLessonItem = {
  id: string
  title: string
  body: string
  source: string
  category: string
  importance: number // 1–5
  appliesTo: string
  createdLabel: string
}

export type CoachPlanItem = {
  id: string
  label: string
  /** Suggested default done state from text markers */
  suggestedDone: boolean
}

export type CoachScore = {
  id: string
  label: string
  value: number // 0–100
}

export type CoachMemoryItem = {
  id: string
  title: string
  seen: number
  ignored: number
  applied: number
  successRate: number | null
}

export type CoachHeatItem = {
  id: string
  label: string
  count: number
  intensity: number // 0–1
}

export type LearningCoachModel = {
  title: string
  dateLabel: string
  journalId: string
  biggestMistake: CoachMistakeItem | null
  biggestLesson: CoachLessonItem | null
  mistakes: CoachMistakeItem[]
  lessons: CoachLessonItem[]
  plan: CoachPlanItem[]
  scores: CoachScore[]
  overallGrade: string
  strengths: string[]
  weaknesses: string[]
  tomorrowAction: string
  coachNote: string
  memory: CoachMemoryItem[]
  heatmap: CoachHeatItem[]
  empty: boolean
}
