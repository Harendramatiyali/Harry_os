import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { Skeleton } from "@/shared/ui/skeleton"

export function ProtectedRoute() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!bootstrapped) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
