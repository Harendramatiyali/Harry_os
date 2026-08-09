import { apiRequest } from "@/shared/api/client"
import type {
  KnowledgeDashboard,
  KnowledgeNote,
  NoteSummary,
  ObsidianImportReport,
  PromoteReport,
} from "@/features/knowledge/types"

export const knowledgeApi = {
  dashboard(token: string) {
    return apiRequest<KnowledgeDashboard>("/knowledge/dashboard", { accessToken: token })
  },
  list(
    token: string,
    params?: { area?: string; kind?: string; source?: string; q?: string },
  ) {
    const qs = new URLSearchParams()
    if (params?.area) qs.set("area", params.area)
    if (params?.kind) qs.set("kind", params.kind)
    if (params?.source) qs.set("source", params.source)
    if (params?.q) qs.set("q", params.q)
    const s = qs.toString()
    return apiRequest<NoteSummary[]>(`/knowledge/notes${s ? `?${s}` : ""}`, {
      accessToken: token,
    })
  },
  get(id: string, token: string) {
    return apiRequest<KnowledgeNote>(`/knowledge/notes/${id}`, { accessToken: token })
  },
  remove(id: string, token: string) {
    return apiRequest<void>(`/knowledge/notes/${id}`, { method: "DELETE", accessToken: token })
  },
  dryRun(body: Record<string, unknown>, token: string) {
    return apiRequest<ObsidianImportReport>("/knowledge/obsidian/dry-run", {
      body,
      accessToken: token,
    })
  },
  importVault(body: Record<string, unknown>, token: string) {
    return apiRequest<ObsidianImportReport>("/knowledge/obsidian/import", {
      body,
      accessToken: token,
    })
  },
  promoteDryRun(body: Record<string, unknown>, token: string) {
    return apiRequest<PromoteReport>("/knowledge/promote/dry-run", {
      body,
      accessToken: token,
    })
  },
  promote(body: Record<string, unknown>, token: string) {
    return apiRequest<PromoteReport>("/knowledge/promote", {
      body,
      accessToken: token,
    })
  },
}
