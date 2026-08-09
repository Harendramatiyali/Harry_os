import { cn } from "@/shared/lib/utils"

type ProgressBarProps = {
  value: number
  className?: string
  barClassName?: string
}

export function ProgressBar({ value, className, barClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-foreground/10", className)}>
      <div
        className={cn("h-full rounded-full bg-foreground/80 transition-all duration-500", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
