"""Trading FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.modules.knowledge.repository import KnowledgeNoteRepository
from app.modules.trading.journal_migrate import JournalMigrateService
from app.modules.trading.journal_repository import (
    TradingJournalDayRepository,
    TradingJournalParseRunRepository,
)
from app.modules.trading.journal_service import JournalService
from app.modules.trading.repository import (
    MistakeRepository,
    PeriodReviewRepository,
    PsychologyRepository,
    ScreenshotRepository,
    TradeRepository,
)
from app.modules.trading.service import TradingService


def get_trading_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TradingService:
    return TradingService(
        trades=TradeRepository(session),
        mistakes=MistakeRepository(session),
        psychology=PsychologyRepository(session),
        screenshots=ScreenshotRepository(session),
        reviews=PeriodReviewRepository(session),
        journals=TradingJournalDayRepository(session),
        settings=settings,
    )


def get_journal_migrate_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> JournalMigrateService:
    return JournalMigrateService(
        notes=KnowledgeNoteRepository(session),
        journals=TradingJournalDayRepository(session),
        parse_runs=TradingJournalParseRunRepository(session),
        settings=settings,
    )


def get_journal_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> JournalService:
    return JournalService(
        journals=TradingJournalDayRepository(session),
        trades=TradeRepository(session),
        settings=settings,
    )


TradingServiceDep = Annotated[TradingService, Depends(get_trading_service)]
JournalMigrateServiceDep = Annotated[JournalMigrateService, Depends(get_journal_migrate_service)]
JournalServiceDep = Annotated[JournalService, Depends(get_journal_service)]
