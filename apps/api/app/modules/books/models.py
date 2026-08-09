"""Books module ORM models."""

from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PrimaryKeyMixin, SoftDeleteMixin, TimestampMixin


class BookStatus(str, enum.Enum):
    WANTED = "wanted"
    READING = "reading"
    FINISHED = "finished"
    ABANDONED = "abandoned"


class NoteKind(str, enum.Enum):
    NOTE = "note"
    SUMMARY = "summary"
    INSIGHT = "insight"
    ACTION = "action"


class Book(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "books"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    isbn: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[BookStatus] = mapped_column(
        Enum(BookStatus, name="book_status", native_enum=False, length=16),
        nullable=False,
        default=BookStatus.WANTED,
        server_default=BookStatus.WANTED.value,
        index=True,
    )
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pages_read: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    started_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    finished_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    tags_csv: Mapped[str | None] = mapped_column(String(512), nullable=True)

    highlights: Mapped[list[BookHighlight]] = relationship(back_populates="book", cascade="all, delete-orphan")
    quotes: Mapped[list[BookQuote]] = relationship(back_populates="book", cascade="all, delete-orphan")
    notes: Mapped[list[ReadingNote]] = relationship(back_populates="book", cascade="all, delete-orphan")
    vocabulary: Mapped[list[VocabItem]] = relationship(back_populates="book", cascade="all, delete-orphan")


class BookHighlight(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "book_highlights"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(String(36), ForeignKey("books.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    location_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)

    book: Mapped[Book] = relationship(back_populates="highlights")


class BookQuote(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "book_quotes"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(String(36), ForeignKey("books.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    location_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")

    book: Mapped[Book] = relationship(back_populates="quotes")


class ReadingNote(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "reading_notes"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str] = mapped_column(String(36), ForeignKey("books.id", ondelete="CASCADE"), index=True)
    kind: Mapped[NoteKind] = mapped_column(
        Enum(NoteKind, name="reading_note_kind", native_enum=False, length=16),
        nullable=False,
        default=NoteKind.NOTE,
        server_default=NoteKind.NOTE.value,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    location_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)

    book: Mapped[Book] = relationship(back_populates="notes")


class VocabItem(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vocab_items"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("books.id", ondelete="SET NULL"), nullable=True, index=True
    )
    word: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    mastery: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    book: Mapped[Book | None] = relationship(back_populates="vocabulary")
