import { useState, type FormEvent } from "react"

import { useAuthStore } from "@/features/auth/store"
import { PageHeader } from "@/shared/components/layout/PageHeader"
import { ApiError } from "@/shared/api/types"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

export function ChangePasswordPage() {
  const changePassword = useAuthStore((s) => s.changePassword)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirm) {
      setError("Passwords do not match")
      return
    }
    setPending(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirm("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to change password")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Change password"
        description="Update the password for your Harry OS account."
      />
      <form className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="current">Current password</Label>
          <Input
            id="current"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new">New password</Label>
          <Input
            id="new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
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
        {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  )
}
