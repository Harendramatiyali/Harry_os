"""Pytest fixtures for Harry OS API — AI Import Center suite."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.errors import register_exception_handlers
from app.modules.ai.imports.deps import get_ai_import_service
from app.modules.ai.imports.router import router as imports_router
from app.modules.ai.imports.schemas import (
    ConfidenceMap,
    ConfirmDestinationOut,
    ConfirmDestinationRequest,
    ImportCommitOut,
    ImportJobOut,
    ImportJobStatusOut,
    ImportPageOut,
    ImportPreviewOut,
    JournalDraft,
)
from app.modules.auth.deps import get_current_user
from tests.helpers import PNG_1X1, make_confidence, make_draft, make_user


@pytest.fixture
def png_bytes() -> bytes:
    return PNG_1X1


@pytest.fixture
def sample_draft() -> JournalDraft:
    return make_draft()


@pytest.fixture
def sample_confidence() -> ConfidenceMap:
    return make_confidence()


@pytest.fixture
def test_user():
    return make_user()


@pytest.fixture
def sidecar_page(tmp_path: Path, png_bytes: bytes) -> Path:
    """Write a PNG + sidecar transcript for OCR/pipeline tests."""
    img = tmp_path / "page1.png"
    txt = tmp_path / "page1.txt"
    img.write_bytes(png_bytes)
    txt.write_text(
        """# Trading Day
📅 Date: 2026-07-15

## Market Context
NIFTY opened gap up. Bias bullish.

# Trade 1
- **Instrument**: NIFTY 24500 CE
- **Quantity**: 65
- **Entry**: 120
- **Exit**: 145
- **Result**: win

