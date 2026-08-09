"""OpenAI embeddings adapter — stub (no HTTP calls yet)."""

from __future__ import annotations

from app.core.errors import NotImplementedAppError
from app.modules.ai.ports.embeddings import EmbeddingResult


class OpenAIEmbeddingProvider:
    def __init__(
        self,
        *,
        api_key: str | None,
        base_url: str | None,
        default_model: str,
        dimensions: int,
    ) -> None:
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.default_model = default_model
        self.dimensions = dimensions

    async def embed(self, texts: list[str], *, model: str | None = None) -> EmbeddingResult:
        raise NotImplementedAppError(
            "OpenAI embeddings not implemented yet.",
            details={
                "provider": "openai_compatible",
                "base_url": self.base_url,
                "model": model or self.default_model,
                "dimensions": self.dimensions,
                "count": len(texts),
                "has_api_key": bool(self.api_key),
            },
        )
