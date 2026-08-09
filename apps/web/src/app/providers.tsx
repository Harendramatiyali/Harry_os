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
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading Harry OS…
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
