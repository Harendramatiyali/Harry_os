"""Knowledge base ORM — Obsidian-imported and native notes."""

from __future__ import annotations

import enum
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


def _enum_values(enum_cls: type) -> list[str]:
    return [m.value for m in enum_cls]  # type: ignore[attr-defined]


class NoteSource(str, enum.Enum):
    NATIVE = "native"
    OBSIDIAN = "obsidian"


class NoteArea(str, enum.Enum):
    """High-level Life OS area derived from vault folders."""

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


class NoteKind(str, enum.Enum):
    NOTE = "note"
    DAILY_JOURNAL = "daily_journal"
    TRADING_JOURNAL = "trading_journal"
    WEEKLY_REVIEW = "weekly_review"
    MONTHLY_REVIEW = "monthly_review"
    BOOK = "book"
    TEMPLATE = "template"
    RULES = "rules"
    DASHBOARD = "dashboard"


class KnowledgeNote(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "knowledge_notes"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    source: Mapped[NoteSource] = mapped_column(
        Enum(
            NoteSource,
            name="knowledge_note_source",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=NoteSource.NATIVE,
        server_default=NoteSource.NATIVE.value,
        index=True,
    )
    area: Mapped[NoteArea] = mapped_column(
        Enum(
            NoteArea,
            name="knowledge_note_area",
            native_enum=False,
            length=16,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=NoteArea.OTHER,
        server_default=NoteArea.OTHER.value,
        index=True,
    )
    kind: Mapped[NoteKind] = mapped_column(
        Enum(
            NoteKind,
            name="knowledge_note_kind",
            native_enum=False,
            length=24,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=NoteKind.NOTE,
        server_default=NoteKind.NOTE.value,
        index=True,
    )
    # Vault-relative path using forward slashes, e.g. "📁 07_Books/Atomic Habits.md"
    vault_path: Mapped[str | None] = mapped_column(String(1024), nullable=True, index=True)
    folder_path: Mapped[str | None] = mapped_column(String(1024), nullable=True, index=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    tags_csv: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    wikilinks_csv: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    frontmatter_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    journal_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_empty: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


class ImportRun(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Audit trail for Obsidian import-only jobs."""

    __tablename__ = "knowledge_import_runs"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    vault_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    dry_run: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    scanned: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    skipped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    empty_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    report_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class KnowledgePromotion(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Links a Knowledge note to a domain-module entity after promote."""

    __tablename__ = "knowledge_promotions"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_notes.id", ondelete="CASCADE"), index=True
    )
    target_module: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    target_entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(16), nullable=False, default="created", server_default="created")
