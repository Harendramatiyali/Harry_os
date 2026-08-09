"""Null LLM — architecture seam until OpenAI chat is implemented."""

from __future__ import annotations

from app.core.errors import NotImplementedAppError
from app.modules.ai.ports.llm import ChatCompletionRequest, ChatCompletionResult


class NullLLMProvider:
    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResult:
        raise NotImplementedAppError(
            "LLM is not configured. Set AI_ENABLED=true and LLM_API_KEY.",
            details={"provider": "null", "model": request.model},
        )
