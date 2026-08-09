"""Embedding provider port — OpenAI embeddings for future RAG."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(slots=True)
class EmbeddingResult:
    vectors: list[list[float]]
    model: str
    dimensions: int


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Embed text for vector search. Not implemented in this phase."""

    async def embed(self, texts: list[str], *, model: str | None = None) -> EmbeddingResult: ...
