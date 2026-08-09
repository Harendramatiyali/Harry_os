export type WorkoutType = "strength" | "cardio" | "mobility" | "sport" | "other"
export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export type WeightLog = {
  id: string
  logged_on: string
  weight_kg: string | number
  notes: string | null
  created_at: string
  updated_at: string
}

export type GymSession = {
  id: string
  session_on: string
  gym_name: string | null
  duration_min: number | null
  feeling: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Workout = {
  id: string
  gym_session_id: string | null
  workout_on: string
  title: string
  workout_type: WorkoutType
  duration_min: number | null
  calories: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type WaterLog = {
  id: string
  logged_on: string
  amount_ml: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type NutritionLog = {
  id: string
  logged_on: string
  meal_type: MealType
  description: string
  calories: number | null
  protein_g: string | number | null
  carbs_g: string | number | null
  fat_g: string | number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type SleepLog = {
  id: string
  sleep_date: string
  bedtime: string | null
  wake_time: string | null
  duration_hours: string | number
  quality: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DayPoint = { date: string; value: number }

export type HealthDashboard = {
  water_goal_ml: number
  latest_weight_kg: string | number | null
  weight_change_kg: string | number | null
  water_today_ml: number
  water_pct: number
  calories_today: number
  protein_today_g: number
  sleep_last_hours: string | number | null
  sleep_last_quality: number | null
  workouts_this_week: number
  gym_this_week: number
  workout_minutes_week: number
  recent_workouts: Workout[]
  recent_weights: WeightLog[]
}

export type HealthCharts = {
  weight: DayPoint[]
  water: DayPoint[]
  sleep: DayPoint[]
  calories: DayPoint[]
  workout_minutes: DayPoint[]
}
