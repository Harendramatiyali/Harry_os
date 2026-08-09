# AI Assistant Architecture

Personal-data-only assistant for Harry OS. **LLM / embeddings / RAG logic is not implemented yet** — this package defines ports, persistence, and HTTP seams.

## Goals (later)

Answer questions using **only** the user's Harry OS data, e.g.:

- What mistakes am I repeating in trading?
- What books have I completed?
- How much did I save last month?
- Show my June goals.
- Prepare today's review.

No web search. No general-knowledge answers unless grounded in personal modules.

## Package layout

```
ai/
  ports/           # Protocols (LLM, Embeddings, VectorStore, Memory, PersonalData)
  providers/       # OpenAI-compatible + Null stubs (raise 501)
  rag/             # Chunker + indexer pipeline seam
  models.py        # Conversations, messages, memory, embedding chunk registry
  schemas.py
  repository.py
  service.py       # History/memory CRUD live; chat/reindex stubbed
  router.py        # /api/v1/ai/*
  deps.py          # DI wiring
```

## Supported now

| Capability | Status |
|---|---|
| Conversation history CRUD | Implemented |
| Manual memory CRUD | Implemented |
| Embedding chunk registry | Implemented (text + metadata; no vectors) |
| OpenAI config / DI | Wired (`AI_ENABLED`, models, keys) |
| Chat completions | Port only — `POST /ai/chat` returns `status=not_implemented` (no OpenAI call) |
| Embeddings API | Port only → `501` when provider methods are invoked |
| Vector search (RAG) | Port only → `501` |
| Personal-data adapters | Stub gateway returns `[]`; reindex → `501` |

## Future chat pipeline

1. Persist user message on conversation  
2. Load recent history (`AI_MAX_CONTEXT_MESSAGES`)  
3. Inject memory (`MemoryPort.for_prompt`)  
4. If RAG: embed query → `VectorStore.search` (user-scoped, allowed modules only)  
5. `LLMProvider.complete` (OpenAI-compatible)  
6. Persist assistant message + citations  

## Future RAG pipeline

1. `PersonalDataGateway.collect` from trading / books / finance / health / planner / goals / knowledge  
2. `Chunker` → register `EmbeddingChunk` rows  
3. `EmbeddingProvider.embed` → upsert into `VectorStore` (`vector_ref`)  
4. Query-time retrieval with `AI_RAG_TOP_K`  

## HTTP surface

- `GET /ai/capabilities`
- CRUD `/ai/conversations`, messages
- `POST /ai/chat` → saves history, `status=not_implemented` (no LLM)
- CRUD `/ai/memory`
- `/ai/embeddings/chunks`, `POST /ai/embeddings/reindex` → 501 until adapters exist

## Config

See `.env.example`: `AI_ENABLED`, `LLM_*`, `EMBEDDING_*`, `AI_ALLOWED_MODULES`.
