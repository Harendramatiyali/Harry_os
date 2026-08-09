"""API tests — AI Import HTTP routes (dependency-overridden, no DB)."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient

from app.core.errors import ConflictError, DomainError, NotFoundError
from tests.conftest import FakeAiImportService
from tests.helpers import PNG_1X1


@pytest.mark.asyncio
async def test_create_import_session(api_client: AsyncClient, fake_service: FakeAiImportService) -> None:
    res = await api_client.post(
        "/api/v1/ai/imports/jobs",
        json={"title": "Monday notebook", "notebook_label": "NB-1"},
        headers={"Authorization": "Bearer test"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["id"] == "job-api-1"
    assert body["title"] == "Monday notebook"
    assert len(fake_service.created) == 1


@pytest.mark.asyncio
async def test_upload_images(api_client: AsyncClient, fake_service: FakeAiImportService) -> None:
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/pages",
        headers={"Authorization": "Bearer test"},
        files=[
            ("files", ("page1.png", io.BytesIO(PNG_1X1), "image/png")),
            ("files", ("page2.png", io.BytesIO(PNG_1X1), "image/png")),
        ],
    )
    assert res.status_code == 201
    pages = res.json()
    assert len(pages) == 2
    assert pages[0]["original_file_name"] == "page1.png"
    assert len(fake_service.uploads) == 2


@pytest.mark.asyncio
async def test_upload_rejects_domain_error(
    api_client: AsyncClient, fake_service: FakeAiImportService
) -> None:
    fake_service.fail_upload = DomainError("Only image uploads are allowed: notes.pdf")
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/pages",
        headers={"Authorization": "Bearer test"},
        files=[("files", ("notes.pdf", io.BytesIO(b"%PDF"), "application/pdf"))],
    )
    assert res.status_code == 422
    assert "image" in res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_list_and_delete_pages(
    api_client: AsyncClient, fake_service: FakeAiImportService
) -> None:
    await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/pages",
        headers={"Authorization": "Bearer test"},
        files=[("files", ("page1.png", io.BytesIO(PNG_1X1), "image/png"))],
    )
    listed = await api_client.get(
        "/api/v1/ai/imports/jobs/job-api-1/pages",
        headers={"Authorization": "Bearer test"},
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    page_id = listed.json()[0]["id"]

    deleted = await api_client.delete(
        f"/api/v1/ai/imports/jobs/job-api-1/pages/{page_id}",
        headers={"Authorization": "Bearer test"},
    )
    assert deleted.status_code == 204
    assert fake_service.deleted[-1][2] == page_id


@pytest.mark.asyncio
async def test_get_status_includes_draft(api_client: AsyncClient) -> None:
    res = await api_client.get(
        "/api/v1/ai/imports/jobs/job-api-1",
        headers={"Authorization": "Bearer test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["has_draft"] is True
    assert body["draft"]["journal_date"] == "2026-07-15"
    assert body["confidence"]["overall"] is not None


@pytest.mark.asyncio
async def test_generate_preview(api_client: AsyncClient, fake_service: FakeAiImportService) -> None:
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/preview",
        headers={"Authorization": "Bearer test"},
        json={"journal_date": "2026-07-15", "title": "Override"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["draft_version"] == 1
    assert "draft" in body
    assert fake_service.preview_calls == ["job-api-1"]


@pytest.mark.asyncio
async def test_confirm_destination(api_client: AsyncClient, fake_service: FakeAiImportService) -> None:
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/destination",
        headers={"Authorization": "Bearer test"},
        json={"destination_module": "trading", "parser_type": "trading"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["job"]["destination_confirmed"] is True
    assert body["job"]["destination_module"] == "trading"
    assert fake_service.destination_confirmed is True
    assert len(fake_service.destination_calls) == 1


@pytest.mark.asyncio
async def test_classify_later_queues_inbox(
    api_client: AsyncClient, fake_service: FakeAiImportService
) -> None:
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/destination",
        headers={"Authorization": "Bearer test"},
        json={"destination_module": "inbox", "classify_later": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["inbox_item_id"] == "inbox-1"
    assert body["job"]["destination_module"] == "inbox"


@pytest.mark.asyncio
async def test_commit_save_journal(api_client: AsyncClient, fake_service: FakeAiImportService) -> None:
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/commit",
        headers={"Authorization": "Bearer test"},
        json={"approve": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "committed"
    assert body["journal_day_id"] == "day-1"
    assert body["trade_count"] == 1
    assert fake_service.commit_calls == ["job-api-1"]


@pytest.mark.asyncio
async def test_commit_conflict_when_date_exists(
    api_client: AsyncClient, fake_service: FakeAiImportService
) -> None:
    fake_service.fail_commit = ConflictError("Journal already exists for 2026-07-15")
    res = await api_client.post(
        "/api/v1/ai/imports/jobs/job-api-1/commit",
        headers={"Authorization": "Bearer test"},
        json={"approve": True},
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_status_not_found(api_client: AsyncClient, fake_service: FakeAiImportService) -> None:
    async def boom(user_id: str, job_id: str):
        raise NotFoundError("Import session not found")

    fake_service.get_status = boom  # type: ignore[method-assign]
    res = await api_client.get(
        "/api/v1/ai/imports/jobs/missing",
        headers={"Authorization": "Bearer test"},
    )
    assert res.status_code == 404
