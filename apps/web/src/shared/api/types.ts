export type UserRole = "admin" | "user"

export type AuthUser = {
  id: string
  email: string
  display_name: string
  role: UserRole
  timezone: string
  base_currency: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    correlation_id?: string | null
    details?: unknown
  }
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}
