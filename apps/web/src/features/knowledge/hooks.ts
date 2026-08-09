import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { knowledgeApi } from "@/features/knowledge/api"

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

export function useKnowledgeDashboard() {
  const token = useToken()
  return useQuery({
    queryKey: ["knowledge", "dashboard"],
    queryFn: () => knowledgeApi.dashboard(token!),
    enabled: Boolean(token),
  })
}

export function useKnowledgeNotes(params?: {
  area?: string
  kind?: string
  source?: string
  q?: string
}) {
  const token = useToken()
  return useQuery({
    queryKey: ["knowledge", "notes", params],
    queryFn: () => knowledgeApi.list(token!, params),
    enabled: Boolean(token),
  })
}

export function useKnowledgeNote(id: string | null) {
  const token = useToken()
  return useQuery({
    queryKey: ["knowledge", "note", id],
    queryFn: () => knowledgeApi.get(id!, token!),
    enabled: Boolean(token && id),
  })
}

export function useKnowledgeMutations() {
  const token = useToken()!
  const qc = useQueryClient()
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["knowledge"] })
  }

  return {
    deleteNote: useMutation({
      mutationFn: (id: string) => knowledgeApi.remove(id, token),
      onSuccess: invalidate,
    }),
    dryRun: useMutation({
      mutationFn: (body: Record<string, unknown>) => knowledgeApi.dryRun(body, token),
    }),
    importVault: useMutation({
      mutationFn: (body: Record<string, unknown>) => knowledgeApi.importVault(body, token),
      onSuccess: invalidate,
    }),
    promoteDryRun: useMutation({
      mutationFn: (body: Record<string, unknown>) => knowledgeApi.promoteDryRun(body, token),
    }),
    promote: useMutation({
      mutationFn: (body: Record<string, unknown>) => knowledgeApi.promote(body, token),
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: ["knowledge"] })
        await qc.invalidateQueries({ queryKey: ["books"] })
        await qc.invalidateQueries({ queryKey: ["trading"] })
      },
    }),
  }
}
