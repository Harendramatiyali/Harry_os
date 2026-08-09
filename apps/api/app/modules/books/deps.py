"""Books FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.deps import DbSessionDep
from app.modules.books.repository import (
    BookRepository,
    HighlightRepository,
    QuoteRepository,
    ReadingNoteRepository,
    VocabRepository,
)
from app.modules.books.service import BooksService


def get_books_service(session: DbSessionDep) -> BooksService:
    return BooksService(
        books=BookRepository(session),
        highlights=HighlightRepository(session),
        quotes=QuoteRepository(session),
        notes=ReadingNoteRepository(session),
        vocab=VocabRepository(session),
    )


BooksServiceDep = Annotated[BooksService, Depends(get_books_service)]
