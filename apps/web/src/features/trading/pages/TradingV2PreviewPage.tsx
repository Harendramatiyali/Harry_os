/**
 * Legacy preview URL — redirects to production Trading V2.
 */
import { Navigate } from "react-router-dom"

export function TradingV2PreviewPage() {
  return <Navigate to="/trading" replace />
}
