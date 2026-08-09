import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { plannerApi } from "@/features/planner/api"
import { useAuthStore } from "@/features/auth/store"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function usePlannerDay(date: string) {
  const token = useToken()
  return useQuery({
    queryKey: ["planner", "day", date],
    queryFn: () => plannerApi.getDay(date, token!),
    enabled: Boolean(token && date),
  })
}

export function usePlannerCalendar(start: string, end: string) {
  const token = useToken()
  return useQuery({
    queryKey: ["planner", "calendar", start, end],
    queryFn: () => plannerApi.calendar(start, end, token!),
    enabled: Boolean(token && start && end),
  })
}

export function usePlannerStats() {
  const token = useToken()
  return useQuery({
    queryKey: ["planner", "stats"],
    queryFn: () => plannerApi.stats(token!),
    enabled: Boolean(token),
  })
}

export function usePlannerMutations(date: string) {
  const token = useToken()!
  const qc = useQueryClient()

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["planner"] })
  }

  return {
    updateDay: useMutation({
      mutationFn: (body: Parameters<typeof plannerApi.updateDay>[1]) =>
        plannerApi.updateDay(date, body, token),
      onSuccess: invalidate,
    }),
    createBlock: useMutation({
      mutationFn: (body: Parameters<typeof plannerApi.createBlock>[1]) =>
        plannerApi.createBlock(date, body, token),
      onSuccess: invalidate,
    }),
    updateBlock: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Parameters<typeof plannerApi.updateBlock>[1] }) =>
        plannerApi.updateBlock(id, body, token),
      onSuccess: invalidate,
    }),
    deleteBlock: useMutation({
      mutationFn: (id: string) => plannerApi.deleteBlock(id, token),
      onSuccess: invalidate,
    }),
    createChecklist: useMutation({
      mutationFn: (title: string) => plannerApi.createChecklist(date, { title }, token),
      onSuccess: invalidate,
    }),
    updateChecklist: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Parameters<typeof plannerApi.updateChecklist>[1] }) =>
        plannerApi.updateChecklist(id, body, token),
      onSuccess: invalidate,
    }),
    deleteChecklist: useMutation({
      mutationFn: (id: string) => plannerApi.deleteChecklist(id, token),
      onSuccess: invalidate,
    }),
    createRoutine: useMutation({
      mutationFn: (title: string) => plannerApi.createRoutine({ title }, token),
      onSuccess: invalidate,
    }),
    deleteRoutine: useMutation({
      mutationFn: (id: string) => plannerApi.deleteRoutine(id, token),
      onSuccess: invalidate,
    }),
    toggleRoutine: useMutation({
      mutationFn: ({ id, is_done }: { id: string; is_done: boolean }) =>
        plannerApi.toggleRoutine(date, id, is_done, token),
      onSuccess: invalidate,
    }),
    createTask: useMutation({
      mutationFn: (body: Parameters<typeof plannerApi.createTask>[0]) =>
        plannerApi.createTask(body, token),
      onSuccess: invalidate,
    }),
    updateTask: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Parameters<typeof plannerApi.updateTask>[1] }) =>
        plannerApi.updateTask(id, body, token),
      onSuccess: invalidate,
    }),
    deleteTask: useMutation({
      mutationFn: (id: string) => plannerApi.deleteTask(id, token),
      onSuccess: invalidate,
    }),
    createHabit: useMutation({
      mutationFn: (name: string) => plannerApi.createHabit({ name, cadence: "daily" }, token),
      onSuccess: invalidate,
    }),
    deleteHabit: useMutation({
      mutationFn: (id: string) => plannerApi.deleteHabit(id, token),
      onSuccess: invalidate,
    }),
    toggleHabit: useMutation({
      mutationFn: ({ id, is_done }: { id: string; is_done: boolean }) =>
        plannerApi.toggleHabit(date, id, is_done, token),
      onSuccess: invalidate,
    }),
  }
}

export function toDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number) {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
