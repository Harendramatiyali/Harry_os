"""Memory port — durable personal facts used as LLM context."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.modules.ai.schemas import MemoryCreate, MemoryOut, MemoryUpdate


@runtime_checkable
class MemoryPort(Protocol):
    async def list(self, user_id: str, *, limit: int = 50) -> list[MemoryOut]: ...

    async def create(self, user_id: str, data: MemoryCreate) -> MemoryOut: ...

    async def update(self, user_id: str, item_id: str, data: MemoryUpdate) -> MemoryOut: ...

    async def delete(self, user_id: str, item_id: str) -> None: ...

    async def for_prompt(self, user_id: str, *, limit: int = 20) -> list[str]:
        """Return memory strings to inject into system/context — later phase."""
        ...
