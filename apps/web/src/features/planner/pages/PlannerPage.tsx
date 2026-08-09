import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

import {
  addDays,
  endOfMonth,
  startOfMonth,
  toDateKey,
  usePlannerCalendar,
  usePlannerDay,
  usePlannerMutations,
  usePlannerStats,
} from "@/features/planner/hooks"
import type { RecurrenceRule, TaskPriority } from "@/features/planner/types"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { AITextarea } from "@/shared/components/AITextarea"

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

export function PlannerPage() {
  const [selected, setSelected] = useState(() => new Date())
  const dateKey = toDateKey(selected)
  const monthStart = startOfMonth(selected)
  const monthEnd = endOfMonth(selected)

  const dayQuery = usePlannerDay(dateKey)
  const calQuery = usePlannerCalendar(toDateKey(monthStart), toDateKey(monthEnd))
  const statsQuery = usePlannerStats()
  const m = usePlannerMutations(dateKey)

  const day = dayQuery.data
  const calMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof calQuery.data>[number]>()
    for (const row of calQuery.data ?? []) map.set(row.date, row)
    return map
  }, [calQuery.data])

  const [blockTitle, setBlockTitle] = useState("")
  const [blockStart, setBlockStart] = useState("09:00")
  const [blockEnd, setBlockEnd] = useState("10:00")
  const [checkTitle, setCheckTitle] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium")
  const [taskRecurrence, setTaskRecurrence] = useState<RecurrenceRule>("none")
  const [routineTitle, setRoutineTitle] = useState("")
  const [habitName, setHabitName] = useState("")
  const [notes, setNotes] = useState<string | null>(null)

  const notesValue = notes ?? day?.plan.notes ?? ""

  const monthCells = useMemo(() => {
    const first = startOfMonth(selected)
    const startPad = first.getDay()
    const daysInMonth = endOfMonth(selected).getDate()
    const cells: Array<Date | null> = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(selected.getFullYear(), selected.getMonth(), d))
    }
    return cells
  }, [selected])

  async function saveNotes() {
    await m.updateDay.mutateAsync({ notes: notesValue })
    setNotes(null)
  }

  function onAddBlock(e: FormEvent) {
    e.preventDefault()
    if (!blockTitle.trim()) return
    m.createBlock.mutate(
      {
        title: blockTitle.trim(),
        start_time: `${blockStart}:00`,
        end_time: `${blockEnd}:00`,
      },
      {
        onSuccess: () => setBlockTitle(""),
      },
    )
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Daily Planner</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {selected.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSelected((d) => addDays(d, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSelected(new Date())}>
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSelected((d) => addDays(d, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {dayQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-[1.35rem]" />
          <Skeleton className="h-48 rounded-[1.35rem]" />
        </div>
      ) : dayQuery.isError ? (
        <p className="text-sm text-destructive">Failed to load planner day.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 md:gap-5">
          <div className="space-y-4 xl:col-span-8">
            <Panel title="Morning Routine">
              <ul className="space-y-2">
                {(day?.morning_routine ?? []).map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      className={cn(
                        "size-5 rounded-full border border-foreground/25",
                        item.is_done && "bg-foreground",
                      )}
                      onClick={() =>
                        m.toggleRoutine.mutate({ id: item.id, is_done: !item.is_done })
                      }
                    />
                    <span className={cn("flex-1 text-sm", item.is_done && "text-muted-foreground line-through")}>
                      {item.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => m.deleteRoutine.mutate(item.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!routineTitle.trim()) return
                  m.createRoutine.mutate(routineTitle.trim(), {
                    onSuccess: () => setRoutineTitle(""),
                  })
                }}
              >
                <Input
                  value={routineTitle}
                  onChange={(e) => setRoutineTitle(e.target.value)}
                  placeholder="Add morning step…"
                />
                <Button type="submit" size="icon" variant="secondary">
                  <Plus className="size-4" />
                </Button>
              </form>
            </Panel>

            <Panel title="Time Blocking">
              <ul className="space-y-2">
                {(day?.time_blocks ?? []).map((block) => (
                  <li
                    key={block.id}
                    className="flex items-center gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2"
                  >
                    <button
                      type="button"
                      className={cn(
                        "size-5 rounded-full border border-foreground/25",
                        block.is_done && "bg-emerald-300",
                      )}
                      onClick={() =>
                        m.updateBlock.mutate({ id: block.id, body: { is_done: !block.is_done } })
                      }
                    />
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{block.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => m.deleteBlock.mutate(block.id)}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
              <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4" onSubmit={onAddBlock}>
                <Input
                  className="sm:col-span-2"
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="Block title"
                />
                <Input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
                  <Button type="submit" size="icon" variant="secondary">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </form>
            </Panel>

            <Panel title="Tasks & Recurring">
              <ul className="space-y-2">
                {(day?.tasks ?? []).map((task) => (
                  <li key={task.id} className="flex items-center gap-3 rounded-2xl px-1 py-1.5">
                    <button
                      type="button"
                      className={cn(
                        "size-5 rounded-full border border-foreground/25",
                        task.status === "done" && "bg-foreground",
                      )}
                      onClick={() =>
                        m.updateTask.mutate({
                          id: task.id,
                          body: { status: task.status === "done" ? "todo" : "done" },
                        })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", task.status === "done" && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {task.priority}
                        {task.recurrence_rule ? ` · ${task.recurrence_rule}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => m.deleteTask.mutate(task.id)}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!taskTitle.trim()) return
                  m.createTask.mutate(
                    {
                      title: taskTitle.trim(),
                      priority: taskPriority,
                      scheduled_date: dateKey,
                      recurrence_rule: taskRecurrence,
                    },
                    { onSuccess: () => setTaskTitle("") },
                  )
                }}
              >
                <Input
                  className="sm:col-span-2"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="New task"
                />
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <div className="flex gap-2">
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    value={taskRecurrence}
                    onChange={(e) => setTaskRecurrence(e.target.value as RecurrenceRule)}
                  >
                    <option value="none">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <Button type="submit" size="icon" variant="secondary">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </form>
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              <Panel title="Checklist">
                <ul className="space-y-2">
                  {(day?.checklist ?? []).map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <button
                        type="button"
                        className={cn(
                          "size-5 rounded-md border border-foreground/25",
                          item.is_done && "bg-sky-300",
                        )}
                        onClick={() =>
                          m.updateChecklist.mutate({
                            id: item.id,
                            body: { is_done: !item.is_done },
                          })
                        }
                      />
                      <span className={cn("flex-1 text-sm", item.is_done && "line-through text-muted-foreground")}>
                        {item.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => m.deleteChecklist.mutate(item.id)}
                      >
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!checkTitle.trim()) return
                    m.createChecklist.mutate(checkTitle.trim(), {
                      onSuccess: () => setCheckTitle(""),
                    })
                  }}
                >
                  <Input
                    value={checkTitle}
                    onChange={(e) => setCheckTitle(e.target.value)}
                    placeholder="Checklist item"
                  />
                  <Button type="submit" size="icon" variant="secondary">
                    <Plus className="size-4" />
                  </Button>
                </form>
              </Panel>

              <Panel
                title="Notes"
                action={
                  <Button type="button" size="sm" variant="secondary" onClick={() => void saveNotes()}>
                    Save
                  </Button>
                }
              >
                <AITextarea
                  fieldId="planner-day-notes"
                  fieldName="Day Notes"
                  fieldDescription="Turn day notes, intentions, and reflections into polished prose without inventing details."
                  showFieldTitle={false}
                  value={notesValue}
                  onChange={setNotes}
                  placeholder="Day notes, intentions, reflections…"
                  minHeight={144}
                />
                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={day?.plan.energy === n ? "default" : "outline"}
                      onClick={() => m.updateDay.mutate({ energy: n })}
                    >
                      E{n}
                    </Button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-4 xl:col-span-4">
            <Panel
              title="Calendar"
              action={
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setSelected(new Date(selected.getFullYear(), selected.getMonth() - 1, 1))
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setSelected(new Date(selected.getFullYear(), selected.getMonth() + 1, 1))
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <p className="mb-3 text-sm font-medium">
                {selected.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map((cell, idx) => {
                  if (!cell) return <div key={`e-${idx}`} />
                  const key = toDateKey(cell)
                  const meta = calMap.get(key)
                  const isSelected = key === dateKey
                  const isToday = key === toDateKey(new Date())
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(cell)}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-colors",
                        isSelected && "bg-foreground text-background",
                        !isSelected && isToday && "ring-1 ring-foreground/30",
                        !isSelected && "hover:bg-foreground/5",
                      )}
                    >
                      {cell.getDate()}
                      {meta && (meta.tasks_count > 0 || meta.blocks_count > 0) ? (
                        <span
                          className={cn(
                            "absolute bottom-1 size-1 rounded-full",
                            isSelected ? "bg-background" : "bg-sky-300",
                          )}
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </Panel>

            <Panel title="Habit Tracking">
              <ul className="space-y-2">
                {(day?.habits ?? []).map((habit) => (
                  <li key={habit.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      className={cn(
                        "size-5 rounded-full border border-foreground/25",
                        habit.is_done && "bg-emerald-300",
                      )}
                      onClick={() =>
                        m.toggleHabit.mutate({ id: habit.id, is_done: !habit.is_done })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{habit.name}</p>
                      <p className="text-[11px] text-muted-foreground">Streak {habit.streak}d</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => m.deleteHabit.mutate(habit.id)}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!habitName.trim()) return
                  m.createHabit.mutate(habitName.trim(), {
                    onSuccess: () => setHabitName(""),
                  })
                }}
              >
                <Input
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="New habit"
                />
                <Button type="submit" size="icon" variant="secondary">
                  <Plus className="size-4" />
                </Button>
              </form>
            </Panel>

            <Panel title="Statistics · 7 days">
              {statsQuery.isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : statsQuery.data ? (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Tasks done" value={String(statsQuery.data.tasks_completed_7d)} />
                  <Stat label="Completion" value={`${statsQuery.data.completion_rate_7d}%`} />
                  <Stat label="Habits" value={String(statsQuery.data.habits_completed_7d)} />
                  <Stat label="Best streak" value={`${statsQuery.data.current_habit_streak_best}d`} />
                  <Stat label="Blocks done" value={String(statsQuery.data.time_blocks_done_7d)} />
                  <Stat label="Morning days" value={String(statsQuery.data.morning_routine_days_7d)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No stats yet.</p>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-foreground/[0.03] px-3 py-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
