"""Knowledge / Obsidian import schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class NoteSource(str, Enum):
    NATIVE = "native"
    OBSIDIAN = "obsidian"


class NoteArea(str, Enum):
    DASHBOARD = "dashboard"
    LIFE = "life"
    WEALTH = "wealth"
    TRADING = "trading"
    CAREER = "career"
    AI = "ai"
    HEALTH = "health"
    BOOKS = "books"
    JOURNAL = "journal"
    RESOURCES = "resources"
    ARCHIVE = "archive"
    PROJECT = "project"
    OTHER = "other"


class NoteKind(str, Enum):
    NOTE = "note"
    DAILY_JOURNAL = "daily_journal"
    TRADING_JOURNAL = "trading_journal"
    WEEKLY_REVIEW = "weekly_review"
    MONTHLY_REVIEW = "monthly_review"
    BOOK = "book"
    TEMPLATE = "template"
    RULES = "rules"
    DASHBOARD = "dashboard"


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    body: str = ""
    area: NoteArea = NoteArea.OTHER
    kind: NoteKind = NoteKind.NOTE
    tags: list[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=512)
    body: str | None = None
    area: NoteArea | None = None
    kind: NoteKind | None = None
    tags: list[str] | None = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    body: str
    source: NoteSource
    area: NoteArea
    kind: NoteKind
    vault_path: str | None
    folder_path: str | None
    tags: list[str] = Field(default_factory=list)
    wikilinks: list[str] = Field(default_factory=list)
    journal_date: date | None
    word_count: int
    is_empty: bool
    created_at: datetime
    updated_at: datetime


class NoteSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    source: NoteSource
    area: NoteArea
    kind: NoteKind
    vault_path: str | None
    folder_path: str | None
    journal_date: date | None
    word_count: int
    is_empty: bool
    updated_at: datetime


class AreaCount(BaseModel):
    area: str
    count: int


class KnowledgeDashboard(BaseModel):
    total_notes: int
    from_obsidian: int
    empty_notes: int
    by_area: list[AreaCount]
    recent: list[NoteSummary]


class ObsidianImportRequest(BaseModel):
    vault_path: str | None = None  # defaults to settings.obsidian_vault_path
    dry_run: bool = False
    skip_empty: bool = False
    include_harendra: bool = True  # include "99 - Harendra OS"


class ImportFilePreview(BaseModel):
    vault_path: str
    folder_path: str
    title: str
    area: NoteArea
    kind: NoteKind
    journal_date: date | None
    word_count: int
    is_empty: bool
    action: str  # create | update | skip


class ImportFolderGroup(BaseModel):
    """One Obsidian folder bucket for side-by-side checking."""

    folder_path: str  # vault-relative folder ("" = vault root)
    area: NoteArea
    count: int
    empty: int
    create: int
    update: int
    skip: int
    files: list[ImportFilePreview]


class ObsidianImportReport(BaseModel):
    vault_path: str
    dry_run: bool
    scanned: int
    created: int
    updated: int
    skipped: int
    empty: int
    by_area: list[AreaCount]
    by_folder: list[ImportFolderGroup] = Field(default_factory=list)
    files: list[ImportFilePreview] = Field(default_factory=list)
    # Kept for older clients; same as files
    samples: list[ImportFilePreview] = Field(default_factory=list)
    run_id: str | None = None


class PromoteRequest(BaseModel):
    """Promote Knowledge notes into domain modules (Books + Trading first)."""

    modules: list[str] = Field(default_factory=lambda: ["books", "trading"])
    dry_run: bool = False
    note_ids: list[str] | None = None


class PromoteItem(BaseModel):
    note_id: str
    title: str
    vault_path: str | None
    area: NoteArea
    kind: NoteKind
    target_module: str
    target_entity_type: str
    target_entity_id: str | None = None
    action: str  # create | update | skip | unsupported
    detail: str


class PromoteReport(BaseModel):
    dry_run: bool
    modules: list[str]
    eligible: int
    created: int
    updated: int
    skipped: int
    unsupported: int
    items: list[PromoteItem] = Field(default_factory=list)
