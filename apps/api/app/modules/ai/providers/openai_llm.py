"""OpenAI-compatible LLM adapter — live chat completions via HTTP."""

from __future__ import annotations

import httpx

from app.core.errors import DomainError, NotImplementedAppError
from app.modules.ai.ports.llm import ChatCompletionRequest, ChatCompletionResult


class OpenAICompatibleLLM:
    """POST {base_url}/chat/completions with Bearer llm_api_key."""

    def __init__(self, *, api_key: str | None, base_url: str | None, default_model: str) -> None:
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.default_model = default_model

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResult:
        if not self.api_key:
            raise NotImplementedAppError(
                "LLM API key is not configured. Set LLM_API_KEY and AI_ENABLED=true.",
                details={"provider": "openai_compatible", "base_url": self.base_url},
            )

        model = request.model or self.default_model
        payload: dict = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in request.messages],
            "temperature": request.temperature,
        }
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            # Ignore HTTP(S)_PROXY from the shell/sandbox — OpenAI must be reached directly.
            async with httpx.AsyncClient(timeout=45.0, trust_env=False) as client:
                response = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise DomainError(
                "Failed to reach the LLM provider.",
                details={"provider": "openai_compatible", "error": str(exc)},
            ) from exc

        if response.status_code >= 400:
            detail: object
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            raise DomainError(
                f"LLM provider error ({response.status_code}).",
                details={"provider": "openai_compatible", "status": response.status_code, "body": detail},
            )

        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise DomainError(
                "Unexpected LLM response shape.",
                details={"provider": "openai_compatible", "body": data},
            ) from exc

        usage = data.get("usage") or {}
        return ChatCompletionResult(
            content=(content or "").strip(),
            model=data.get("model") or model,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            raw=data if isinstance(data, dict) else {},
        )
