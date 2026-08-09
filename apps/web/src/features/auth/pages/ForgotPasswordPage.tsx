import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"

import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { authApi } from "@/features/auth/api"
import { ApiError } from "@/shared/api/types"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [debugUrl, setDebugUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setDebugUrl(null)
    setPending(true)
    try {
      const result = await authApi.forgotPassword(email)
      setMessage(result.message)
      if (result.reset_url) setDebugUrl(result.reset_url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We'll send reset instructions if the account exists"
      footer={
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {debugUrl ? (
          <p className="break-all rounded-md bg-muted p-3 text-xs">
            Dev reset link:{" "}
            <Link to={debugUrl.replace(/^https?:\/\/[^/]+/, "")} className="underline">
              Open reset page
            </Link>
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  )
}
