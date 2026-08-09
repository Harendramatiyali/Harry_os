import { ChevronDown, ChevronUp } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

const STORAGE_KEY = "harry-os.cj.trade-section-collapse"

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

function writeCollapsed(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function ReviewSectionCard({
  id,
  title,
  aiAssist = false,
  defaultOpen = true,
  children,
  actions,
}: {
  id: string
  title: string
  aiAssist?: boolean
  defaultOpen?: boolean
  children: ReactNode
  actions?: ReactNode
}) {
  const [open, setOpen] = useState(() => {
    const stored = readCollapsed()[id]
    return stored == null ? defaultOpen : !stored
  })

  useEffect(() => {
    const map = readCollapsed()
    map[id] = !open
    writeCollapsed(map)
  }, [id, open])

  return (
    <section className="trw-card" data-open={open ? "true" : "false"}>
      <header className="trw-card-head">
        <button
          type="button"
          className="trw-card-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="trw-card-title">{title}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="trw-card-actions">
          {aiAssist ? (
            <button type="button" className="cj-ai-assist">
              Writing Copilot
            </button>
          ) : null}
          {actions}
        </div>
      </header>
      {open ? <div className="trw-card-body">{children}</div> : null}
    </section>
  )
}
