import { API_BASE } from "@/shared/api/base"
import { ApiError, type ApiErrorBody } from "@/shared/api/types"

const DEFAULT_TIMEOUT_MS = 45_000

type RequestOptions = {
  method?: string
  body?: unknown
  accessToken?: string | null
  signal?: AbortSignal
  /** Override default 45s timeout (Render cold starts can be slow). */
  timeoutMs?: number
}

let refreshHandler: (() => Promise<string | null>) | null = null

/** Wired by auth store so 401s can rotate access tokens once. */
export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler
}

function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals)
  }
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
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

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const signal = options.signal
    ? mergeAbortSignals([options.signal, timeoutSignal])
    : timeoutSignal

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      signal,
    })
  } catch {
    const remote = API_BASE.startsWith("http")
    throw new ApiError(
      0,
      "network_error",
      remote
        ? "Cannot reach the API. The backend may be waking up — wait ~30s and refresh."
        : "Cannot reach the API. Is the backend running on port 8000?",
    )
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new ApiError(
      response.status,
      "bad_gateway",
      "API is unreachable (Bad Gateway). The backend may be starting — retry in a moment.",
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
