import { useState, type FormEvent, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  useGyms,
  useHealthCharts,
  useHealthDashboard,
  useHealthMutations,
  useNutrition,
  useSleep,
  useWater,
  useWeights,
  useWorkouts,
} from "@/features/health/hooks"
import type { MealType, WorkoutType } from "@/features/health/types"
import { ModuleHomeShell } from "@/features/modules/ModuleHomeShell"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"

type Tab = "dashboard" | "weight" | "training" | "water" | "nutrition" | "sleep"

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: number
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-card/70 p-3.5 backdrop-blur-xl">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          tone == null ? "" : tone >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full rounded-full bg-sky-300/80 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm"
const tooltipStyle = {
  background: "rgba(20,24,32,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function shortDate(iso: string) {
  return iso.slice(5)
}

export function HealthPage() {
  const [tab, setTab] = useState<Tab>("dashboard")
  const dash = useHealthDashboard()
  const charts = useHealthCharts(30)
  const weights = useWeights()
  const gyms = useGyms()
  const workouts = useWorkouts()
  const water = useWater()
  const nutrition = useNutrition()
  const sleep = useSleep()
  const m = useHealthMutations()

  const [wKg, setWKg] = useState("")
  const [wDate, setWDate] = useState(todayISO())

  const [gymName, setGymName] = useState("")
  const [gymDate, setGymDate] = useState(todayISO())
  const [gymMins, setGymMins] = useState("60")
  const [gymFeel, setGymFeel] = useState("4")

  const [woTitle, setWoTitle] = useState("")
  const [woType, setWoType] = useState<WorkoutType>("strength")
  const [woDate, setWoDate] = useState(todayISO())
  const [woMins, setWoMins] = useState("45")
  const [woCals, setWoCals] = useState("")

  const [waterMl, setWaterMl] = useState("250")
  const [waterDate, setWaterDate] = useState(todayISO())

  const [mealType, setMealType] = useState<MealType>("lunch")
  const [mealDesc, setMealDesc] = useState("")
  const [mealCals, setMealCals] = useState("")
  const [mealProtein, setMealProtein] = useState("")
  const [mealDate, setMealDate] = useState(todayISO())

  const [sleepDate, setSleepDate] = useState(todayISO())
  const [sleepHours, setSleepHours] = useState("7.5")
  const [sleepQuality, setSleepQuality] = useState("4")
  const [bedtime, setBedtime] = useState("23:00")
  const [wakeTime, setWakeTime] = useState("06:30")

  function onWeight(e: FormEvent) {
    e.preventDefault()
    if (!wKg) return
    m.createWeight.mutate(
      { logged_on: wDate, weight_kg: Number(wKg) },
      { onSuccess: () => setWKg("") },
    )
  }

  function onGym(e: FormEvent) {
    e.preventDefault()
    m.createGym.mutate(
      {
        session_on: gymDate,
        gym_name: gymName || null,
        duration_min: gymMins ? Number(gymMins) : null,
        feeling: gymFeel ? Number(gymFeel) : null,
      },
      {
        onSuccess: () => {
          setGymName("")
        },
      },
    )
  }

  function onWorkout(e: FormEvent) {
    e.preventDefault()
    if (!woTitle.trim()) return
    m.createWorkout.mutate(
      {
        title: woTitle.trim(),
        workout_type: woType,
        workout_on: woDate,
        duration_min: woMins ? Number(woMins) : null,
        calories: woCals ? Number(woCals) : null,
      },
      {
        onSuccess: () => {
          setWoTitle("")
          setWoCals("")
        },
      },
    )
  }

  function onWater(e: FormEvent) {
    e.preventDefault()
    if (!waterMl) return
    m.createWater.mutate({ logged_on: waterDate, amount_ml: Number(waterMl) })
  }

  function addQuickWater(ml: number) {
    m.createWater.mutate({ logged_on: todayISO(), amount_ml: ml })
  }

  function onMeal(e: FormEvent) {
    e.preventDefault()
    if (!mealDesc.trim()) return
    m.createNutrition.mutate(
      {
        logged_on: mealDate,
        meal_type: mealType,
        description: mealDesc.trim(),
        calories: mealCals ? Number(mealCals) : null,
        protein_g: mealProtein ? Number(mealProtein) : null,
      },
      {
        onSuccess: () => {
          setMealDesc("")
          setMealCals("")
          setMealProtein("")
        },
      },
    )
  }

  function onSleep(e: FormEvent) {
    e.preventDefault()
    if (!sleepHours) return
    m.createSleep.mutate(
      {
        sleep_date: sleepDate,
        duration_hours: Number(sleepHours),
        quality: sleepQuality ? Number(sleepQuality) : null,
        bedtime: bedtime || null,
        wake_time: wakeTime || null,
      },
      { onSuccess: () => {} },
    )
  }

  const weightChart = (charts.data?.weight ?? []).map((p) => ({
    date: shortDate(p.date),
    kg: p.value,
  }))
  const waterChart = (charts.data?.water ?? []).map((p) => ({
    date: shortDate(p.date),
    ml: p.value,
  }))
  const sleepChart = (charts.data?.sleep ?? []).map((p) => ({
    date: shortDate(p.date),
    hours: p.value,
  }))
  const calChart = (charts.data?.calories ?? []).map((p) => ({
    date: shortDate(p.date),
    kcal: p.value,
  }))
  const workoutChart = (charts.data?.workout_minutes ?? []).map((p) => ({
    date: shortDate(p.date),
    min: p.value,
  }))

  return (
    <ModuleHomeShell moduleId="health">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["weight", "Weight"],
            ["training", "Gym & Workout"],
            ["water", "Water"],
            ["nutrition", "Nutrition"],
            ["sleep", "Sleep"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          {dash.isLoading || !dash.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Stat
                  label="Weight"
                  value={
                    dash.data.latest_weight_kg != null
                      ? `${Number(dash.data.latest_weight_kg).toFixed(1)} kg`
                      : "—"
                  }
                />
                <Stat
                  label="Δ weight"
                  value={
                    dash.data.weight_change_kg != null
                      ? `${Number(dash.data.weight_change_kg) > 0 ? "+" : ""}${Number(dash.data.weight_change_kg).toFixed(1)} kg`
                      : "—"
                  }
                  tone={
                    dash.data.weight_change_kg != null
                      ? -Number(dash.data.weight_change_kg)
                      : undefined
                  }
                />
                <Stat
                  label="Water today"
                  value={`${dash.data.water_today_ml} ml`}
                />
                <Stat label="Calories" value={`${dash.data.calories_today}`} />
                <Stat
                  label="Sleep"
                  value={
                    dash.data.sleep_last_hours != null
                      ? `${Number(dash.data.sleep_last_hours)} h`
                      : "—"
                  }
                />
                <Stat
                  label="Workouts / wk"
                  value={`${dash.data.workouts_this_week}`}
                />
              </div>

              <Panel title={`Water · ${dash.data.water_pct}% of ${dash.data.water_goal_ml} ml`}>
                <ProgressBar value={dash.data.water_pct} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {[250, 500, 750].map((ml) => (
                    <Button key={ml} type="button" size="sm" variant="outline" onClick={() => addQuickWater(ml)}>
                      +{ml} ml
                    </Button>
                  ))}
                </div>
              </Panel>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Weight Trend">
                  <div className="h-52">
                    {weightChart.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Log weight to see progress.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weightChart}>
                          <defs>
                            <linearGradient id="wt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(125,211,252,0.45)" />
                              <stop offset="100%" stopColor="rgba(125,211,252,0)" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                            width={40}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="kg" stroke="rgba(125,211,252,0.95)" fill="url(#wt)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Panel>

                <Panel title="Sleep Hours">
                  <div className="h-52">
                    {sleepChart.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Log sleep to see the chart.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sleepChart}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={28} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="hours" fill="rgba(196,181,253,0.8)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Panel>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Water Intake (30d)">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={waterChart}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={40} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="ml"
                          stroke="rgba(110,231,183,0.95)"
                          fill="rgba(110,231,183,0.15)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Workout Minutes">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workoutChart}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={28} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="min" fill="rgba(253,186,116,0.8)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Stat label="Gym this week" value={String(dash.data.gym_this_week)} />
                <Stat label="Minutes this week" value={String(dash.data.workout_minutes_week)} />
                <Stat label="Protein today" value={`${dash.data.protein_today_g} g`} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "weight" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Log Weight">
              <form className="grid gap-2" onSubmit={onWeight}>
                <Input
                  placeholder="kg"
                  type="number"
                  step="0.1"
                  value={wKg}
                  onChange={(e) => setWKg(e.target.value)}
                  required
                />
                <Input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} />
                <Button type="submit">Save</Button>
              </form>
            </Panel>
          </div>
          <div className="space-y-4 xl:col-span-8">
            <Panel title="Weight Chart">
              <div className="h-52">
                {weightChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightChart}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={40} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="kg" stroke="rgba(125,211,252,0.95)" fill="rgba(125,211,252,0.15)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>
            <Panel title="History">
              {weights.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (weights.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries.</p>
              ) : (
                <ul className="space-y-2">
                  {(weights.data ?? []).map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <span>
                        {w.logged_on} · <span className="tabular-nums font-medium">{Number(w.weight_kg).toFixed(1)} kg</span>
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteWeight.mutate(w.id)}>
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "training" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Gym Session">
              <form className="grid gap-2" onSubmit={onGym}>
                <Input placeholder="Gym name" value={gymName} onChange={(e) => setGymName(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="date" value={gymDate} onChange={(e) => setGymDate(e.target.value)} />
                  <Input placeholder="Minutes" type="number" value={gymMins} onChange={(e) => setGymMins(e.target.value)} />
                  <Input placeholder="Feel 1-5" type="number" min={1} max={5} value={gymFeel} onChange={(e) => setGymFeel(e.target.value)} />
                </div>
                <Button type="submit">Log gym</Button>
              </form>
            </Panel>
            <Panel title="Workout">
              <form className="grid gap-2" onSubmit={onWorkout}>
                <Input placeholder="Title" value={woTitle} onChange={(e) => setWoTitle(e.target.value)} required />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <select className={selectClass} value={woType} onChange={(e) => setWoType(e.target.value as WorkoutType)}>
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="mobility">Mobility</option>
                    <option value="sport">Sport</option>
                    <option value="other">Other</option>
                  </select>
                  <Input type="date" value={woDate} onChange={(e) => setWoDate(e.target.value)} />
                  <Input placeholder="Minutes" type="number" value={woMins} onChange={(e) => setWoMins(e.target.value)} />
                  <Input placeholder="Calories" type="number" value={woCals} onChange={(e) => setWoCals(e.target.value)} />
                </div>
                <Button type="submit">Log workout</Button>
              </form>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Gym History">
              {gyms.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (gyms.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No gym sessions.</p>
              ) : (
                <ul className="space-y-2">
                  {(gyms.data ?? []).map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <span>
                        {g.session_on} · {g.gym_name || "Gym"}
                        {g.duration_min ? ` · ${g.duration_min}m` : ""}
                        {g.feeling ? ` · feel ${g.feeling}` : ""}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteGym.mutate(g.id)}>
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Workouts">
              {workouts.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (workouts.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No workouts.</p>
              ) : (
                <ul className="space-y-2">
                  {(workouts.data ?? []).map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <span>
                        {w.workout_on} · {w.title}{" "}
                        <span className="text-muted-foreground">· {w.workout_type}</span>
                        {w.duration_min ? ` · ${w.duration_min}m` : ""}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteWorkout.mutate(w.id)}>
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "water" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Log Water">
              <form className="grid gap-2" onSubmit={onWater}>
                <Input
                  placeholder="ml"
                  type="number"
                  value={waterMl}
                  onChange={(e) => setWaterMl(e.target.value)}
                  required
                />
                <Input type="date" value={waterDate} onChange={(e) => setWaterDate(e.target.value)} />
                <Button type="submit">Add</Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {[250, 500, 750, 1000].map((ml) => (
                  <Button key={ml} type="button" size="sm" variant="outline" onClick={() => addQuickWater(ml)}>
                    +{ml}
                  </Button>
                ))}
              </div>
            </Panel>
          </div>
          <div className="space-y-4 xl:col-span-8">
            <Panel title="Daily Water">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterChart}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="ml" fill="rgba(110,231,183,0.75)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Entries">
              {water.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (water.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries.</p>
              ) : (
                <ul className="space-y-2">
                  {(water.data ?? []).slice(0, 30).map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <span>
                        {w.logged_on} · <span className="tabular-nums">{w.amount_ml} ml</span>
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteWater.mutate(w.id)}>
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "nutrition" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Log Meal">
              <form className="grid gap-2" onSubmit={onMeal}>
                <select
                  className={selectClass}
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <Input
                  placeholder="Description"
                  value={mealDesc}
                  onChange={(e) => setMealDesc(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Calories"
                    type="number"
                    value={mealCals}
                    onChange={(e) => setMealCals(e.target.value)}
                  />
                  <Input
                    placeholder="Protein g"
                    type="number"
                    value={mealProtein}
                    onChange={(e) => setMealProtein(e.target.value)}
                  />
                </div>
                <Input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
                <Button type="submit">Add meal</Button>
              </form>
            </Panel>
          </div>
          <div className="space-y-4 xl:col-span-8">
            <Panel title="Calories (30d)">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calChart}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="kcal"
                      stroke="rgba(253,186,116,0.95)"
                      fill="rgba(253,186,116,0.15)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Meals">
              {nutrition.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (nutrition.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No meals logged.</p>
              ) : (
                <ul className="space-y-2">
                  {(nutrition.data ?? []).map((n) => (
                    <li
                      key={n.id}
                      className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <div>
                        <p>
                          {n.description}{" "}
                          <span className="text-muted-foreground">· {n.meal_type}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {n.logged_on}
                          {n.calories != null ? ` · ${n.calories} kcal` : ""}
                          {n.protein_g != null ? ` · ${n.protein_g}g protein` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => m.deleteNutrition.mutate(n.id)}
                      >
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "sleep" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Log Sleep">
              <form className="grid gap-2" onSubmit={onSleep}>
                <Input type="date" value={sleepDate} onChange={(e) => setSleepDate(e.target.value)} />
                <Input
                  placeholder="Hours"
                  type="number"
                  step="0.25"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
                  <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
                </div>
                <Input
                  placeholder="Quality 1-5"
                  type="number"
                  min={1}
                  max={5}
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(e.target.value)}
                />
                <Button type="submit">Save sleep</Button>
              </form>
            </Panel>
          </div>
          <div className="space-y-4 xl:col-span-8">
            <Panel title="Sleep Chart">
              <div className="h-52">
                {sleepChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sleep data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sleepChart}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={28} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="hours" fill="rgba(196,181,253,0.8)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>
            <Panel title="History">
              {sleep.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (sleep.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries.</p>
              ) : (
                <ul className="space-y-2">
                  {(sleep.data ?? []).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <span>
                        {s.sleep_date} · {Number(s.duration_hours)} h
                        {s.quality ? ` · Q${s.quality}` : ""}
                        {s.bedtime && s.wake_time ? ` · ${String(s.bedtime).slice(0, 5)}→${String(s.wake_time).slice(0, 5)}` : ""}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => m.deleteSleep.mutate(s.id)}>
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </ModuleHomeShell>
  )
}
