/**
 * Mockup-accurate chrome for the 5-step AI Import flow.
 * Visual contract: single dark cards, module accent, icon progress rail.
 */
import type { ReactNode } from "react"
import {
  AlertCircle,
  Brain,
  Check,
  CheckCircle2,
  CloudUpload,
  FileEdit,
  Info,
  Loader2,
  ScanSearch,
} from "lucide-react"

import { useModuleManifest } from "@/features/modules"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

export const IMPORT_STEPS = [
  {
    id: "upload",
    label: "Upload",
    hint: "Upload your handwritten notes",
    Icon: CloudUpload,
  },
  {
    id: "process",
    label: "Processing",
    hint: "AI reads and understands",
    Icon: ScanSearch,
  },
  {
    id: "understand",
    label: "AI Understanding",
    hint: "AI detects content & suggests destination",
    Icon: Brain,
  },
  {
    id: "review",
    label: "Review & Edit",
    hint: "Review, edit, and confirm",
    Icon: FileEdit,
  },
  {
    id: "save",
    label: "Save Success",
    hint: "Knowledge saved successfully",
    Icon: CheckCircle2,
  },
] as const

export type ImportStepId = (typeof IMPORT_STEPS)[number]["id"]

/** Slim shell: progress rail + optional back — no giant page titles (mockup cards carry the UI). */
export function ImportShell({
  eyebrow,
  title,
  description,
  actions,
  step,
  backHref,
  backLabel = "Back",
  onBack,
  children,
  className,
  compact = false,
}: {
  eyebrow?: string
  title?: string
  description?: string
  actions?: ReactNode
  step?: ImportStepId
  backHref?: string
  backLabel?: string
  onBack?: () => void
  children: ReactNode
  className?: string
  /** When true, hide the large title block (mockup-style centered cards). */
  compact?: boolean
}) {
  const manifest = useModuleManifest()
  const showBack = Boolean(backHref || onBack)
  const resolvedEyebrow = eyebrow ?? manifest.import.upload.eyebrow
  const showTitle = !compact && Boolean(title)

  return (
    <div className={cn("relative isolate space-y-6 animate-in fade-in duration-500", className)}>
      <div
        aria-hidden
        className="module-glow pointer-events-none absolute -inset-x-6 -top-8 h-40 rounded-[2rem]"
      />

      {(showBack || showTitle || actions) && (
        <header className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            {showBack ? (
              onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="-ml-2 h-8 gap-1.5 rounded-xl px-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  {backLabel}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  asChild
                  className="-ml-2 h-8 gap-1.5 rounded-xl px-2 text-muted-foreground hover:text-foreground"
                >
                  <Link to={backHref!}>
                    <ArrowLeft className="size-3.5" />
                    {backLabel}
                  </Link>
                </Button>
              )
            ) : null}
            {showTitle ? (
              <>
                <p
                  className="text-[11px] font-medium tracking-[0.18em] uppercase"
                  style={{ color: "var(--module-muted)" }}
                >
                  {resolvedEyebrow}
                </p>
                <h1 className="module-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight md:text-[2rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-xl text-sm leading-relaxed" style={{ color: "var(--module-muted)" }}>
                    {description}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
          {actions ? <div className="relative flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      )}

      {step ? <ImportProgress current={step} /> : null}

      <div className="relative space-y-5">{children}</div>
    </div>
  )
}

export function ImportCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={cn(
        "module-card border shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-2xl transition-colors duration-300",
        padded && "p-5 md:p-7",
        className,
      )}
    >
      {children}
    </section>
  )
}

/** Top progress rail matching the mockup (icon + label + hint). */
export function ImportProgress({ current }: { current: ImportStepId }) {
  const activeIndex = IMPORT_STEPS.findIndex((s) => s.id === current)
  return (
    <nav
      aria-label="Import progress"
      className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c0f14]/90 px-2 py-3 backdrop-blur-xl md:px-4"
    >
      <ol className="flex min-w-[640px] items-stretch gap-0 md:min-w-0">
        {IMPORT_STEPS.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          const Icon = step.Icon
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <div
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center transition-all duration-300",
                  active && "bg-white/[0.05]",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border transition-all duration-300",
                    done && "border-transparent",
                    active && "border-transparent text-black shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
                    !done && !active && "border-white/10 text-muted-foreground",
                  )}
                  style={
                    done
                      ? { background: "var(--module-accent-soft)", color: "var(--module-accent)" }
                      : active
                        ? { background: "var(--module-accent)" }
                        : undefined
                  }
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-wide md:text-[12px]",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="hidden max-w-[9rem] text-[10px] leading-snug text-muted-foreground/80 lg:block">
                  {step.hint}
                </span>
              </div>
              {index < IMPORT_STEPS.length - 1 ? (
                <span
                  className={cn(
                    "mx-0.5 hidden h-px w-6 shrink-0 sm:block md:w-8",
                    done ? "module-progress-fill opacity-70" : "bg-white/10",
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function ImportStatus({
  tone,
  title,
  children,
}: {
  tone: "success" | "error" | "info" | "progress"
  title: string
  children?: ReactNode
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "error"
        ? AlertCircle
        : tone === "progress"
          ? Loader2
          : Info

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3.5 animate-in fade-in slide-in-from-top-1 duration-300",
        tone === "success" && "border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-100",
        tone === "error" && "border-rose-400/25 bg-rose-500/[0.08] text-rose-100",
        tone === "info" && "border-sky-400/20 bg-sky-500/[0.08] text-sky-100",
        tone === "progress" && "border-white/10 bg-white/[0.04] text-foreground/90",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "progress" && "animate-spin text-muted-foreground",
        )}
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium tracking-tight">{title}</p>
        {children ? <div className="text-[13px] leading-relaxed opacity-85">{children}</div> : null}
      </div>
    </div>
  )
}

export function ImportEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[1.35rem] border border-dashed border-white/12 bg-black/15 px-6 py-14 text-center animate-in fade-in zoom-in-95 duration-400">
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="max-w-sm space-y-1.5">
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          {title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function ImportLoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
      <div className="relative flex size-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-white/10" />
        <span className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-[color:var(--module-accent)]" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function ImportErrorState({
  title,
  description,
  action,
  href = "/ai/imports",
  actionLabel = "Back to Upload",
}: {
  title: string
  description: string
  action?: ReactNode
  href?: string
  actionLabel?: string
}) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <ImportStatus tone="error" title={title}>
        {description}
      </ImportStatus>
      {action ?? (
        <Button type="button" variant="outline" asChild className="rounded-xl">
          <Link to={href}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}

/** Circular progress ring — mockup Processing step. */
export function ProcessingPanel({
  active,
  label,
  percent = 0,
  lines,
}: {
  active: boolean
  label: string
  percent?: number
  lines?: string[]
}) {
  if (!active) return null
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const statusLines = lines ?? ["Scanning...", "Analyzing handwriting...", label]

  return (
    <ImportCard className="mx-auto flex max-w-md flex-col items-center !p-8 md:!p-10">
      <div className="relative flex size-40 items-center justify-center">
        <svg className="size-40 -rotate-90" viewBox="0 0 128 128" aria-hidden>
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="var(--module-accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <span
          className="absolute text-3xl font-semibold tracking-tight"
          style={{ color: "var(--module-accent)" }}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-6 space-y-1.5 text-center">
        {statusLines.map((line) => (
          <p key={line} className="text-sm" style={{ color: "var(--module-muted)" }}>
            {line}
          </p>
        ))}
      </div>
    </ImportCard>
  )
}
