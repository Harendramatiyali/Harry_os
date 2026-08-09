export type TaskPriority = "high" | "medium" | "low"
export type TaskStatus = "todo" | "doing" | "done" | "cancelled"
export type HabitCadence = "daily" | "weekly"
export type RecurrenceRule = "none" | "daily" | "weekly" | "weekdays"

export type DailyPlan = {
  id: string
  plan_date: string
  notes: string | null
  mood: number | null
  energy: number | null
  morning_completed: boolean
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type TimeBlock = {
  id: string
  daily_plan_id: string
  title: string
  category: string | null
  start_time: string
  end_time: string
  is_done: boolean
  sort_order: number
}

export type ChecklistItem = {
  id: string
  daily_plan_id: string
  title: string
  is_done: boolean
  sort_order: number
}

export type PlannerTask = {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  scheduled_date: string | null
  recurrence_rule: string | null
  completed_at: string | null
  created_at: string
}

export type MorningRoutineDayItem = {
  id: string
  title: string
  sort_order: number
  is_done: boolean
}

export type HabitDayItem = {
  id: string
  name: string
  cadence: HabitCadence
  color: string | null
  is_done: boolean
  streak: number
}

export type DayView = {
  plan: DailyPlan
  time_blocks: TimeBlock[]
  checklist: ChecklistItem[]
  tasks: PlannerTask[]
  morning_routine: MorningRoutineDayItem[]
  habits: HabitDayItem[]
}

export type CalendarDay = {
  date: string
  has_plan: boolean
  tasks_count: number
  blocks_count: number
  habits_done: number
  habits_total: number
}

export type PlannerStats = {
  tasks_completed_7d: number
  tasks_created_7d: number
  completion_rate_7d: number
  habits_completed_7d: number
  time_blocks_done_7d: number
  morning_routine_days_7d: number
  current_habit_streak_best: number
}

export type Habit = {
  id: string
  name: string
  cadence: HabitCadence
  target_per_period: number
  is_active: boolean
  color: string | null
}

export type MorningRoutineItem = {
  id: string
  title: string
  sort_order: number
  is_active: boolean
}
