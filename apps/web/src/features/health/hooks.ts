import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { healthApi } from "@/features/health/api"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function useHealthDashboard() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "dashboard"],
    queryFn: () => healthApi.dashboard(token!),
    enabled: Boolean(token),
  })
}

export function useHealthCharts(days = 30) {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "charts", days],
    queryFn: () => healthApi.charts(token!, days),
    enabled: Boolean(token),
  })
}

export function useWeights() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "weight"],
    queryFn: () => healthApi.listWeights(token!),
    enabled: Boolean(token),
  })
}

export function useGyms() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "gym"],
    queryFn: () => healthApi.listGyms(token!),
    enabled: Boolean(token),
  })
}

export function useWorkouts() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "workouts"],
    queryFn: () => healthApi.listWorkouts(token!),
    enabled: Boolean(token),
  })
}

export function useWater() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "water"],
    queryFn: () => healthApi.listWater(token!),
    enabled: Boolean(token),
  })
}

export function useNutrition() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "nutrition"],
    queryFn: () => healthApi.listNutrition(token!),
    enabled: Boolean(token),
  })
}

export function useSleep() {
  const token = useToken()
  return useQuery({
    queryKey: ["health", "sleep"],
    queryFn: () => healthApi.listSleep(token!),
    enabled: Boolean(token),
  })
}

export function useHealthMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["health"] })
  }

  return {
    createWeight: useMutation({
      mutationFn: (body: Record<string, unknown>) => healthApi.createWeight(body, token),
      onSuccess: invalidate,
    }),
    deleteWeight: useMutation({
      mutationFn: (id: string) => healthApi.deleteWeight(id, token),
      onSuccess: invalidate,
    }),
    createGym: useMutation({
      mutationFn: (body: Record<string, unknown>) => healthApi.createGym(body, token),
      onSuccess: invalidate,
    }),
    deleteGym: useMutation({
      mutationFn: (id: string) => healthApi.deleteGym(id, token),
      onSuccess: invalidate,
    }),
    createWorkout: useMutation({
      mutationFn: (body: Record<string, unknown>) => healthApi.createWorkout(body, token),
      onSuccess: invalidate,
    }),
    deleteWorkout: useMutation({
      mutationFn: (id: string) => healthApi.deleteWorkout(id, token),
      onSuccess: invalidate,
    }),
    createWater: useMutation({
      mutationFn: (body: Record<string, unknown>) => healthApi.createWater(body, token),
      onSuccess: invalidate,
    }),
    deleteWater: useMutation({
      mutationFn: (id: string) => healthApi.deleteWater(id, token),
      onSuccess: invalidate,
    }),
    createNutrition: useMutation({
      mutationFn: (body: Record<string, unknown>) => healthApi.createNutrition(body, token),
      onSuccess: invalidate,
    }),
    deleteNutrition: useMutation({
      mutationFn: (id: string) => healthApi.deleteNutrition(id, token),
      onSuccess: invalidate,
    }),
    createSleep: useMutation({
      mutationFn: (body: Record<string, unknown>) => healthApi.createSleep(body, token),
      onSuccess: invalidate,
    }),
    deleteSleep: useMutation({
      mutationFn: (id: string) => healthApi.deleteSleep(id, token),
      onSuccess: invalidate,
    }),
  }
}
