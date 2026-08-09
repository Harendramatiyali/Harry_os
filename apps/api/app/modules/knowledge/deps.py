"""Knowledge FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.modules.books.repository import BookRepository, ReadingNoteRepository
from app.modules.knowledge.promote import PromoteService
from app.modules.knowledge.repository import (
    ImportRunRepository,
    KnowledgeNoteRepository,
    PromotionRepository,
)
from app.modules.knowledge.service import KnowledgeService
from app.modules.trading.repository import PeriodReviewRepository, PsychologyRepository


def get_knowledge_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> KnowledgeService:
    return KnowledgeService(
        settings=settings,
        notes=KnowledgeNoteRepository(session),
        imports=ImportRunRepository(session),
    )


def get_promote_service(session: DbSessionDep) -> PromoteService:
    return PromoteService(
        notes=KnowledgeNoteRepository(session),
        promotions=PromotionRepository(session),
        books=BookRepository(session),
        reading_notes=ReadingNoteRepository(session),
        psychology=PsychologyRepository(session),
        reviews=PeriodReviewRepository(session),
    )


KnowledgeServiceDep = Annotated[KnowledgeService, Depends(get_knowledge_service)]
PromoteServiceDep = Annotated[PromoteService, Depends(get_promote_service)]