## Trade Setup
Breakout continuation.
""",
        encoding="utf-8",
    )
    return img


class FakeAiImportService:
    """In-memory stand-in for route-level API tests (no DB)."""

    def __init__(self) -> None:
        self.created: list[dict[str, Any]] = []
        self.uploads: list[dict[str, Any]] = []
        self.deleted: list[tuple[str, str, str]] = []
        self.preview_calls: list[str] = []
        self.commit_calls: list[str] = []
        self.destination_calls: list[dict[str, Any]] = []
        self.fail_upload: Exception | None = None
        self.fail_preview: Exception | None = None
        self.fail_commit: Exception | None = None
        self.destination_confirmed = False
        self._job_id = "job-api-1"
        self._page_id = "page-api-1"
        self.pages_store: dict[str, ImportPageOut] = {}
        self.draft: JournalDraft | None = make_draft(page_ids=["page-api-1"])
        self.confidence = make_confidence()
        self.storage_path: str | None = None

    def _job_out(self, **overrides: Any) -> ImportJobOut:
        now = datetime.now(timezone.utc)
        base = dict(
            id=self._job_id,
            title="API Test Job",
            notebook_label=None,
            status="queued",
            review_status="pending",
            current_stage="created",
            page_count=len(self.pages_store),
            overall_confidence=None,
            draft_version=0,
            detected_journal_date=None,
            committed_journal_day_id=None,
            parser_type="trading",
            classification_confidence=None,
            destination_module="trading",
            destination_confirmed=self.destination_confirmed,
            review_schema_version=None,
            model_id=None,
            prompt_version=None,
            error_code=None,
            error_message=None,
            created_at=now,
            updated_at=now,
        )
        base.update(overrides)
        return ImportJobOut(**base)

    async def create_job(self, user_id: str, data: Any) -> ImportJobOut:
        self.created.append({"user_id": user_id, "data": data})
        return self._job_out(title=getattr(data, "title", None) or "API Test Job")

    async def upload_pages(
        self, user_id: str, job_id: str, *, files: list[tuple[str, str, bytes]]
    ) -> list[ImportPageOut]:
        if self.fail_upload:
            raise self.fail_upload
        now = datetime.now(timezone.utc)
        out: list[ImportPageOut] = []
        for i, (name, mime, data) in enumerate(files):
            page_id = f"page-api-{len(self.pages_store) + 1}"
            page = ImportPageOut(
                id=page_id,
                job_id=job_id,
                page_index=i,
                original_file_name=name,
                mime_type=mime,
                byte_size=len(data),
                checksum="abc",
                status="uploaded",
                quality_score=None,
                ocr_confidence=None,
                has_ocr_transcript=False,
                created_at=now,
                updated_at=now,
            )
            self.pages_store[page_id] = page
            out.append(page)
            self.uploads.append(
                {"user_id": user_id, "job_id": job_id, "name": name, "mime": mime, "size": len(data)}
            )
        return out

    async def delete_page(self, user_id: str, job_id: str, page_id: str) -> None:
        self.deleted.append((user_id, job_id, page_id))
        self.pages_store.pop(page_id, None)

    async def list_pages(self, user_id: str, job_id: str) -> list[ImportPageOut]:
        return list(self.pages_store.values())

    async def get_status(self, user_id: str, job_id: str) -> ImportJobStatusOut:
        job = self._job_out(
            id=job_id,
            status="awaiting_review" if self.draft else "queued",
            draft_version=1 if self.draft else 0,
            overall_confidence=self.confidence.overall,
            page_count=len(self.pages_store),
        )
        return ImportJobStatusOut(
            **job.model_dump(),
            has_draft=self.draft is not None,
            confidence=self.confidence if self.draft else None,
            pages=list(self.pages_store.values()),
            draft=self.draft,
        )

    async def generate_preview(self, user_id: str, job_id: str, body: Any) -> ImportPreviewOut:
        if self.fail_preview:
            raise self.fail_preview
        self.preview_calls.append(job_id)
        self.destination_confirmed = False
        assert self.draft is not None
        return ImportPreviewOut(
            job=self._job_out(id=job_id, status="awaiting_review", draft_version=1, page_count=1),
            draft=self.draft,
            confidence=self.confidence,
            draft_version=1,
            warnings=[],
        )

    async def confirm_destination(
        self, user_id: str, job_id: str, body: ConfirmDestinationRequest
    ) -> ConfirmDestinationOut:
        self.destination_calls.append({"job_id": job_id, "body": body})
        self.destination_confirmed = True
        dest = body.destination_module
        if body.classify_later or dest == "inbox":
            return ConfirmDestinationOut(
                job=self._job_out(
                    id=job_id,
                    status="awaiting_review",
                    destination_module="inbox",
                    destination_confirmed=True,
                ),
                preview=None,
                inbox_item_id="inbox-1",
                message="Queued in Knowledge Inbox.",
            )
        return ConfirmDestinationOut(
            job=self._job_out(
                id=job_id,
                status="awaiting_review",
                destination_module=dest,
                destination_confirmed=True,
                parser_type=body.parser_type or "trading",
            ),
            preview=None,
            inbox_item_id=None,
            message=f"Destination set to {dest}.",
        )

    async def save_journal(self, user_id: str, job_id: str, body: Any) -> ImportCommitOut:
        if self.fail_commit:
            raise self.fail_commit
        self.commit_calls.append(job_id)
        return ImportCommitOut(
            job_id=job_id,
            journal_day_id="day-1",
            journal_date=date(2026, 7, 15),
            status="committed",
            review_status="committed",
            trade_count=1,
            section_count=1,
            attachment_count=1,
            destination="trading",
            message="Saved to Trading Journal",
        )

    async def get_page_file(self, user_id: str, page_id: str) -> Any:
        return MagicMock(
            storage_path=self.storage_path,
            mime_type="image/png",
            original_file_name="page.png",
        )


@pytest.fixture
def fake_service() -> FakeAiImportService:
    return FakeAiImportService()


@pytest.fixture
def api_app(test_user, fake_service: FakeAiImportService) -> Iterator[FastAPI]:
    """Minimal FastAPI app with Import routes + auth/service overrides (no DB lifespan)."""
    application = FastAPI()
    register_exception_handlers(application)
    application.include_router(imports_router, prefix="/api/v1/ai")

    async def _user():
        return test_user

    async def _service():
        return fake_service

    application.dependency_overrides[get_current_user] = _user
    application.dependency_overrides[get_ai_import_service] = _service
    yield application
    application.dependency_overrides.clear()


@pytest.fixture
async def api_client(api_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=api_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_repos() -> dict[str, AsyncMock]:
    """Async mocks for AiImportService constructor deps."""
    jobs = AsyncMock()
    pages = AsyncMock()
    drafts = AsyncMock()
    events = AsyncMock()
    journals = AsyncMock()
    session = AsyncMock()
    jobs.session = session
    pages.session = session
    return {
        "jobs": jobs,
        "pages": pages,
        "drafts": drafts,
        "events": events,
        "journals": journals,
        "session": session,
    }
