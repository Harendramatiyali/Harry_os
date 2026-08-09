import { apiRequest } from "@/shared/api/client"
import type {
  CalendarDay,
  ChecklistItem,
  DailyPlan,
  DayView,
  Habit,
  HabitDayItem,
  MorningRoutineDayItem,
  MorningRoutineItem,
  PlannerStats,
  PlannerTask,
  RecurrenceRule,
  TaskPriority,
  TaskStatus,
  TimeBlock,
} from "@/features/planner/types"

export const plannerApi = {
  getDay(date: string, token: string) {
    return apiRequest<DayView>(`/planner/days/${date}`, { accessToken: token })
  },

  updateDay(
    date: string,
    body: Partial<{ notes: string; mood: number; energy: number; morning_completed: boolean }>,
    token: string,
  ) {
    return apiRequest<DailyPlan>(`/planner/days/${date}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },

  calendar(start: string, end: string, token: string) {
    return apiRequest<CalendarDay[]>(
      `/planner/calendar?start=${start}&end=${end}`,
      { accessToken: token },
    )
  },

  stats(token: string) {
    return apiRequest<PlannerStats>("/planner/stats", { accessToken: token })
  },

  createBlock(
    date: string,
    body: { title: string; category?: string; start_time: string; end_time: string },
    token: string,
  ) {
    return apiRequest<TimeBlock>(`/planner/days/${date}/blocks`, {
      body,
      accessToken: token,
    })
  },

  updateBlock(id: string, body: Partial<TimeBlock>, token: string) {
    return apiRequest<TimeBlock>(`/planner/blocks/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },

  deleteBlock(id: string, token: string) {
    return apiRequest<void>(`/planner/blocks/${id}`, { method: "DELETE", accessToken: token })
  },

  createChecklist(date: string, body: { title: string }, token: string) {
    return apiRequest<ChecklistItem>(`/planner/days/${date}/checklist`, {
      body,
      accessToken: token,
    })
  },

  updateChecklist(id: string, body: Partial<ChecklistItem>, token: string) {
    return apiRequest<ChecklistItem>(`/planner/checklist/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },

  deleteChecklist(id: string, token: string) {
    return apiRequest<void>(`/planner/checklist/${id}`, { method: "DELETE", accessToken: token })
  },

  listRoutine(token: string) {
    return apiRequest<MorningRoutineItem[]>("/planner/morning-routine", { accessToken: token })
  },

  createRoutine(body: { title: string }, token: string) {
    return apiRequest<MorningRoutineItem>("/planner/morning-routine", {
      body,
      accessToken: token,
    })
  },

  deleteRoutine(id: string, token: string) {
    return apiRequest<void>(`/planner/morning-routine/${id}`, {
      method: "DELETE",
      accessToken: token,
    })
  },

  toggleRoutine(date: string, id: string, is_done: boolean, token: string) {
    return apiRequest<MorningRoutineDayItem>(
      `/planner/days/${date}/morning-routine/${id}/toggle`,
      { body: { is_done }, accessToken: token },
    )
  },

  createTask(
    body: {
      title: string
      priority?: TaskPriority
      scheduled_date?: string
      due_date?: string
      recurrence_rule?: RecurrenceRule
      notes?: string
    },
    token: string,
  ) {
    return apiRequest<PlannerTask>("/planner/tasks", { body, accessToken: token })
  },

  updateTask(
    id: string,
    body: Partial<{
      title: string
      status: TaskStatus
      priority: TaskPriority
      scheduled_date: string | null
      recurrence_rule: RecurrenceRule
    }>,
    token: string,
  ) {
    return apiRequest<PlannerTask>(`/planner/tasks/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },

  deleteTask(id: string, token: string) {
    return apiRequest<void>(`/planner/tasks/${id}`, { method: "DELETE", accessToken: token })
  },

  createHabit(body: { name: string; cadence?: string }, token: string) {
    return apiRequest<Habit>("/planner/habits", { body, accessToken: token })
  },

  deleteHabit(id: string, token: string) {
    return apiRequest<void>(`/planner/habits/${id}`, { method: "DELETE", accessToken: token })
  },

  toggleHabit(date: string, id: string, is_done: boolean, token: string) {
    return apiRequest<HabitDayItem>(`/planner/days/${date}/habits/${id}/toggle`, {
      body: { is_done },
      accessToken: token,
    })
  },
}
