"""Destination resolvers — where a reviewed draft is saved."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol, runtime_checkable

from app.core.config import Settings
from app.core.errors import DomainError
from app.modules.ai.import_engine.types import DestinationModule, ParserType
from app.modules.ai.imports.commit import commit_draft_to_journal
from app.modules.ai.imports.schemas import ImportCommitOut, JournalDraft
from app.modules.ai.import_models import AiImportJob, AiImportPage
from app.modules.trading.journal_repository import TradingJournalDayRepository


@dataclass(slots=True)
class InboxSaveResult:
    job_id: str
    inbox_status: str
    parser_type: str
    message: str


@runtime_checkable
class DestinationCommitter(Protocol):
    destination: DestinationModule

    async def commit(self, *args: Any, **kwargs: Any) -> Any: ...


class TradingJournalCommitter:
    destination = DestinationModule.TRADING

    async def commit(
        self,
        *,
        user_id: str,
        job: AiImportJob,
        draft: JournalDraft,
        pages: list[AiImportPage] | None = None,
        pages_by_id: dict[str, AiImportPage] | None = None,
        settings: Settings,
        journals: TradingJournalDayRepository,
    ) -> ImportCommitOut | Any:
        by_id = pages_by_id or {p.id: p for p in (pages or [])}
        day = await commit_draft_to_journal(
            user_id=user_id,
            job=job,
            draft=draft,
            pages_by_id=by_id,
            settings=settings,
            journals=journals,
        )
        return day


class KnowledgeInboxCommitter:
    """Stores unmatched / architecture-only docs as inbox-bound (no domain tables yet)."""

    destination = DestinationModule.INBOX

    async def commit(
        self,
        *,
        user_id: str,
        job: AiImportJob,
        draft: JournalDraft,
        pages: list[AiImportPage],
        settings: Settings,
        journals: TradingJournalDayRepository | None = None,
        parser_type: ParserType | str = ParserType.GENERAL,
    ) -> InboxSaveResult:
        # Persist intention on the job; full inbox table lands in a later schema pass.
        job.destination_module = DestinationModule.INBOX.value
        pt = parser_type.value if isinstance(parser_type, ParserType) else str(parser_type)
        return InboxSaveResult(
            job_id=job.id,
            inbox_status="queued",
            parser_type=pt,
            message=(
                "Saved to Knowledge Inbox. Choose a destination module later — "
                "AI will learn from your correction."
            ),
        )


def resolve_committer(
    destination: DestinationModule | str | None,
    *,
    parser_type: ParserType | str | None = None,
) -> DestinationCommitter:
    dest = destination
    if isinstance(dest, str):
        dest = DestinationModule(dest)
    if dest is None:
        # Infer from parser
        if parser_type in (ParserType.TRADING, "trading", None):
            return TradingJournalCommitter()
        return KnowledgeInboxCommitter()
    if dest == DestinationModule.TRADING:
        return TradingJournalCommitter()
    if dest == DestinationModule.INBOX:
        return KnowledgeInboxCommitter()
    # Future modules → inbox until implemented
    return KnowledgeInboxCommitter()


def ensure_can_save_with_parser(parser_type: ParserType | str, architecture_only: bool) -> None:
    if architecture_only and ParserType(str(parser_type)) != ParserType.TRADING:
        # Allow inbox save path only
        return
    if architecture_only:
        raise DomainError("This parser is architecture-only and cannot save to a domain module yet")
