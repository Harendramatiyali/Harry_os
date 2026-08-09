"""Vector store / retriever port — future RAG over personal data only."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: str
    source: str
    source_id: str | None
    title: str | None
    content: str
    score: float


@runtime_checkable
class VectorStore(Protocol):
    """
    Similarity search over user-scoped embedding chunks.

    Implementations (future): pgvector, Qdrant, local FAISS, etc.
    Current phase: NullVectorStore raises NotImplemented.
    """

    async def upsert(
        self,
        *,
        user_id: str,
        chunk_id: str,
        vector: list[float],
        metadata: dict,
    ) -> None: ...

    async def delete(self, *, user_id: str, chunk_id: str) -> None: ...

    async def search(
        self,
        *,
        user_id: str,
        query_vector: list[float],
        top_k: int,
        sources: list[str] | None = None,
    ) -> list[RetrievedChunk]: ...
