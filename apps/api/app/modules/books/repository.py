"""Books persistence."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.db.repository import BaseRepository
from app.modules.books.models import Book, BookHighlight, BookQuote, ReadingNote, VocabItem


class BookRepository(BaseRepository[Book]):
    model = Book

    async def get_owned(self, user_id: str, book_id: str) -> Book | None:
        stmt = (
            select(Book)
            .where(Book.id == book_id, Book.user_id == user_id, Book.deleted_at.is_(None))
            .options(
                selectinload(Book.highlights),
                selectinload(Book.quotes),
                selectinload(Book.notes),
                selectinload(Book.vocabulary),
            )
        )
        return await self.session.scalar(stmt)

    async def get_by_title(self, user_id: str, title: str) -> Book | None:
        stmt = select(Book).where(
            Book.user_id == user_id,
            Book.title == title,
            Book.deleted_at.is_(None),
        )
        return await self.session.scalar(stmt)

    async def list_for_user(
        self,
        user_id: str,
        *,
        status: str | None = None,
        q: str | None = None,
        limit: int = 100,
    ) -> list[Book]:
        stmt = (
            select(Book)
            .where(Book.user_id == user_id, Book.deleted_at.is_(None))
            .options(
                selectinload(Book.highlights),
                selectinload(Book.quotes),
                selectinload(Book.notes),
                selectinload(Book.vocabulary),
            )
            .order_by(Book.updated_at.desc())
            .limit(limit)
        )
        if status:
            stmt = stmt.where(Book.status == status)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(or_(Book.title.ilike(like), Book.author.ilike(like), Book.tags_csv.ilike(like)))
        return list(await self.session.scalars(stmt))


class HighlightRepository(BaseRepository[BookHighlight]):
    model = BookHighlight

    async def list_for_book(self, user_id: str, book_id: str) -> list[BookHighlight]:
        stmt = (
            select(BookHighlight)
            .where(
                BookHighlight.user_id == user_id,
                BookHighlight.book_id == book_id,
                BookHighlight.deleted_at.is_(None),
            )
            .order_by(BookHighlight.created_at.desc())
        )
        return list(await self.session.scalars(stmt))

    async def recent(self, user_id: str, limit: int = 5) -> list[BookHighlight]:
        stmt = (
            select(BookHighlight)
            .where(BookHighlight.user_id == user_id, BookHighlight.deleted_at.is_(None))
            .order_by(BookHighlight.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))


class QuoteRepository(BaseRepository[BookQuote]):
    model = BookQuote

    async def list_for_book(self, user_id: str, book_id: str) -> list[BookQuote]:
        stmt = (
            select(BookQuote)
            .where(
                BookQuote.user_id == user_id,
                BookQuote.book_id == book_id,
                BookQuote.deleted_at.is_(None),
            )
            .order_by(BookQuote.created_at.desc())
        )
        return list(await self.session.scalars(stmt))

    async def favorites(self, user_id: str, limit: int = 5) -> list[BookQuote]:
        stmt = (
            select(BookQuote)
            .where(
                BookQuote.user_id == user_id,
                BookQuote.deleted_at.is_(None),
                BookQuote.is_favorite.is_(True),
            )
            .order_by(BookQuote.created_at.desc())
            .limit(limit)
        )
        return list(await self.session.scalars(stmt))


class ReadingNoteRepository(BaseRepository[ReadingNote]):
    model = ReadingNote

    async def list_for_book(self, user_id: str, book_id: str) -> list[ReadingNote]:
        stmt = (
            select(ReadingNote)
            .where(
                ReadingNote.user_id == user_id,
                ReadingNote.book_id == book_id,
                ReadingNote.deleted_at.is_(None),
            )
            .order_by(ReadingNote.created_at.desc())
        )
        return list(await self.session.scalars(stmt))


class VocabRepository(BaseRepository[VocabItem]):
    model = VocabItem

    async def list_for_user(self, user_id: str, book_id: str | None = None) -> list[VocabItem]:
        stmt = (
            select(VocabItem)
            .where(VocabItem.user_id == user_id, VocabItem.deleted_at.is_(None))
            .order_by(VocabItem.created_at.desc())
        )
        if book_id:
            stmt = stmt.where(VocabItem.book_id == book_id)
        return list(await self.session.scalars(stmt))


def soft_delete(entity) -> None:
    entity.deleted_at = datetime.now(timezone.utc)


def calc_progress(pages_read: int, page_count: int | None, progress_pct: int | None = None) -> tuple[int, int]:
    if page_count and page_count > 0:
        pct = min(100, int(round(pages_read / page_count * 100)))
        return pages_read, pct
    if progress_pct is not None:
        return pages_read, max(0, min(100, progress_pct))
    return pages_read, 0
