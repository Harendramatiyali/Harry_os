"""LLM provider port — OpenAI-compatible chat completions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass(slots=True)
class LLMMessage:
    role: str
    content: str


@dataclass(slots=True)
class ChatCompletionRequest:
    messages: list[LLMMessage]
    model: str
    temperature: float = 0.2
    max_tokens: int | None = None


@dataclass(slots=True)
class ChatCompletionResult:
    content: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    raw: dict = field(default_factory=dict)


@runtime_checkable
class LLMProvider(Protocol):
    """OpenAI (or compatible) chat API. Not implemented in this phase."""

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResult: ...
