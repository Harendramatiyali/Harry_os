"""Books use-cases."""

from __future__ import annotations

import uuid
from datetime import date

from app.core.errors import NotFoundError
from app.modules.books.models import Book, BookHighlight, BookQuote, BookStatus, NoteKind, ReadingNote, VocabItem
from app.modules.books.repository import (
    BookRepository,
    HighlightRepository,
    QuoteRepository,
    ReadingNoteRepository,
    VocabRepository,
    calc_progress,
    soft_delete,
)
from app.modules.books.schemas import (
    BookCreate,
    BookOut,
    BooksDashboard,
    BooksStats,
    BookUpdate,
    HighlightCreate,
    HighlightOut,
    HighlightUpdate,
    QuoteCreate,
    QuoteOut,
    QuoteUpdate,
    ReadingNoteCreate,
    ReadingNoteOut,
    ReadingNoteUpdate,
    VocabCreate,
    VocabOut,
    VocabUpdate,
)


def _tags_csv(tags: list[str]) -> str | None:
    cleaned = sorted({t.strip().lower() for t in tags if t.strip()})
    return ",".join(cleaned) if cleaned else None


def _tags_list(csv: str | None) -> list[str]:
    return [t for t in (csv or "").split(",") if t]


class BooksService:
    def __init__(
        self,
        *,
        books: BookRepository,
        highlights: HighlightRepository,
        quotes: QuoteRepository,
        notes: ReadingNoteRepository,
        vocab: VocabRepository,
    ) -> None:
        self.books = books
        self.highlights = highlights
        self.quotes = quotes
        self.notes = notes
        self.vocab = vocab

    def to_book_out(self, book: Book) -> BookOut:
        return BookOut(
            id=book.id,
            title=book.title,
            author=book.author,
            isbn=book.isbn,
            status=book.status,  # type: ignore[arg-type]
            rating=book.rating,
            page_count=book.page_count,
            pages_read=book.pages_read,
            progress_pct=book.progress_pct,
            started_on=book.started_on,
            finished_on=book.finished_on,
            summary=book.summary,
            tags=_tags_list(book.tags_csv),
            highlights_count=len([h for h in (book.highlights or []) if not h.deleted_at]),
            quotes_count=len([q for q in (book.quotes or []) if not q.deleted_at]),
            notes_count=len([n for n in (book.notes or []) if not n.deleted_at]),
            vocab_count=len([v for v in (book.vocabulary or []) if not v.deleted_at]),
            created_at=book.created_at,
            updated_at=book.updated_at,
        )

    async def list_books(self, user_id: str, **kwargs) -> list[BookOut]:
        rows = await self.books.list_for_user(user_id, **kwargs)
        return [self.to_book_out(b) for b in rows]

    async def get_book(self, user_id: str, book_id: str) -> BookOut:
        return self.to_book_out(await self._book(user_id, book_id))

    async def create_book(self, user_id: str, data: BookCreate) -> BookOut:
        pages_read, pct = calc_progress(data.pages_read, data.page_count)
        status = BookStatus(data.status.value)
        book = Book(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title.strip(),
            author=data.author.strip() if data.author else None,
            isbn=data.isbn,
            status=status,
            rating=data.rating,
            page_count=data.page_count,
            pages_read=pages_read,
            progress_pct=pct,
            started_on=data.started_on or (date.today() if status == BookStatus.READING else None),
            finished_on=data.finished_on or (date.today() if status == BookStatus.FINISHED else None),
            summary=data.summary,
            tags_csv=_tags_csv(data.tags),
        )
        await self.books.add(book)
        book = await self.books.get_owned(user_id, book.id)
        assert book
        return self.to_book_out(book)

    async def update_book(self, user_id: str, book_id: str, data: BookUpdate) -> BookOut:
        book = await self._book(user_id, book_id)
        payload = data.model_dump(exclude_unset=True)
        tags = payload.pop("tags", None)
        if "status" in payload and payload["status"] is not None:
            payload["status"] = BookStatus(
                payload["status"].value if hasattr(payload["status"], "value") else payload["status"]
            )
            if payload["status"] == BookStatus.READING and not book.started_on:
                book.started_on = date.today()
            if payload["status"] == BookStatus.FINISHED and not book.finished_on:
                book.finished_on = date.today()
                payload.setdefault("progress_pct", 100)
                if book.page_count:
                    payload.setdefault("pages_read", book.page_count)

        for field, value in payload.items():
            setattr(book, field, value)
        if tags is not None:
            book.tags_csv = _tags_csv(tags)

        pages_read, pct = calc_progress(
            book.pages_read,
            book.page_count,
            payload.get("progress_pct", book.progress_pct),
        )
        book.pages_read = pages_read
        book.progress_pct = pct
        await self.books.session.flush()
        book = await self.books.get_owned(user_id, book.id)
        assert book
        return self.to_book_out(book)

    async def delete_book(self, user_id: str, book_id: str) -> None:
        book = await self._book(user_id, book_id)
        soft_delete(book)
        await self.books.session.flush()

    # Highlights
    async def list_highlights(self, user_id: str, book_id: str) -> list[HighlightOut]:
        await self._book(user_id, book_id)
        rows = await self.highlights.list_for_book(user_id, book_id)
        return [HighlightOut.model_validate(r) for r in rows]

    async def create_highlight(self, user_id: str, book_id: str, data: HighlightCreate) -> HighlightOut:
        await self._book(user_id, book_id)
        row = BookHighlight(
            id=str(uuid.uuid4()),
            user_id=user_id,
            book_id=book_id,
            text=data.text.strip(),
            location_ref=data.location_ref,
            note=data.note,
            color=data.color,
        )
        await self.highlights.add(row)
        return HighlightOut.model_validate(row)

    async def update_highlight(self, user_id: str, item_id: str, data: HighlightUpdate) -> HighlightOut:
        row = await self._owned_highlight(user_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        await self.highlights.session.flush()
        return HighlightOut.model_validate(row)

    async def delete_highlight(self, user_id: str, item_id: str) -> None:
        row = await self._owned_highlight(user_id, item_id)
        soft_delete(row)
        await self.highlights.session.flush()

    # Quotes
    async def list_quotes(self, user_id: str, book_id: str) -> list[QuoteOut]:
        await self._book(user_id, book_id)
        rows = await self.quotes.list_for_book(user_id, book_id)
        return [QuoteOut.model_validate(r) for r in rows]

    async def create_quote(self, user_id: str, book_id: str, data: QuoteCreate) -> QuoteOut:
        await self._book(user_id, book_id)
        row = BookQuote(
            id=str(uuid.uuid4()),
            user_id=user_id,
            book_id=book_id,
            text=data.text.strip(),
            location_ref=data.location_ref,
            is_favorite=data.is_favorite,
        )
        await self.quotes.add(row)
        return QuoteOut.model_validate(row)

    async def update_quote(self, user_id: str, item_id: str, data: QuoteUpdate) -> QuoteOut:
        row = await self._owned_quote(user_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        await self.quotes.session.flush()
        return QuoteOut.model_validate(row)

    async def delete_quote(self, user_id: str, item_id: str) -> None:
        row = await self._owned_quote(user_id, item_id)
        soft_delete(row)
        await self.quotes.session.flush()

    # Notes / summaries
    async def list_notes(self, user_id: str, book_id: str) -> list[ReadingNoteOut]:
        await self._book(user_id, book_id)
        rows = await self.notes.list_for_book(user_id, book_id)
        return [ReadingNoteOut.model_validate(r) for r in rows]

    async def create_note(self, user_id: str, book_id: str, data: ReadingNoteCreate) -> ReadingNoteOut:
        await self._book(user_id, book_id)
        row = ReadingNote(
            id=str(uuid.uuid4()),
            user_id=user_id,
            book_id=book_id,
            kind=NoteKind(data.kind.value),
            title=data.title,
            body=data.body.strip(),
            location_ref=data.location_ref,
        )
        await self.notes.add(row)
        if data.kind == NoteKind.SUMMARY:
            book = await self._book(user_id, book_id)
            if not book.summary:
                book.summary = data.body.strip()
                await self.books.session.flush()
        return ReadingNoteOut.model_validate(row)

    async def update_note(self, user_id: str, item_id: str, data: ReadingNoteUpdate) -> ReadingNoteOut:
        row = await self._owned_note(user_id, item_id)
        payload = data.model_dump(exclude_unset=True)
        if "kind" in payload and payload["kind"] is not None:
            payload["kind"] = NoteKind(payload["kind"].value if hasattr(payload["kind"], "value") else payload["kind"])
        for field, value in payload.items():
            setattr(row, field, value)
        await self.notes.session.flush()
        return ReadingNoteOut.model_validate(row)

    async def delete_note(self, user_id: str, item_id: str) -> None:
        row = await self._owned_note(user_id, item_id)
        soft_delete(row)
        await self.notes.session.flush()

    # Vocabulary
    async def list_vocab(self, user_id: str, book_id: str | None = None) -> list[VocabOut]:
        rows = await self.vocab.list_for_user(user_id, book_id)
        return [VocabOut.model_validate(r) for r in rows]

    async def create_vocab(self, user_id: str, data: VocabCreate) -> VocabOut:
        if data.book_id:
            await self._book(user_id, data.book_id)
        row = VocabItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            book_id=data.book_id,
            word=data.word.strip(),
            meaning=data.meaning.strip(),
            example=data.example,
            mastery=data.mastery,
        )
        await self.vocab.add(row)
        return VocabOut.model_validate(row)

    async def update_vocab(self, user_id: str, item_id: str, data: VocabUpdate) -> VocabOut:
        row = await self._owned_vocab(user_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        await self.vocab.session.flush()
        return VocabOut.model_validate(row)

    async def delete_vocab(self, user_id: str, item_id: str) -> None:
        row = await self._owned_vocab(user_id, item_id)
        soft_delete(row)
        await self.vocab.session.flush()

    # Dashboard / stats
    async def dashboard(self, user_id: str) -> BooksDashboard:
        books = await self.books.list_for_user(user_id, limit=500)
        reading = [b for b in books if b.status == BookStatus.READING]
        finished = [b for b in books if b.status == BookStatus.FINISHED]
        wanted = [b for b in books if b.status == BookStatus.WANTED]
        abandoned = [b for b in books if b.status == BookStatus.ABANDONED]
        ratings = [b.rating for b in books if b.rating]
        recent_h = await self.highlights.recent(user_id, 5)
        fav_q = await self.quotes.favorites(user_id, 5)

        hl = sum(len([x for x in (b.highlights or []) if not x.deleted_at]) for b in books)
        qt = sum(len([x for x in (b.quotes or []) if not x.deleted_at]) for b in books)
        nt = sum(len([x for x in (b.notes or []) if not x.deleted_at]) for b in books)
        vb = sum(len([x for x in (b.vocabulary or []) if not x.deleted_at]) for b in books)

        return BooksDashboard(
            total_books=len(books),
            reading=len(reading),
            finished=len(finished),
            wanted=len(wanted),
            abandoned=len(abandoned),
            pages_read_total=sum(b.pages_read for b in books),
            highlights_total=hl,
            quotes_total=qt,
            notes_total=nt,
            vocab_total=vb,
            avg_rating=(sum(ratings) / len(ratings)) if ratings else None,
            currently_reading=[self.to_book_out(b) for b in reading[:5]],
            recent_highlights=[HighlightOut.model_validate(h) for h in recent_h],
            favorite_quotes=[QuoteOut.model_validate(q) for q in fav_q],
        )

    async def stats(self, user_id: str) -> BooksStats:
        books = await self.books.list_for_user(user_id, limit=500)
        year = date.today().year
        month = date.today().month
        finished_year = [
            b for b in books if b.status == BookStatus.FINISHED and b.finished_on and b.finished_on.year == year
        ]
        finished_month = [b for b in finished_year if b.finished_on and b.finished_on.month == month]
        reading = [b for b in books if b.status == BookStatus.READING]
        avg_progress = (sum(b.progress_pct for b in reading) / len(reading)) if reading else 0.0

        author_map: dict[str, int] = {}
        for b in books:
            if b.author:
                author_map[b.author] = author_map.get(b.author, 0) + 1
        top_authors = [
            {"author": a, "count": c}
            for a, c in sorted(author_map.items(), key=lambda i: -i[1])[:5]
        ]

        return BooksStats(
            finished_this_year=len(finished_year),
            finished_this_month=len(finished_month),
            pages_read_this_year=sum(b.pages_read for b in books if b.started_on and b.started_on.year == year),
            avg_progress_reading=round(avg_progress, 1),
            top_authors=top_authors,
        )

    async def _book(self, user_id: str, book_id: str) -> Book:
        book = await self.books.get_owned(user_id, book_id)
        if not book:
            raise NotFoundError("Book not found")
        return book

    async def _owned_highlight(self, user_id: str, item_id: str) -> BookHighlight:
        row = await self.highlights.get_by_id(item_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Highlight not found")
        return row

    async def _owned_quote(self, user_id: str, item_id: str) -> BookQuote:
        row = await self.quotes.get_by_id(item_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Quote not found")
        return row

    async def _owned_note(self, user_id: str, item_id: str) -> ReadingNote:
        row = await self.notes.get_by_id(item_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Note not found")
        return row

    async def _owned_vocab(self, user_id: str, item_id: str) -> VocabItem:
        row = await self.vocab.get_by_id(item_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Vocabulary item not found")
        return row
