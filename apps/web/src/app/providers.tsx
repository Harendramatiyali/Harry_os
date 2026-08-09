import { useEffect, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { TooltipProvider } from "@/shared/ui/tooltip"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

function AuthBootstrap({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const bootstrapped = useAuthStore((s) => s.bootstrapped)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (!bootstrapped) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
        <p>Loading Harry OS…</p>
        <p className="text-xs opacity-80">If this is the first visit, the API may take up to a minute to wake.</p>
      </div>
    )
  }

  return children
}

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
