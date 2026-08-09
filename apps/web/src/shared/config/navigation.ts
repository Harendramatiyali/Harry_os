import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  HeartPulse,
  LayoutDashboard,
  Library,
  LineChart,
  ListTodo,
  NotebookPen,
  Settings,
  Shield,
  Sparkles,
  Target,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

/** Static navigation shell — no data fetching. */
export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Planner", href: "/planner", icon: CalendarDays },
  { title: "Tasks", href: "/tasks", icon: ListTodo },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Trading", href: "/trading", icon: LineChart },
  { title: "Books", href: "/books", icon: BookOpen },
  { title: "Knowledge", href: "/knowledge", icon: Library },
  { title: "Finance", href: "/finance", icon: CircleDollarSign },
  { title: "Health", href: "/health", icon: HeartPulse },
  { title: "Career", href: "/career", icon: Briefcase },
  { title: "Notes", href: "/notes", icon: NotebookPen },
  { title: "AI", href: "/ai", icon: Sparkles },
  { title: "Admin", href: "/admin", icon: Shield, adminOnly: true },
]

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
]
