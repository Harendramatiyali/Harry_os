import { apiRequest } from "@/shared/api/client"
import type { AuthUser, TokenResponse } from "@/shared/api/types"

export const authApi = {
  signup(input: { email: string; password: string; display_name: string }) {
    return apiRequest<TokenResponse>("/auth/signup", { body: input })
  },

  login(input: { email: string; password: string; remember_me: boolean }) {
    return apiRequest<TokenResponse>("/auth/login", { body: input })
  },

  refresh(options?: { timeoutMs?: number }) {
    return apiRequest<TokenResponse>("/auth/refresh", {
      method: "POST",
      timeoutMs: options?.timeoutMs,
    })
  },

  logout() {
    return apiRequest<{ message: string }>("/auth/logout", { method: "POST" })
  },

  me(accessToken: string) {
    return apiRequest<AuthUser>("/auth/me", { accessToken })
  },

  forgotPassword(email: string) {
    return apiRequest<{ message: string; reset_token?: string | null; reset_url?: string | null }>(
      "/auth/forgot-password",
      { body: { email } },
    )
  },

  resetPassword(input: { token: string; new_password: string }) {
    return apiRequest<{ message: string }>("/auth/reset-password", { body: input })
  },

  changePassword(input: { current_password: string; new_password: string }, accessToken: string) {
    return apiRequest<{ message: string }>("/auth/change-password", {
      body: input,
      accessToken,
    })
  },
}
