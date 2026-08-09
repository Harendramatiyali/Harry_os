import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { authApi } from "@/features/auth/api"
import { ApiError } from "@/shared/api/types"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const tokenFromQuery = useMemo(() => params.get("token") ?? "", [params])
  const navigate = useNavigate()

  const [token, setToken] = useState(tokenFromQuery)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setPending(true)
    try {
      await authApi.resetPassword({ token, new_password: password })
      navigate("/login", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset password")
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your account"
      footer={
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {!tokenFromQuery ? (
          <div className="space-y-2">
            <Label htmlFor="token">Reset token</Label>
            <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending || !token}>
          {pending ? "Updating…" : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  )
}
