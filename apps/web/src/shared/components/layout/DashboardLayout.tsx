import { Outlet } from "react-router-dom"

import { Footer } from "@/shared/components/layout/Footer"
import { GlobalSearch } from "@/shared/components/layout/GlobalSearch"
import { Header } from "@/shared/components/layout/Header"
import { Sidebar } from "@/shared/components/layout/Sidebar"
import { useUiStore } from "@/shared/stores/ui-store"
import { cn } from "@/shared/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet"

export function DashboardLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)

  return (
    <div className="flex min-h-svh w-full bg-background">
      <div
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 md:block",
          collapsed ? "w-[4.25rem]" : "w-64",
        )}
      >
        <Sidebar className="w-full" />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar className="w-full border-0" onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
        <Footer />
      </div>

      <GlobalSearch />
    </div>
  )
}
