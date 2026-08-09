import { useMemo } from "react"

import { useAuthStore } from "@/features/auth/store"

function formatGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardHero() {
  const user = useAuthStore((s) => s.user)
  const now = useMemo(() => new Date(), [])

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.12),transparent_55%),linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-5 py-6 md:px-8 md:py-8">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-sky-400/10 blur-3xl" />
      <p className="text-sm text-muted-foreground">{dateLabel}</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
        {formatGreeting(now)}
        {user?.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-[15px]">
        Your day at a glance — plan, execute, review. Calm focus across life domains.
      </p>
    </div>
  )
}
