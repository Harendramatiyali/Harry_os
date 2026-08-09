import { Link } from "react-router-dom"
import type { ReactNode } from "react"

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              H
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Harry OS
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  )
}
