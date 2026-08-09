export type MessageRole = "system" | "user" | "assistant" | "tool"
export type MemoryKind = "fact" | "preference" | "goal" | "insight" | "other"

export type Conversation = {
  id: string
  title: string
  summary: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export type AiMessage = {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  token_count: number | null
  model: string | null
  created_at: string
}

export type ConversationDetail = Conversation & {
  messages: AiMessage[]
}

export type MemoryItem = {
  id: string
  kind: MemoryKind
  content: string
  source_module: string | null
  importance: number
  created_at: string
  updated_at: string
}

export type AiCapabilities = {
  ai_enabled: boolean
  llm_ready: boolean
  embeddings_ready: boolean
  rag_ready: boolean
  memory_ready: boolean
  history_ready: boolean
  imports_ready?: boolean
  writing_polish_ready?: boolean
  allowed_modules: string[]
  llm_model: string
  embedding_model: string
  example_prompts: string[]
}

export type WritingPolishRequest = {
  text: string
  field_id?: string | null
  field_name?: string | null
  field_description?: string | null
  writing_style?: string | null
  ai_instruction?: string | null
}

export type WritingPolishResponse = {
  polished: string
  model: string | null
  unchanged: boolean
}
