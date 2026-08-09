import { apiRequest } from "@/shared/api/client"
import type {
  AssignDestinationOut,
  AssignDestinationRequest,
  ConfirmDestinationOut,
  ConfirmDestinationRequest,
  ImportCommitOut,
  ImportCommitRequest,
  ImportJobCreate,
  ImportJobOut,
  ImportJobStatusOut,
  ImportPageOut,
  ImportPreviewOut,
  ImportPreviewRequest,
  KnowledgeInboxDetail,
  KnowledgeInboxItem,
} from "@/features/ai/importTypes"
import type {
  AiCapabilities,
  AiMessage,
  Conversation,
  ConversationDetail,
  MemoryItem,
  WritingPolishRequest,
  WritingPolishResponse,
} from "@/features/ai/types"

export const aiApi = {
  capabilities(token: string) {
    return apiRequest<AiCapabilities>("/ai/capabilities", { accessToken: token })
  },
  listConversations(token: string) {
    return apiRequest<Conversation[]>("/ai/conversations", { accessToken: token })
  },
  createConversation(body: { title?: string }, token: string) {
    return apiRequest<Conversation>("/ai/conversations", { body, accessToken: token })
  },
  getConversation(id: string, token: string) {
    return apiRequest<ConversationDetail>(`/ai/conversations/${id}`, { accessToken: token })
  },
  updateConversation(id: string, body: { title?: string; summary?: string }, token: string) {
    return apiRequest<Conversation>(`/ai/conversations/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
  },
  deleteConversation(id: string, token: string) {
    return apiRequest<void>(`/ai/conversations/${id}`, { method: "DELETE", accessToken: token })
  },
  addMessage(conversationId: string, body: { content: string; role?: string }, token: string) {
    return apiRequest<AiMessage>(`/ai/conversations/${conversationId}/messages`, {
      body,
      accessToken: token,
    })
  },
  chat(body: { conversation_id?: string | null; message: string }, token: string) {
    return apiRequest<{ conversation_id: string; status: string }>("/ai/chat", {
      body,
      accessToken: token,
    })
  },

  polishWriting(body: WritingPolishRequest, token: string, signal?: AbortSignal) {
    return apiRequest<WritingPolishResponse>("/ai/writing/polish", {
      body,
      accessToken: token,
      signal,
    })
  },

  listMemory(token: string) {
    return apiRequest<MemoryItem[]>("/ai/memory", { accessToken: token })
  },
  createMemory(body: Record<string, unknown>, token: string) {
    return apiRequest<MemoryItem>("/ai/memory", { body, accessToken: token })
  },
  deleteMemory(id: string, token: string) {
    return apiRequest<void>(`/ai/memory/${id}`, { method: "DELETE", accessToken: token })
  },

  // —— Import Center ——

  createImportJob(body: ImportJobCreate, token: string) {
    return apiRequest<ImportJobOut>("/ai/imports/jobs", { body, accessToken: token })
  },

  getImportJob(jobId: string, token: string) {
    return apiRequest<ImportJobStatusOut>(`/ai/imports/jobs/${jobId}`, { accessToken: token })
  },

  listImportPages(jobId: string, token: string) {
    return apiRequest<ImportPageOut[]>(`/ai/imports/jobs/${jobId}/pages`, {
      accessToken: token,
    })
  },

  async uploadImportPages(jobId: string, files: File[], token: string) {
    const form = new FormData()
    for (const file of files) {
      form.append("files", file)
    }
    const res = await fetch(`/api/v1/ai/imports/jobs/${jobId}/pages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      credentials: "include",
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      const detail =
        err?.error?.message ||
        (typeof err?.detail === "string" ? err.detail : null) ||
        `Upload failed (${res.status})`
      throw new Error(detail)
    }
    return (await res.json()) as ImportPageOut[]
  },

  deleteImportPage(jobId: string, pageId: string, token: string) {
    return apiRequest<void>(`/ai/imports/jobs/${jobId}/pages/${pageId}`, {
      method: "DELETE",
      accessToken: token,
    })
  },

  generateImportPreview(jobId: string, body: ImportPreviewRequest | null, token: string) {
    return apiRequest<ImportPreviewOut>(`/ai/imports/jobs/${jobId}/preview`, {
      method: "POST",
      body: body ?? {},
      accessToken: token,
    })
  },

  confirmDestination(jobId: string, body: ConfirmDestinationRequest, token: string) {
    return apiRequest<ConfirmDestinationOut>(`/ai/imports/jobs/${jobId}/destination`, {
      method: "POST",
      body,
      accessToken: token,
    })
  },

  commitImport(jobId: string, body: ImportCommitRequest, token: string) {
    return apiRequest<ImportCommitOut>(`/ai/imports/jobs/${jobId}/commit`, {
      method: "POST",
      body,
      accessToken: token,
    })
  },

  listKnowledgeInbox(token: string, status?: string | null) {
    const q = status ? `?status=${encodeURIComponent(status)}` : ""
    return apiRequest<KnowledgeInboxItem[]>(`/ai/knowledge/inbox${q}`, { accessToken: token })
  },

  getKnowledgeInboxItem(itemId: string, token: string) {
    return apiRequest<KnowledgeInboxDetail>(`/ai/knowledge/inbox/${itemId}`, {
      accessToken: token,
    })
  },

  assignInboxDestination(itemId: string, body: AssignDestinationRequest, token: string) {
    return apiRequest<AssignDestinationOut>(`/ai/knowledge/inbox/${itemId}/destination`, {
      method: "POST",
      body,
      accessToken: token,
    })
  },
}
