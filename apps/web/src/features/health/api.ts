import { apiRequest } from "@/shared/api/client"
import type {
  GymSession,
  HealthCharts,
  HealthDashboard,
  NutritionLog,
  SleepLog,
  WaterLog,
  WeightLog,
  Workout,
} from "@/features/health/types"

export const healthApi = {
  dashboard(token: string) {
    return apiRequest<HealthDashboard>("/health/dashboard", { accessToken: token })
  },
  charts(token: string, days = 30) {
    return apiRequest<HealthCharts>(`/health/charts?days=${days}`, { accessToken: token })
  },

  listWeights(token: string) {
    return apiRequest<WeightLog[]>("/health/weight", { accessToken: token })
  },
  createWeight(body: Record<string, unknown>, token: string) {
    return apiRequest<WeightLog>("/health/weight", { body, accessToken: token })
  },
  deleteWeight(id: string, token: string) {
    return apiRequest<void>(`/health/weight/${id}`, { method: "DELETE", accessToken: token })
  },

  listGyms(token: string) {
    return apiRequest<GymSession[]>("/health/gym", { accessToken: token })
  },
  createGym(body: Record<string, unknown>, token: string) {
    return apiRequest<GymSession>("/health/gym", { body, accessToken: token })
  },
  deleteGym(id: string, token: string) {
    return apiRequest<void>(`/health/gym/${id}`, { method: "DELETE", accessToken: token })
  },

  listWorkouts(token: string) {
    return apiRequest<Workout[]>("/health/workouts", { accessToken: token })
  },
  createWorkout(body: Record<string, unknown>, token: string) {
    return apiRequest<Workout>("/health/workouts", { body, accessToken: token })
  },
  deleteWorkout(id: string, token: string) {
    return apiRequest<void>(`/health/workouts/${id}`, { method: "DELETE", accessToken: token })
  },

  listWater(token: string) {
    return apiRequest<WaterLog[]>("/health/water", { accessToken: token })
  },
  createWater(body: Record<string, unknown>, token: string) {
    return apiRequest<WaterLog>("/health/water", { body, accessToken: token })
  },
  deleteWater(id: string, token: string) {
    return apiRequest<void>(`/health/water/${id}`, { method: "DELETE", accessToken: token })
  },

  listNutrition(token: string) {
    return apiRequest<NutritionLog[]>("/health/nutrition", { accessToken: token })
  },
  createNutrition(body: Record<string, unknown>, token: string) {
    return apiRequest<NutritionLog>("/health/nutrition", { body, accessToken: token })
  },
  deleteNutrition(id: string, token: string) {
    return apiRequest<void>(`/health/nutrition/${id}`, { method: "DELETE", accessToken: token })
  },

  listSleep(token: string) {
    return apiRequest<SleepLog[]>("/health/sleep", { accessToken: token })
  },
  createSleep(body: Record<string, unknown>, token: string) {
    return apiRequest<SleepLog>("/health/sleep", { body, accessToken: token })
  },
  deleteSleep(id: string, token: string) {
    return apiRequest<void>(`/health/sleep/${id}`, { method: "DELETE", accessToken: token })
  },
}
