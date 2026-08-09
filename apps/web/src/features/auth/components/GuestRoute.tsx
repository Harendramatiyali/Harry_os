import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { Skeleton } from "@/shared/ui/skeleton"

/** Public auth pages — redirect away if already signed in. */
export function GuestRoute() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!bootstrapped) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
