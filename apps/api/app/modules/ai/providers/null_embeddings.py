"""Null embeddings provider."""

from __future__ import annotations

from app.core.errors import NotImplementedAppError
from app.modules.ai.ports.embeddings import EmbeddingResult


class NullEmbeddingProvider:
    async def embed(self, texts: list[str], *, model: str | None = None) -> EmbeddingResult:
        raise NotImplementedAppError(
            "Embeddings are not implemented yet.",
            details={"provider": "null", "count": len(texts), "model": model},
        )
