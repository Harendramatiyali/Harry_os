"""API tests — Knowledge Inbox routes."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.errors import register_exception_handlers
from app.modules.ai.import_engine.inbox.router import get_inbox_service, router as inbox_router
from app.modules.ai.import_engine.inbox.schemas import (
    AssignDestinationOut,
    KnowledgeInboxItemOut,
)
from app.modules.auth.deps import get_current_user
from tests.helpers import make_user


class FakeInboxService:
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self.item = KnowledgeInboxItemOut(
            id="inbox-1",
            job_id="job-1",
            parser_type="general",
            suggested_destination="inbox",
            chosen_destination=None,
            title="Unknown page",
            status="queued",
            classification_confidence=0.4,
            routed_journal_day_id=None,
            ocr_summary="some text",
            created_at=now,
            updated_at=now,
        )

    async def list_items(self, user_id: str, *, status: str | None = None):
        return [self.item]

    async def get_item(self, user_id: str, item_id: str):
        from app.modules.ai.import_engine.inbox.schemas import KnowledgeInboxDetailOut

        return KnowledgeInboxDetailOut(**self.item.model_dump(), draft_json="{}")

    async def assign_destination(self, user_id, item_id, body, *, job=None, pages_by_id=None):
        self.item.chosen_destination = body.destination_module
        self.item.status = "assigned" if body.destination_module != "trading" else "routed"
        return AssignDestinationOut(
            inbox_item=self.item,
            correction_recorded=True,
            journal_day_id="day-1" if body.destination_module == "trading" else None,
            message="ok",
        )


@pytest.fixture
async def inbox_client():
    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(inbox_router, prefix="/api/v1/ai")
    fake = FakeInboxService()
    user = make_user()

    async def _user():
        return user

    async def _svc():
        return fake

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_inbox_service] = _svc

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, fake
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_inbox(inbox_client) -> None:
    client, _ = inbox_client
    res = await client.get("/api/v1/ai/knowledge/inbox", headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    assert res.json()[0]["id"] == "inbox-1"


@pytest.mark.asyncio
async def test_assign_destination(inbox_client) -> None:
    client, fake = inbox_client
    # Non-trading assign does not need job lookup
    res = await client.post(
        "/api/v1/ai/knowledge/inbox/inbox-1/destination",
        headers={"Authorization": "Bearer x"},
        json={"destination_module": "books", "notes": "looks like a book"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["correction_recorded"] is True
    assert body["inbox_item"]["chosen_destination"] == "books"
