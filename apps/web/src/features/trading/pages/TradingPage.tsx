/**
 * Production Trading module — V2 Exact Experience.
 * Legacy UI remains at /trading/classic.
 */
import { useEffect } from "react"

import { TradingV2ConnectedLayout } from "@/features/trading/v2/TradingV2ConnectedLayout"

export function TradingPage() {
  useEffect(() => {
    const prev = document.title
    document.title = "Trading · Harry OS"
    return () => {
      document.title = prev
    }
  }, [])

  return <TradingV2ConnectedLayout />
}
