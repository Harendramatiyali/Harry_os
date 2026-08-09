import { useCallback, useEffect, useRef, useState } from "react"
import { aiApi } from "@/features/ai/api"
import { useAuthStore } from "@/features/auth/store"
import { ApiError } from "@/shared/api/types"

export type LivePolishMeta = {
  fieldId?: string
  fieldName?: string
  fieldDescription?: string
  writingStyle?: string
  aiInstruction?: string
}

type Options = {
  text: string
  enabled?: boolean
  debounceMs?: number
  meta: LivePolishMeta
}

export type LivePolishState = {
  polished: string
  status: "idle" | "debouncing" | "loading" | "ready" | "error" | "unavailable"
  error: string | null
  regenerate: () => void
  clear: () => void
}

const MIN_CHARS = 8

export function useLiveWritingPolish({
  text,
  enabled = true,
  debounceMs = 800,
  meta,
}: Options): LivePolishState {
  const [polished, setPolished] = useState("")
  const [status, setStatus] = useState<LivePolishState["status"]>("idle")
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const lastSourceRef = useRef("")
  const requestIdRef = useRef(0)
  const metaRef = useRef(meta)
  metaRef.current = meta

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setPolished("")
    setStatus("idle")
    setError(null)
    lastSourceRef.current = ""
  }, [])

  const regenerate = useCallback(() => {
    lastSourceRef.current = ""
    setTick((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      clear()
      return
    }

    const trimmed = text.trim()
    if (!trimmed || trimmed.length < MIN_CHARS) {
      abortRef.current?.abort()
      setPolished("")
      setStatus("idle")
      setError(null)
      lastSourceRef.current = ""
      return
    }

    if (trimmed === lastSourceRef.current) {
      return
    }

    setStatus("debouncing")
    setError(null)

    const timer = window.setTimeout(async () => {
      const token = useAuthStore.getState().accessToken
      if (!token) {
        setStatus("unavailable")
        setError("Sign in to use Writing Copilot.")
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const requestId = ++requestIdRef.current
      setStatus("loading")

      try {
        const m = metaRef.current
        const res = await aiApi.polishWriting(
          {
            text: trimmed,
            field_id: m.fieldId ?? null,
            field_name: m.fieldName ?? null,
            field_description: m.fieldDescription ?? null,
            writing_style: m.writingStyle ?? null,
            ai_instruction: m.aiInstruction ?? null,
          },
          token,
          controller.signal,
        )
        if (requestId !== requestIdRef.current) return
        lastSourceRef.current = trimmed
        setPolished(res.polished)
        setStatus("ready")
        setError(null)
      } catch (err) {
        if (controller.signal.aborted) return
        if (requestId !== requestIdRef.current) return
        if (err instanceof ApiError && err.status === 501) {
          setStatus("unavailable")
          setError(
            err.message ||
              "Writing Copilot needs AI_ENABLED=true and LLM_API_KEY on the API.",
          )
          return
        }
        if (err instanceof DOMException && err.name === "AbortError") return
        setStatus("error")
        setError(err instanceof ApiError ? err.message : "Failed to rewrite notes.")
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timer)
    }
    // polished intentionally omitted — only re-run on text / tick / enabled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, debounceMs, tick, clear])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return { polished, status, error, regenerate, clear }
}
