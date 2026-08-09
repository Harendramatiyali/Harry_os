"""AI Import Center FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.modules.ai.imports.repository import (
    AiImportDraftVersionRepository,
    AiImportEventRepository,
    AiImportJobRepository,
    AiImportPageRepository,
)
from app.modules.ai.imports.service import AiImportService
from app.modules.trading.journal_repository import TradingJournalDayRepository


def get_ai_import_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AiImportService:
    return AiImportService(
        settings=settings,
        jobs=AiImportJobRepository(session),
        pages=AiImportPageRepository(session),
        drafts=AiImportDraftVersionRepository(session),
        events=AiImportEventRepository(session),
        journals=TradingJournalDayRepository(session),
    )


AiImportServiceDep = Annotated[AiImportService, Depends(get_ai_import_service)]
