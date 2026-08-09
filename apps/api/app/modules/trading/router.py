"""Trading OS HTTP routes."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.core.errors import UnauthorizedError
from app.core.security import decode_token
from app.modules.auth.deps import CurrentUserDep
from app.modules.auth.repository import get_user_repository
from app.modules.trading.deps import JournalMigrateServiceDep, JournalServiceDep, TradingServiceDep
from app.modules.trading.schemas import (
    JournalAnalyticsOut,
    JournalAttachmentOut,
    JournalDayCreate,
    JournalDayOut,
    JournalDaySummaryOut,
    JournalDayUpdate,
    JournalMediaSyncReport,
    JournalMigrateReport,
    JournalMigrateRequest,
    JournalPromoteReport,
    JournalPromoteRequest,
    MistakeCreate,
    MistakeOut,
    MistakeUpdate,
    PeriodReviewCreate,
    PeriodReviewOut,
    PeriodReviewUpdate,
    PsychologyCreate,
    PsychologyOut,
    ScreenshotOut,
    TradeCreate,
    TradeOut,
    TradeUpdate,
    TradingAnalytics,
)

router = APIRouter(prefix="/trading", tags=["trading"])


@router.get("/trades", response_model=list[TradeOut])
async def list_trades(
    user: CurrentUserDep,
    service: TradingServiceDep,
    q: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    instrument: str | None = None,
    setup: str | None = None,
    tag: str | None = None,
    grade: str | None = None,
    direction: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[TradeOut]:
    return await service.list_trades(
        user.id,
        q=q,
        status=status_filter,
        instrument=instrument,
        setup=setup,
        tag=tag,
        grade=grade,
        direction=direction,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


@router.post("/trades", response_model=TradeOut, status_code=status.HTTP_201_CREATED)
async def create_trade(
    body: TradeCreate, user: CurrentUserDep, service: TradingServiceDep
) -> TradeOut:
    return await service.create_trade(user.id, body)


@router.get("/trades/{trade_id}", response_model=TradeOut)
async def get_trade(trade_id: str, user: CurrentUserDep, service: TradingServiceDep) -> TradeOut:
    return await service.get_trade(user.id, trade_id)


@router.patch("/trades/{trade_id}", response_model=TradeOut)
async def update_trade(
    trade_id: str, body: TradeUpdate, user: CurrentUserDep, service: TradingServiceDep
) -> TradeOut:
    return await service.update_trade(user.id, trade_id, body)


@router.delete("/trades/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trade(trade_id: str, user: CurrentUserDep, service: TradingServiceDep) -> None:
    await service.delete_trade(user.id, trade_id)


@router.get("/analytics", response_model=TradingAnalytics)
async def analytics(
    user: CurrentUserDep,
    service: TradingServiceDep,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> TradingAnalytics:
    return await service.analytics(user.id, date_from=date_from, date_to=date_to)


@router.get("/mistakes", response_model=list[MistakeOut])
async def list_mistakes(
    user: CurrentUserDep,
    service: TradingServiceDep,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[MistakeOut]:
    return await service.list_mistakes(user.id, date_from=date_from, date_to=date_to)


@router.post("/mistakes", response_model=MistakeOut, status_code=status.HTTP_201_CREATED)
async def create_mistake(
    body: MistakeCreate, user: CurrentUserDep, service: TradingServiceDep
) -> MistakeOut:
    return await service.create_mistake(user.id, body)


@router.patch("/mistakes/{mistake_id}", response_model=MistakeOut)
async def update_mistake(
    mistake_id: str, body: MistakeUpdate, user: CurrentUserDep, service: TradingServiceDep
) -> MistakeOut:
    return await service.update_mistake(user.id, mistake_id, body)


@router.delete("/mistakes/{mistake_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mistake(
    mistake_id: str, user: CurrentUserDep, service: TradingServiceDep
) -> None:
    await service.delete_mistake(user.id, mistake_id)


@router.get("/psychology", response_model=list[PsychologyOut])
async def list_psychology(user: CurrentUserDep, service: TradingServiceDep) -> list[PsychologyOut]:
    return await service.list_psychology(user.id)


@router.post("/psychology", response_model=PsychologyOut, status_code=status.HTTP_201_CREATED)
async def create_psychology(
    body: PsychologyCreate, user: CurrentUserDep, service: TradingServiceDep
) -> PsychologyOut:
    return await service.create_psychology(user.id, body)


@router.delete("/psychology/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_psychology(
    entry_id: str, user: CurrentUserDep, service: TradingServiceDep
) -> None:
    await service.delete_psychology(user.id, entry_id)


@router.post(
    "/trades/{trade_id}/screenshots",
    response_model=ScreenshotOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_screenshot(
    trade_id: str,
    user: CurrentUserDep,
    service: TradingServiceDep,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
) -> ScreenshotOut:
    raw = await file.read()
    return await service.add_screenshot(
        user.id,
        trade_id,
        file_name=file.filename or "screenshot.png",
        content_type=file.content_type or "application/octet-stream",
        data=raw,
        caption=caption,
    )


@router.get("/screenshots/{screenshot_id}")
async def download_screenshot(
    screenshot_id: str, user: CurrentUserDep, service: TradingServiceDep
) -> FileResponse:
    row = await service.get_screenshot_file(user.id, screenshot_id)
    path = Path(row.storage_path)
    return FileResponse(path, media_type=row.content_type, filename=row.file_name)


@router.delete("/screenshots/{screenshot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_screenshot(
    screenshot_id: str, user: CurrentUserDep, service: TradingServiceDep
) -> None:
    await service.delete_screenshot(user.id, screenshot_id)


@router.get("/reviews", response_model=list[PeriodReviewOut])
async def list_reviews(
    user: CurrentUserDep,
    service: TradingServiceDep,
    period_type: str | None = None,
) -> list[PeriodReviewOut]:
    return await service.list_reviews(user.id, period_type)


@router.post("/reviews", response_model=PeriodReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    body: PeriodReviewCreate, user: CurrentUserDep, service: TradingServiceDep
) -> PeriodReviewOut:
    return await service.create_review(user.id, body)


@router.patch("/reviews/{review_id}", response_model=PeriodReviewOut)
async def update_review(
    review_id: str, body: PeriodReviewUpdate, user: CurrentUserDep, service: TradingServiceDep
) -> PeriodReviewOut:
    return await service.update_review(user.id, review_id, body)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(review_id: str, user: CurrentUserDep, service: TradingServiceDep) -> None:
    await service.delete_review(user.id, review_id)


@router.get("/journals", response_model=list[JournalDaySummaryOut])
async def list_journals(
    user: CurrentUserDep,
    service: JournalServiceDep,
    date_from: date | None = None,
    date_to: date | None = None,
    parse_status: str | None = None,
    favorite_only: bool = False,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[JournalDaySummaryOut]:
    return await service.list_days(
        user.id,
        date_from=date_from,
        date_to=date_to,
        parse_status=parse_status,
        favorite_only=favorite_only,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/journals/by-date/{journal_date}", response_model=JournalDayOut)
async def get_journal_by_date(
    journal_date: date,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalDayOut:
    return await service.get_day_by_date(user.id, journal_date)


@router.post("/journals/attachments/sync", response_model=JournalMediaSyncReport)
async def sync_journal_attachments(
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalMediaSyncReport:
    """Copy Obsidian ![[...]] refs from the vault into local media_root."""
    return await service.sync_media(user.id)


@router.get("/journals/analytics", response_model=JournalAnalyticsOut)
async def journal_analytics(
    user: CurrentUserDep,
    service: JournalServiceDep,
    date_from: date | None = None,
    date_to: date | None = None,
) -> JournalAnalyticsOut:
    """Day-journal native stats (grades, setups, classified outcomes) — M6."""
    return await service.analytics(user.id, date_from=date_from, date_to=date_to)


@router.post("/journals/promote", response_model=JournalPromoteReport)
async def promote_journal_trades(
    body: JournalPromoteRequest,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalPromoteReport:
    """Create Trade Log ledger rows from journal trades; sets ledger_trade_id."""
    return await service.promote_to_ledger(user.id, body)


@router.delete("/journals/trades/{trade_id}", response_model=JournalDayOut)
async def delete_journal_trade(
    trade_id: str,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalDayOut:
    """Remove a trade from a day journal (and unlink/soft-delete its ledger row)."""
    return await service.delete_journal_trade(user.id, trade_id)


@router.post(
    "/journals/{journal_id}/attachments",
    response_model=JournalAttachmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_journal_attachment(
    journal_id: str,
    user: CurrentUserDep,
    service: JournalServiceDep,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    journal_trade_id: str | None = Form(default=None),
) -> JournalAttachmentOut:
    """Upload a screenshot for a native in-app journal (day-level or trade-level)."""
    raw = await file.read()
    return await service.upload_attachment(
        user.id,
        journal_id,
        file_name=file.filename or "screenshot.png",
        content_type=file.content_type or "application/octet-stream",
        data=raw,
        caption=caption,
        journal_trade_id=journal_trade_id,
    )


@router.get("/journals/attachments/{attachment_id}")
async def download_journal_attachment(
    attachment_id: str,
    service: JournalServiceDep,
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))] = None,
    access_token: str | None = Query(
        default=None,
        description="Optional access token for <img src> (Bearer header preferred).",
    ),
) -> FileResponse:
    """Serve a copied journal screenshot. Auth via Bearer header or access_token query."""
    raw = None
    if credentials and credentials.scheme.lower() == "bearer":
        raw = credentials.credentials
    elif access_token:
        raw = access_token
    if not raw:
        raise UnauthorizedError("Not authenticated")

    try:
        payload = decode_token(raw, settings)
    except ValueError as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc
    if payload.get("type") != "access" or not payload.get("sub"):
        raise UnauthorizedError("Invalid access token")

    user = await get_user_repository(session).get_by_id(str(payload["sub"]))
    if user is None or user.deleted_at is not None or not user.is_active:
        raise UnauthorizedError("User not found")

    row = await service.get_attachment_file(user.id, attachment_id)
    path = Path(row.storage_path)
    if not path.is_file():
        media_root = Path(settings.media_root)
        for candidate in (Path.cwd() / path, media_root / path, media_root / Path(path.name)):
            if candidate.is_file():
                path = candidate
                break

    return FileResponse(
        path,
        media_type=row.mime_type or "image/png",
        filename=row.file_name,
        content_disposition_type="inline",
    )


@router.get("/journals/{journal_id}", response_model=JournalDayOut)
async def get_journal(
    journal_id: str,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalDayOut:
    return await service.get_day(user.id, journal_id)


@router.post("/journals", response_model=JournalDayOut, status_code=status.HTTP_201_CREATED)
async def create_journal(
    body: JournalDayCreate,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalDayOut:
    """Create a native draft/published trading journal day with seeded writing sections."""
    return await service.create_day(user.id, body)


@router.patch("/journals/{journal_id}", response_model=JournalDayOut)
async def update_journal(
    journal_id: str,
    body: JournalDayUpdate,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> JournalDayOut:
    """Update day meta, trades, and section bodies from the Trading V2 editor."""
    return await service.update_day(user.id, journal_id, body)


@router.delete("/journals/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal(
    journal_id: str,
    user: CurrentUserDep,
    service: JournalServiceDep,
) -> None:
    """Soft-delete a journal day (and nested trades / linked ledger rows)."""
    await service.delete_day(user.id, journal_id)


@router.post("/journals/migrate/dry-run", response_model=JournalMigrateReport)
async def migrate_journals_dry_run(
    body: JournalMigrateRequest,
    user: CurrentUserDep,
    service: JournalMigrateServiceDep,
) -> JournalMigrateReport:
    """Preview Knowledge → structured trading day journals (no writes except audit row)."""
    return await service.migrate(user.id, body.model_copy(update={"dry_run": True}))


@router.post("/journals/migrate", response_model=JournalMigrateReport)
async def migrate_journals(
    body: JournalMigrateRequest,
    user: CurrentUserDep,
    service: JournalMigrateServiceDep,
    dry_run: bool | None = Query(default=None),
) -> JournalMigrateReport:
    """Migrate Obsidian trading_journal Knowledge notes into trading_journal_* tables."""
    if dry_run is not None:
        body = body.model_copy(update={"dry_run": dry_run})
    return await service.migrate(user.id, body)
