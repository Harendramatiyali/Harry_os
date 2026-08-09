"""Knowledge Inbox schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeInboxItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str | None
    parser_type: str
    suggested_destination: str | None
    chosen_destination: str | None
    title: str | None
    status: str
    classification_confidence: float | None
    routed_journal_day_id: str | None
    ocr_summary: str | None = None
    created_at: datetime
    updated_at: datetime


class KnowledgeInboxDetailOut(KnowledgeInboxItemOut):
    draft_json: str | None = None


class AssignDestinationRequest(BaseModel):
    destination_module: str = Field(
        ...,
        description="trading | books | finance | health | planner | knowledge | inbox",
    )
    parser_type: str | None = Field(
        default=None,
        description="Optional parser override when routing (e.g. trading).",
    )
    notes: str | None = None


class AssignDestinationOut(BaseModel):
    inbox_item: KnowledgeInboxItemOut
    correction_recorded: bool = True
    journal_day_id: str | None = None
    message: str
