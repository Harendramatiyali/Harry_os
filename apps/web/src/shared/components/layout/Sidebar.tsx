import type { ComponentType } from "react"
import { NavLink } from "react-router-dom"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { mainNav, secondaryNav } from "@/shared/config/navigation"
import { useAuthStore } from "@/features/auth/store"
import { useUiStore } from "@/shared/stores/ui-store"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Separator } from "@/shared/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip"

type SidebarProps = {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed)
  const role = useAuthStore((s) => s.user?.role)
  const visibleMainNav = mainNav.filter((item) => !item.adminOnly || role === "admin")

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-sidebar-border px-3",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          H
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
              Harry OS
            </p>
            <p className="truncate text-[11px] text-muted-foreground">Life Operating System</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {visibleMainNav.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              title={item.title}
              icon={item.icon}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
        <Separator className="my-3" />
        <nav className="flex flex-col gap-1">
          {secondaryNav.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              title={item.title}
              icon={item.icon}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>

      <div className="hidden border-t border-sidebar-border p-2 md:block">
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("w-full", !collapsed && "justify-start")}
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  title,
  icon: Icon,
  collapsed,
  onNavigate,
}: {
  href: string
  title: string
  icon: ComponentType<{ className?: string }>
  collapsed: boolean
  onNavigate?: () => void
}) {
  const link = (
    <NavLink
      to={href}
      end={href === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
          collapsed && "justify-center px-2",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{title}</span>}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  )
}
