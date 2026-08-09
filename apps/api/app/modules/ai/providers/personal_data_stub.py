"""Personal data gateway stub — returns empty until domain adapters are wired."""

from __future__ import annotations

from app.modules.ai.ports.personal_data import PersonalSnippet


class StubPersonalDataGateway:
    """
    Future adapters will call existing module repositories:
    trading mistakes, finished books, finance monthly savings, goals by month, etc.
    """

    async def collect(
        self,
        user_id: str,
        *,
        modules: list[str] | None = None,
        query_hint: str | None = None,
        limit: int = 50,
    ) -> list[PersonalSnippet]:
        # Architecture only — no domain reads yet
        _ = (user_id, modules, query_hint, limit)
        return []
