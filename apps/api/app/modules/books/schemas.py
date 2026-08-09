"""Books module schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BookStatus(str, Enum):
    WANTED = "wanted"
    READING = "reading"
    FINISHED = "finished"
    ABANDONED = "abandoned"


class NoteKind(str, Enum):
    NOTE = "note"
    SUMMARY = "summary"
    INSIGHT = "insight"
    ACTION = "action"


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    author: str | None = None
    isbn: str | None = None
    status: BookStatus = BookStatus.WANTED
    rating: int | None = Field(default=None, ge=1, le=5)
    page_count: int | None = Field(default=None, ge=1)
    pages_read: int = Field(default=0, ge=0)
    started_on: date | None = None
    finished_on: date | None = None
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=512)
    author: str | None = None
    isbn: str | None = None
    status: BookStatus | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    page_count: int | None = Field(default=None, ge=1)
    pages_read: int | None = Field(default=None, ge=0)
    progress_pct: int | None = Field(default=None, ge=0, le=100)
    started_on: date | None = None
    finished_on: date | None = None
    summary: str | None = None
    tags: list[str] | None = None


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    author: str | None
    isbn: str | None
    status: BookStatus
    rating: int | None
    page_count: int | None
    pages_read: int
    progress_pct: int
    started_on: date | None
    finished_on: date | None
    summary: str | None
    tags: list[str] = Field(default_factory=list)
    highlights_count: int = 0
    quotes_count: int = 0
    notes_count: int = 0
    vocab_count: int = 0
    created_at: datetime
    updated_at: datetime


class HighlightCreate(BaseModel):
    text: str = Field(min_length=1)
    location_ref: str | None = None
    note: str | None = None
    color: str | None = None


class HighlightUpdate(BaseModel):
    text: str | None = None
    location_ref: str | None = None
    note: str | None = None
    color: str | None = None


class HighlightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    book_id: str
    text: str
    location_ref: str | None
    note: str | None
    color: str | None
    created_at: datetime


class QuoteCreate(BaseModel):
    text: str = Field(min_length=1)
    location_ref: str | None = None
    is_favorite: bool = False


class QuoteUpdate(BaseModel):
    text: str | None = None
    location_ref: str | None = None
    is_favorite: bool | None = None


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    book_id: str
    text: str
    location_ref: str | None
    is_favorite: bool
    created_at: datetime


class ReadingNoteCreate(BaseModel):
    kind: NoteKind = NoteKind.NOTE
    title: str | None = None
    body: str = Field(min_length=1)
    location_ref: str | None = None


class ReadingNoteUpdate(BaseModel):
    kind: NoteKind | None = None
    title: str | None = None
    body: str | None = None
    location_ref: str | None = None


class ReadingNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    book_id: str
    kind: NoteKind
    title: str | None
    body: str
    location_ref: str | None
    created_at: datetime


class VocabCreate(BaseModel):
    word: str = Field(min_length=1, max_length=120)
    meaning: str = Field(min_length=1)
    example: str | None = None
    mastery: int = Field(default=0, ge=0, le=5)
    book_id: str | None = None


class VocabUpdate(BaseModel):
    word: str | None = None
    meaning: str | None = None
    example: str | None = None
    mastery: int | None = Field(default=None, ge=0, le=5)
    book_id: str | None = None


class VocabOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    book_id: str | None
    word: str
    meaning: str
    example: str | None
    mastery: int
    created_at: datetime


class BooksDashboard(BaseModel):
    total_books: int
    reading: int
    finished: int
    wanted: int
    abandoned: int
    pages_read_total: int
    highlights_total: int
    quotes_total: int
    notes_total: int
    vocab_total: int
    avg_rating: float | None
    currently_reading: list[BookOut]
    recent_highlights: list[HighlightOut]
    favorite_quotes: list[QuoteOut]


class BooksStats(BaseModel):
    finished_this_year: int
    finished_this_month: int
    pages_read_this_year: int
    avg_progress_reading: float
    top_authors: list[dict]
