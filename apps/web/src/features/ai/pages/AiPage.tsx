import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"

import {
  useAiCapabilities,
  useAiMutations,
  useConversation,
  useConversations,
  useMemory,
} from "@/features/ai/hooks"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"

type Tab = "chat" | "memory" | "architecture"

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message)
  }
  return "Request failed"
}

export function AiPage() {
  const [tab, setTab] = useState<Tab>("chat")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [banner, setBanner] = useState<string | null>(null)
  const [memContent, setMemContent] = useState("")

  const caps = useAiCapabilities()
  const conversations = useConversations()
  const detail = useConversation(selectedId)
  const memory = useMemory()
  const m = useAiMutations()

  useEffect(() => {
    if (!selectedId && conversations.data && conversations.data.length > 0) {
      setSelectedId(conversations.data[0].id)
    }
  }, [conversations.data, selectedId])

  async function ensureConversation(): Promise<string> {
    if (selectedId) return selectedId
    const created = await m.createConversation.mutateAsync({ title: "New chat" })
    setSelectedId(created.id)
    return created.id
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setBanner(null)
    const conversationId = await ensureConversation()
    setDraft("")
    try {
      const res = await m.chat.mutateAsync({ conversation_id: conversationId, message: text })
      setSelectedId(res.conversation_id)
      if ((res as { status?: string }).status === "not_implemented") {
        setBanner(
          "Model replies are deferred. History saved — OpenAI + personal-data RAG come next.",
        )
      }
    } catch (err) {
      setBanner(errorMessage(err))
    }
  }

  function onExample(prompt: string) {
    setDraft(prompt)
    setTab("chat")
  }

  function onAddMemory(e: FormEvent) {
    e.preventDefault()
    if (!memContent.trim()) return
    m.createMemory.mutate(
      { kind: "fact", content: memContent.trim() },
      { onSuccess: () => setMemContent("") },
    )
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">AI Assistant</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Personal Copilot
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Architecture ready — answers will use only your Harry OS data. LLM, embeddings, and RAG
          logic are not wired yet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["chat", "Chat"],
            ["memory", "Memory"],
            ["architecture", "Architecture"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" asChild className="rounded-xl">
          <Link to="/ai/imports">Import</Link>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild className="rounded-xl">
          <Link to="/ai/knowledge/inbox">Knowledge Inbox</Link>
        </Button>
      </div>

      {caps.data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {(
            [
              ["History", caps.data.history_ready],
              ["Memory", caps.data.memory_ready],
              ["LLM", caps.data.llm_ready],
              ["Embeddings", caps.data.embeddings_ready],
              ["RAG", caps.data.rag_ready],
              ["Enabled", caps.data.ai_enabled],
            ] as const
          ).map(([label, ready]) => (
            <div
              key={label}
              className="rounded-[1.2rem] border border-white/10 bg-card/70 p-3.5 backdrop-blur-xl"
            >
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
              <p className={`mt-1 text-sm font-medium ${ready ? "text-emerald-300" : "text-amber-200/90"}`}>
                {ready ? "Ready" : "Scaffold"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <Skeleton className="h-20 w-full" />
      )}

      {tab === "chat" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-3">
            <Panel
              title="Conversations"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    m.createConversation.mutate(
                      { title: "New chat" },
                      { onSuccess: (c) => setSelectedId(c.id) },
                    )
                  }
                >
                  New
                </Button>
              }
            >
              {conversations.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (conversations.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                <ul className="space-y-1">
                  {(conversations.data ?? []).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm ${
                          selectedId === c.id ? "bg-foreground/10" : "bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                        }`}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <span className="truncate">{c.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {c.message_count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Example prompts">
              <ul className="space-y-2">
                {(caps.data?.example_prompts ?? []).map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      className="w-full rounded-2xl bg-foreground/[0.03] px-3 py-2 text-left text-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                      onClick={() => onExample(p)}
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="xl:col-span-9">
            <Panel title={detail.data?.title ?? "Chat"}>
              {banner ? (
                <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100/90">
                  {banner}
                </div>
              ) : null}

              <div className="mb-4 max-h-[28rem] min-h-[16rem] space-y-3 overflow-y-auto">
                {!selectedId ? (
                  <p className="text-sm text-muted-foreground">
                    Start a conversation. Replies will later use only your personal modules (
                    {(caps.data?.allowed_modules ?? []).join(", ") || "…"}).
                  </p>
                ) : detail.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (detail.data?.messages ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Ask something — the user turn is saved; the model reply is deferred.
                  </p>
                ) : (
                  (detail.data?.messages ?? []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl px-3 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "ml-8 bg-sky-400/10"
                          : "mr-8 bg-foreground/[0.04]"
                      }`}
                    >
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {msg.role}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSend}>
                <Input
                  placeholder="Ask about your trading, books, finance…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button type="submit" disabled={m.chat.isPending || m.createConversation.isPending}>
                  Send
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      )}

      {tab === "memory" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Add memory">
              <form className="grid gap-2" onSubmit={onAddMemory}>
                <textarea
                  className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="e.g. I prefer morning deep work before markets open"
                  value={memContent}
                  onChange={(e) => setMemContent(e.target.value)}
                />
                <Button type="submit">Save fact</Button>
              </form>
            </Panel>
          </div>
          <div className="xl:col-span-8">
            <Panel title="Long-term memory">
              {memory.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (memory.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Manual memory store is ready. Auto-extraction from chats comes with the LLM phase.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(memory.data ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {item.kind}
                        </p>
                        <p>{item.content}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => m.deleteMemory.mutate(item.id)}
                      >
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "architecture" && (
        <div className="space-y-4">
          <Panel title="Design">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">Ports:</span> LLM, Embeddings, VectorStore, Memory,
                PersonalDataGateway
              </li>
              <li>
                <span className="text-foreground">Providers:</span> OpenAI-compatible adapters + Null
                stubs (no HTTP yet)
              </li>
              <li>
                <span className="text-foreground">RAG:</span> Chunker → registry → embed → vector
                upsert (deferred)
              </li>
              <li>
                <span className="text-foreground">Grounding:</span> trading, books, finance, health,
                planner, goals, knowledge only
              </li>
              <li>
                <span className="text-foreground">Models:</span> {caps.data?.llm_model ?? "…"} /{" "}
                {caps.data?.embedding_model ?? "…"}
              </li>
            </ul>
          </Panel>
          <Panel title="Next implementation phase">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Implement OpenAI chat + embeddings HTTP clients</li>
              <li>Wire PersonalDataGateway to domain repositories</li>
              <li>Choose vector backend and complete RagIndexer</li>
              <li>Enable AI_ENABLED and stream assistant replies</li>
            </ol>
          </Panel>
        </div>
      )}
    </div>
  )
}
