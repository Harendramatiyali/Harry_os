"""
Personal-data gateway — the ONLY allowed knowledge source for the assistant.

Adapters will read trading / books / finance / health / planner / goals / knowledge
via existing module repositories. No external web search.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(slots=True)
class PersonalSnippet:
    module: str
    entity_type: str
    entity_id: str | None
    title: str
    body: str
    occurred_on: str | None = None


@runtime_checkable
class PersonalDataGateway(Protocol):
    """
    Collect grounded snippets for RAG indexing and (optionally) live tool answers.

    Example intents this enables later:
    - trading mistakes → module=trading
    - completed books → module=books
    - savings last month → module=finance
    - June goals → module=goals
    - today's review → planner + trading + health + finance
    """

    async def collect(
        self,
        user_id: str,
        *,
        modules: list[str] | None = None,
        query_hint: str | None = None,
        limit: int = 50,
    ) -> list[PersonalSnippet]: ...
