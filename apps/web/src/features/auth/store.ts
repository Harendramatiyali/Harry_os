import { create } from "zustand"

import { authApi } from "@/features/auth/api"
import { setRefreshHandler } from "@/shared/api/client"
import type { AuthUser } from "@/shared/api/types"

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  bootstrapped: boolean
  isAuthenticated: boolean
  setSession: (accessToken: string, user: AuthUser) => void
  clearSession: () => void
  bootstrap: () => Promise<void>
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<string | null>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => {
  const refresh = async (timeoutMs?: number) => {
    try {
      const data = await authApi.refresh({ timeoutMs })
      set({
        accessToken: data.access_token,
        user: data.user,
        isAuthenticated: true,
      })
      return data.access_token
    } catch {
      set({ accessToken: null, user: null, isAuthenticated: false })
      return null
    }
  }

  setRefreshHandler(() => refresh())

  return {
    user: null,
    accessToken: null,
    bootstrapped: false,
    isAuthenticated: false,

    setSession: (accessToken, user) =>
      set({ accessToken, user, isAuthenticated: true }),

    clearSession: () => set({ accessToken: null, user: null, isAuthenticated: false }),

    refresh: () => refresh(),

    bootstrap: async () => {
      if (get().bootstrapped) return
      try {
        // Cap wait so Render cold starts don't freeze the shell forever.
        await refresh(12_000)
      } finally {
        set({ bootstrapped: true })
      }
    },

    login: async (email, password, rememberMe) => {
      const data = await authApi.login({
        email,
        password,
        remember_me: rememberMe,
      })
      set({
        accessToken: data.access_token,
        user: data.user,
        isAuthenticated: true,
      })
    },

    signup: async (email, password, displayName) => {
      const data = await authApi.signup({
        email,
        password,
        display_name: displayName,
      })
      set({
        accessToken: data.access_token,
        user: data.user,
        isAuthenticated: true,
      })
    },

    logout: async () => {
      try {
        await authApi.logout()
      } finally {
        set({ accessToken: null, user: null, isAuthenticated: false })
      }
    },

    changePassword: async (currentPassword, newPassword) => {
      const token = get().accessToken
      if (!token) throw new Error("Not authenticated")
      await authApi.changePassword(
        { current_password: currentPassword, new_password: newPassword },
        token,
      )
    },
  }
})
