"""Knowledge Inbox HTTP routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.core.errors import NotFoundError
from app.modules.ai.import_engine.inbox.repository import (
    ImportCorrectionRepository,
    KnowledgeInboxRepository,
)
from app.modules.ai.import_engine.inbox.schemas import (
    AssignDestinationOut,
    AssignDestinationRequest,
    KnowledgeInboxDetailOut,
    KnowledgeInboxItemOut,
)
from app.modules.ai.import_engine.inbox.service import KnowledgeInboxService
from app.modules.ai.imports.repository import AiImportJobRepository, AiImportPageRepository
from app.modules.auth.deps import CurrentUserDep
from app.modules.trading.journal_repository import TradingJournalDayRepository

router = APIRouter(prefix="/knowledge/inbox", tags=["ai-knowledge-inbox"])


def get_inbox_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> KnowledgeInboxService:
    return KnowledgeInboxService(
        settings=settings,
        inbox=KnowledgeInboxRepository(session),
        corrections=ImportCorrectionRepository(session),
        journals=TradingJournalDayRepository(session),
    )


InboxServiceDep = Annotated[KnowledgeInboxService, Depends(get_inbox_service)]


@router.get("", response_model=list[KnowledgeInboxItemOut])
async def list_inbox(
    user: CurrentUserDep,
    service: InboxServiceDep,
    status: str | None = Query(default=None),
) -> list[KnowledgeInboxItemOut]:
    return await service.list_items(user.id, status=status)


@router.get("/{item_id}", response_model=KnowledgeInboxDetailOut)
async def get_inbox_item(
    item_id: str,
    user: CurrentUserDep,
    service: InboxServiceDep,
) -> KnowledgeInboxDetailOut:
    return await service.get_item(user.id, item_id)


@router.post("/{item_id}/destination", response_model=AssignDestinationOut)
async def assign_destination(
    item_id: str,
    body: AssignDestinationRequest,
    user: CurrentUserDep,
    service: InboxServiceDep,
    session: DbSessionDep,
) -> AssignDestinationOut:
    """Choose a destination module. Choosing `trading` commits into Trading Journal."""
    detail = await service.get_item(user.id, item_id)
    job = None
    pages_by_id = None
    if body.destination_module.strip().lower() == "trading" and detail.job_id:
        job = await AiImportJobRepository(session).get_owned(user.id, detail.job_id)
        if job is None:
            raise NotFoundError("Original import session not found for trading route")
        pages = await AiImportPageRepository(session).list_for_job(user.id, detail.job_id)
        pages_by_id = {p.id: p for p in pages}
    return await service.assign_destination(
        user.id,
        item_id,
        body,
        job=job,
        pages_by_id=pages_by_id,
    )
