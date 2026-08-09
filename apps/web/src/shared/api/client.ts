import { API_BASE } from "@/shared/api/base"
import { ApiError, type ApiErrorBody } from "@/shared/api/types"

type RequestOptions = {
  method?: string
  body?: unknown
  accessToken?: string | null
  signal?: AbortSignal
}

let refreshHandler: (() => Promise<string | null>) | null = null

/** Wired by auth store so 401s can rotate access tokens once. */
export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      signal: options.signal,
    })
  } catch {
    throw new ApiError(
      0,
      "network_error",
      "Cannot reach the API. Is the backend running on port 8000?",
    )
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new ApiError(
      response.status,
      "bad_gateway",
      "API is unreachable (Bad Gateway). Start the FastAPI server on port 8000.",
    )
  }

  if (response.status === 401 && refreshHandler && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
    const nextToken = await refreshHandler()
    if (nextToken) {
      return apiRequest<T>(path, { ...options, accessToken: nextToken })
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json().catch(() => null)) as T | ApiErrorBody | null

  if (!response.ok) {
    const err = payload as ApiErrorBody | null
    throw new ApiError(
      response.status,
      err?.error?.code ?? "http_error",
      err?.error?.message ?? (response.statusText || "Request failed"),
      err?.error?.details,
    )
  }

  return payload as T
}
