"""Books HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.modules.auth.deps import CurrentUserDep
from app.modules.books.deps import BooksServiceDep
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

router = APIRouter(prefix="/books", tags=["books"])


@router.get("/dashboard", response_model=BooksDashboard)
async def dashboard(user: CurrentUserDep, service: BooksServiceDep) -> BooksDashboard:
    return await service.dashboard(user.id)


@router.get("/stats", response_model=BooksStats)
async def stats(user: CurrentUserDep, service: BooksServiceDep) -> BooksStats:
    return await service.stats(user.id)


@router.get("", response_model=list[BookOut])
async def list_books(
    user: CurrentUserDep,
    service: BooksServiceDep,
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = None,
) -> list[BookOut]:
    return await service.list_books(user.id, status=status_filter, q=q)


@router.post("", response_model=BookOut, status_code=status.HTTP_201_CREATED)
async def create_book(body: BookCreate, user: CurrentUserDep, service: BooksServiceDep) -> BookOut:
    return await service.create_book(user.id, body)


@router.get("/vocab", response_model=list[VocabOut])
async def list_vocab(
    user: CurrentUserDep,
    service: BooksServiceDep,
    book_id: str | None = None,
) -> list[VocabOut]:
    return await service.list_vocab(user.id, book_id)


@router.post("/vocab", response_model=VocabOut, status_code=status.HTTP_201_CREATED)
async def create_vocab(body: VocabCreate, user: CurrentUserDep, service: BooksServiceDep) -> VocabOut:
    return await service.create_vocab(user.id, body)


@router.patch("/vocab/{item_id}", response_model=VocabOut)
async def update_vocab(
    item_id: str, body: VocabUpdate, user: CurrentUserDep, service: BooksServiceDep
) -> VocabOut:
    return await service.update_vocab(user.id, item_id, body)


@router.delete("/vocab/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vocab(item_id: str, user: CurrentUserDep, service: BooksServiceDep) -> None:
    await service.delete_vocab(user.id, item_id)


@router.get("/{book_id}", response_model=BookOut)
async def get_book(book_id: str, user: CurrentUserDep, service: BooksServiceDep) -> BookOut:
    return await service.get_book(user.id, book_id)


@router.patch("/{book_id}", response_model=BookOut)
async def update_book(
    book_id: str, body: BookUpdate, user: CurrentUserDep, service: BooksServiceDep
) -> BookOut:
    return await service.update_book(user.id, book_id, body)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: str, user: CurrentUserDep, service: BooksServiceDep) -> None:
    await service.delete_book(user.id, book_id)


@router.get("/{book_id}/highlights", response_model=list[HighlightOut])
async def list_highlights(
    book_id: str, user: CurrentUserDep, service: BooksServiceDep
) -> list[HighlightOut]:
    return await service.list_highlights(user.id, book_id)


@router.post(
    "/{book_id}/highlights",
    response_model=HighlightOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_highlight(
    book_id: str, body: HighlightCreate, user: CurrentUserDep, service: BooksServiceDep
) -> HighlightOut:
    return await service.create_highlight(user.id, book_id, body)


@router.patch("/highlights/{item_id}", response_model=HighlightOut)
async def update_highlight(
    item_id: str, body: HighlightUpdate, user: CurrentUserDep, service: BooksServiceDep
) -> HighlightOut:
    return await service.update_highlight(user.id, item_id, body)


@router.delete("/highlights/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_highlight(item_id: str, user: CurrentUserDep, service: BooksServiceDep) -> None:
    await service.delete_highlight(user.id, item_id)


@router.get("/{book_id}/quotes", response_model=list[QuoteOut])
async def list_quotes(book_id: str, user: CurrentUserDep, service: BooksServiceDep) -> list[QuoteOut]:
    return await service.list_quotes(user.id, book_id)


@router.post("/{book_id}/quotes", response_model=QuoteOut, status_code=status.HTTP_201_CREATED)
async def create_quote(
    book_id: str, body: QuoteCreate, user: CurrentUserDep, service: BooksServiceDep
) -> QuoteOut:
    return await service.create_quote(user.id, book_id, body)


@router.patch("/quotes/{item_id}", response_model=QuoteOut)
async def update_quote(
    item_id: str, body: QuoteUpdate, user: CurrentUserDep, service: BooksServiceDep
) -> QuoteOut:
    return await service.update_quote(user.id, item_id, body)


@router.delete("/quotes/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(item_id: str, user: CurrentUserDep, service: BooksServiceDep) -> None:
    await service.delete_quote(user.id, item_id)


@router.get("/{book_id}/notes", response_model=list[ReadingNoteOut])
async def list_notes(
    book_id: str, user: CurrentUserDep, service: BooksServiceDep
) -> list[ReadingNoteOut]:
    return await service.list_notes(user.id, book_id)


@router.post("/{book_id}/notes", response_model=ReadingNoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    book_id: str, body: ReadingNoteCreate, user: CurrentUserDep, service: BooksServiceDep
) -> ReadingNoteOut:
    return await service.create_note(user.id, book_id, body)


@router.patch("/notes/{item_id}", response_model=ReadingNoteOut)
async def update_note(
    item_id: str, body: ReadingNoteUpdate, user: CurrentUserDep, service: BooksServiceDep
) -> ReadingNoteOut:
    return await service.update_note(user.id, item_id, body)


@router.delete("/notes/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(item_id: str, user: CurrentUserDep, service: BooksServiceDep) -> None:
    await service.delete_note(user.id, item_id)
