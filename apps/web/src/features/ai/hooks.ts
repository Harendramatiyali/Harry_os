import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { aiApi } from "@/features/ai/api"
import type {
  ConfirmDestinationRequest,
  ImportCommitRequest,
  ImportJobCreate,
  ImportPreviewRequest,
} from "@/features/ai/importTypes"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function useImportJob(jobId: string | null | undefined) {
  const token = useToken()
  return useQuery({
    queryKey: ["ai", "imports", jobId],
    queryFn: () => aiApi.getImportJob(jobId!, token!),
    enabled: Boolean(token && jobId),
  })
}

export function useAiCapabilities() {
  const token = useToken()
  return useQuery({
    queryKey: ["ai", "capabilities"],
    queryFn: () => aiApi.capabilities(token!),
    enabled: Boolean(token),
  })
}

export function useConversations() {
  const token = useToken()
  return useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: () => aiApi.listConversations(token!),
    enabled: Boolean(token),
  })
}

export function useConversation(id: string | null) {
  const token = useToken()
  return useQuery({
    queryKey: ["ai", "conversations", id],
    queryFn: () => aiApi.getConversation(id!, token!),
    enabled: Boolean(token && id),
  })
}

export function useMemory() {
  const token = useToken()
  return useQuery({
    queryKey: ["ai", "memory"],
    queryFn: () => aiApi.listMemory(token!),
    enabled: Boolean(token),
  })
}

export function useAiMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["ai"] })
  }

  return {
    createConversation: useMutation({
      mutationFn: (body: { title?: string }) => aiApi.createConversation(body, token),
      onSuccess: invalidate,
    }),
    deleteConversation: useMutation({
      mutationFn: (id: string) => aiApi.deleteConversation(id, token),
      onSuccess: invalidate,
    }),
    addMessage: useMutation({
      mutationFn: ({
        conversationId,
        content,
      }: {
        conversationId: string
        content: string
      }) => aiApi.addMessage(conversationId, { content, role: "user" }, token),
      onSuccess: invalidate,
    }),
    chat: useMutation({
      mutationFn: (body: { conversation_id?: string | null; message: string }) =>
        aiApi.chat(body, token),
      onSuccess: invalidate,
    }),
    createMemory: useMutation({
      mutationFn: (body: Record<string, unknown>) => aiApi.createMemory(body, token),
      onSuccess: invalidate,
    }),
    deleteMemory: useMutation({
      mutationFn: (id: string) => aiApi.deleteMemory(id, token),
      onSuccess: invalidate,
    }),
  }
}

export function useImportMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidateJob = async (jobId: string) => {
    await qc.invalidateQueries({ queryKey: ["ai", "imports", jobId] })
  }

  return {
    createJob: useMutation({
      mutationFn: (body: ImportJobCreate) => aiApi.createImportJob(body, token),
    }),
    uploadPages: useMutation({
      mutationFn: ({ jobId, files }: { jobId: string; files: File[] }) =>
        aiApi.uploadImportPages(jobId, files, token),
      onSuccess: (_data, vars) => invalidateJob(vars.jobId),
    }),
    deletePage: useMutation({
      mutationFn: ({ jobId, pageId }: { jobId: string; pageId: string }) =>
        aiApi.deleteImportPage(jobId, pageId, token),
      onSuccess: (_data, vars) => invalidateJob(vars.jobId),
    }),
    generatePreview: useMutation({
      mutationFn: ({
        jobId,
        body,
      }: {
        jobId: string
        body?: ImportPreviewRequest | null
      }) => aiApi.generateImportPreview(jobId, body ?? null, token),
      onSuccess: (_data, vars) => invalidateJob(vars.jobId),
    }),
    confirmDestination: useMutation({
      mutationFn: ({
        jobId,
        body,
      }: {
        jobId: string
        body: ConfirmDestinationRequest
      }) => aiApi.confirmDestination(jobId, body, token),
      onSuccess: async (_data, vars) => {
        await invalidateJob(vars.jobId)
        await qc.invalidateQueries({ queryKey: ["ai", "knowledge-inbox"] })
      },
    }),
    commit: useMutation({
      mutationFn: ({ jobId, body }: { jobId: string; body: ImportCommitRequest }) =>
        aiApi.commitImport(jobId, body, token),
      onSuccess: async (_data, vars) => {
        await invalidateJob(vars.jobId)
        await qc.invalidateQueries({ queryKey: ["trading", "journals"] })
        await qc.invalidateQueries({ queryKey: ["trading"] })
        await qc.invalidateQueries({ queryKey: ["ai", "knowledge-inbox"] })
      },
    }),
  }
}

export function useKnowledgeInbox(status?: string | null) {
  const token = useToken()
  return useQuery({
    queryKey: ["ai", "knowledge-inbox", status ?? "all"],
    enabled: Boolean(token),
    queryFn: () => aiApi.listKnowledgeInbox(token!, status),
  })
}

export function useInboxMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  return {
    assignDestination: useMutation({
      mutationFn: ({
        itemId,
        body,
      }: {
        itemId: string
        body: import("@/features/ai/importTypes").AssignDestinationRequest
      }) => aiApi.assignInboxDestination(itemId, body, token),
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: ["ai", "knowledge-inbox"] })
        await qc.invalidateQueries({ queryKey: ["trading", "journals"] })
      },
    }),
  }
}
