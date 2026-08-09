import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"

export function AdminRoute() {
  const user = useAuthStore((s) => s.user)

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
