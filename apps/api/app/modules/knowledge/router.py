"""Knowledge + Obsidian import HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.modules.auth.deps import CurrentUserDep
from app.modules.knowledge.deps import KnowledgeServiceDep, PromoteServiceDep
from app.modules.knowledge.schemas import (
    KnowledgeDashboard,
    NoteCreate,
    NoteOut,
    NoteSummary,
    NoteUpdate,
    ObsidianImportReport,
    ObsidianImportRequest,
    PromoteReport,
    PromoteRequest,
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("/dashboard", response_model=KnowledgeDashboard)
async def dashboard(user: CurrentUserDep, service: KnowledgeServiceDep) -> KnowledgeDashboard:
    return await service.dashboard(user.id)


@router.get("/notes", response_model=list[NoteSummary])
async def list_notes(
    user: CurrentUserDep,
    service: KnowledgeServiceDep,
    area: str | None = None,
    kind: str | None = None,
    source: str | None = None,
    q: str | None = None,
) -> list[NoteSummary]:
    return await service.list_notes(user.id, area=area, kind=kind, source=source, q=q)


@router.post("/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate, user: CurrentUserDep, service: KnowledgeServiceDep
) -> NoteOut:
    return await service.create_note(user.id, body)


@router.get("/notes/{note_id}", response_model=NoteOut)
async def get_note(note_id: str, user: CurrentUserDep, service: KnowledgeServiceDep) -> NoteOut:
    return await service.get_note(user.id, note_id)


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: str, body: NoteUpdate, user: CurrentUserDep, service: KnowledgeServiceDep
) -> NoteOut:
    return await service.update_note(user.id, note_id, body)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, user: CurrentUserDep, service: KnowledgeServiceDep) -> None:
    await service.delete_note(user.id, note_id)


@router.post("/obsidian/import", response_model=ObsidianImportReport)
async def import_obsidian(
    body: ObsidianImportRequest,
    user: CurrentUserDep,
    service: KnowledgeServiceDep,
    dry_run: bool | None = Query(default=None),
) -> ObsidianImportReport:
    """Import-only from local Obsidian vault. Pass dry_run=true to preview."""
    if dry_run is not None:
        body = body.model_copy(update={"dry_run": dry_run})
    return await service.import_obsidian(user.id, body)


@router.post("/obsidian/dry-run", response_model=ObsidianImportReport)
async def dry_run_obsidian(
    body: ObsidianImportRequest, user: CurrentUserDep, service: KnowledgeServiceDep
) -> ObsidianImportReport:
    body = body.model_copy(update={"dry_run": True})
    return await service.import_obsidian(user.id, body)


@router.post("/promote", response_model=PromoteReport)
async def promote_to_modules(
    body: PromoteRequest,
    user: CurrentUserDep,
    service: PromoteServiceDep,
) -> PromoteReport:
    """Map Knowledge notes into Books + Trading (idempotent)."""
    return await service.promote(user.id, body)


@router.post("/promote/dry-run", response_model=PromoteReport)
async def promote_dry_run(
    body: PromoteRequest,
    user: CurrentUserDep,
    service: PromoteServiceDep,
) -> PromoteReport:
    body = body.model_copy(update={"dry_run": True})
    return await service.promote(user.id, body)
