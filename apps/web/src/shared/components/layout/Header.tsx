import { Link, useNavigate } from "react-router-dom"
import { Menu, Search, Shield } from "lucide-react"

import { useAuthStore } from "@/features/auth/store"
import { useUiStore } from "@/shared/stores/ui-store"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

export function Header() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const initials =
    user?.display_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full max-w-md justify-start gap-2 text-muted-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate text-sm">Search Harry OS…</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </Button>
      </div>

      {user?.role === "admin" ? (
        <Button type="button" variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
          <Link to="/admin">
            <Shield className="size-4" />
            Admin
          </Link>
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" className="relative h-9 gap-2 rounded-full px-1.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[8rem] truncate text-sm md:inline">
              {user?.display_name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="space-y-1">
            <div>{user?.display_name}</div>
            <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
            {user?.role ? (
              <Badge className="mt-1 capitalize">{user.role}</Badge>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/change-password")}>
            Change password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/settings")}>Settings</DropdownMenuItem>
          {user?.role === "admin" ? (
            <DropdownMenuItem onSelect={() => navigate("/admin")}>Admin</DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void logout().then(() => navigate("/login", { replace: true }))
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
