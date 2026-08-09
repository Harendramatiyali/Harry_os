import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"

import { mainNav, secondaryNav } from "@/shared/config/navigation"
import { useAuthStore } from "@/features/auth/store"
import { useUiStore } from "@/shared/stores/ui-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { Input } from "@/shared/ui/input"

/** Presentational global search — filters static nav labels only. */
export function GlobalSearch() {
  const open = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const toggleSearch = useUiStore((s) => s.toggleSearch)
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  const role = useAuthStore((s) => s.user?.role)
  const items = useMemo(
    () =>
      [...mainNav, ...secondaryNav].filter((item) => !item.adminOnly || role === "admin"),
    [role],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.title.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        toggleSearch()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSearch])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
          <DialogDescription>Jump to a section of Harry OS</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            className="h-12 border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            results.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      navigate(item.href)
                      setSearchOpen(false)
                    }}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
