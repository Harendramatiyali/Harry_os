"""Image upload tests — service validation & media write (mocked repos)."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError, NotFoundError
from app.modules.ai.import_models import (
    AiImportJob,
    AiImportJobStatus,
    AiImportReviewStatus,
)
from app.modules.ai.imports.service import AiImportService
from app.modules.ai.imports.schemas import ImportJobCreate
from tests.helpers import PNG_1X1


def _job(*, status: AiImportJobStatus = AiImportJobStatus.QUEUED, job_id: str = "job-1") -> AiImportJob:
    now = datetime.now(timezone.utc)
    return AiImportJob(
        id=job_id,
        user_id="user-1",
        title="Upload test",
        notebook_label=None,
        status=status,
        review_status=AiImportReviewStatus.PENDING,
        current_stage="created",
        page_count=0,
        draft_version=0,
        created_at=now,
        updated_at=now,
    )


def _stamp_timestamps(entity) -> None:
    now = datetime.now(timezone.utc)
    if getattr(entity, "created_at", None) is None:
        entity.created_at = now
    if getattr(entity, "updated_at", None) is None:
        entity.updated_at = now
    if getattr(entity, "draft_version", None) is None and hasattr(entity, "draft_version"):
        entity.draft_version = 0


def _service(tmp_path: Path, mock_repos: dict) -> AiImportService:
    settings = Settings(
        secret_key="test-secret",
        media_root=str(tmp_path / "media"),
        max_upload_bytes=1024 * 1024,
        database_url="sqlite+aiosqlite:///:memory:",
    )
    return AiImportService(
        settings=settings,
        jobs=mock_repos["jobs"],
        pages=mock_repos["pages"],
        drafts=mock_repos["drafts"],
        events=mock_repos["events"],
        journals=mock_repos["journals"],
    )


@pytest.mark.asyncio
async def test_create_job_persists(tmp_path: Path, mock_repos: dict) -> None:
    service = _service(tmp_path, mock_repos)

    async def add_job(job):
        _stamp_timestamps(job)
        if getattr(job, "draft_version", None) is None:
            job.draft_version = 0

    mock_repos["jobs"].add = AsyncMock(side_effect=add_job)
    mock_repos["events"].add = AsyncMock()

    out = await service.create_job("user-1", ImportJobCreate(title="Mon"))
    assert out.title == "Mon"
    mock_repos["jobs"].add.assert_awaited()
    mock_repos["events"].add.assert_awaited()


@pytest.mark.asyncio
async def test_upload_writes_image_and_rejects_non_image(
    tmp_path: Path, mock_repos: dict
) -> None:
    service = _service(tmp_path, mock_repos)
    job = _job()
    mock_repos["jobs"].get_owned = AsyncMock(return_value=job)
    mock_repos["pages"].count_for_job = AsyncMock(return_value=0)
    mock_repos["pages"].free_soft_deleted_indexes = AsyncMock()
    mock_repos["pages"].next_page_index = AsyncMock(return_value=0)

    async def add_page(page):
        _stamp_timestamps(page)

    mock_repos["pages"].add = AsyncMock(side_effect=add_page)
    mock_repos["events"].add = AsyncMock()
    mock_repos["session"].flush = AsyncMock()

    pages = await service.upload_pages(
        "user-1",
        "job-1",
        files=[("page1.png", "image/png", PNG_1X1)],
    )
    assert len(pages) == 1
    assert pages[0].page_index == 0
    assert pages[0].mime_type == "image/png"
    media_files = list((tmp_path / "media" / "ai_imports" / "user-1" / "job-1").glob("*"))
    assert len(media_files) == 1
    assert media_files[0].read_bytes() == PNG_1X1

    with pytest.raises(DomainError, match="Only image"):
        await service.upload_pages(
            "user-1",
            "job-1",
            files=[("notes.pdf", "application/pdf", b"%PDF")],
        )


@pytest.mark.asyncio
async def test_upload_rejects_oversized(tmp_path: Path, mock_repos: dict) -> None:
    service = _service(tmp_path, mock_repos)
    service.settings.max_upload_bytes = 10
    mock_repos["jobs"].get_owned = AsyncMock(return_value=_job())
    mock_repos["pages"].count_for_job = AsyncMock(return_value=0)
    mock_repos["pages"].free_soft_deleted_indexes = AsyncMock()
    mock_repos["pages"].next_page_index = AsyncMock(return_value=0)

    with pytest.raises(DomainError, match="max upload"):
        await service.upload_pages(
            "user-1",
            "job-1",
            files=[("big.png", "image/png", PNG_1X1 * 20)],
        )


@pytest.mark.asyncio
async def test_upload_rejected_when_committed(tmp_path: Path, mock_repos: dict) -> None:
    service = _service(tmp_path, mock_repos)
    mock_repos["jobs"].get_owned = AsyncMock(
        return_value=_job(status=AiImportJobStatus.COMMITTED)
    )
    with pytest.raises(ConflictError):
        await service.upload_pages(
            "user-1",
            "job-1",
            files=[("page1.png", "image/png", PNG_1X1)],
        )


@pytest.mark.asyncio
async def test_upload_empty_files_rejected(tmp_path: Path, mock_repos: dict) -> None:
    service = _service(tmp_path, mock_repos)
    mock_repos["jobs"].get_owned = AsyncMock(return_value=_job())
    with pytest.raises(DomainError, match="At least one"):
        await service.upload_pages("user-1", "job-1", files=[])


@pytest.mark.asyncio
async def test_delete_page_not_found(tmp_path: Path, mock_repos: dict) -> None:
    service = _service(tmp_path, mock_repos)
    mock_repos["jobs"].get_owned = AsyncMock(return_value=_job())
    mock_repos["pages"].get_owned_for_job = AsyncMock(return_value=None)
    with pytest.raises(NotFoundError):
        await service.delete_page("user-1", "job-1", "missing")


@pytest.mark.asyncio
async def test_parse_date_hint_from_filename(tmp_path: Path, mock_repos: dict) -> None:
    service = _service(tmp_path, mock_repos)
    assert service._parse_date_hint("WhatsApp_2026-07-11.jpg") == __import__(
        "datetime"
    ).date(2026, 7, 11)
    assert service._parse_date_hint("scan.png") is None
