"""Promote Knowledge notes into Books + Trading domain modules."""

from __future__ import annotations

import re
import uuid
from datetime import date, timedelta

from app.modules.books.models import Book, BookStatus, NoteKind as BookNoteKind, ReadingNote
from app.modules.books.repository import BookRepository, ReadingNoteRepository
from app.modules.knowledge.models import KnowledgeNote, KnowledgePromotion, NoteArea, NoteKind
from app.modules.knowledge.repository import KnowledgeNoteRepository, PromotionRepository
from app.modules.knowledge.schemas import PromoteItem, PromoteReport, PromoteRequest
from app.modules.trading.models import PeriodReview, PsychologyEntry, ReviewPeriod
from app.modules.trading.repository import PeriodReviewRepository, PsychologyRepository

BOOKS_SKIP_TITLES = {"books", "reading list", "book list"}


class PromoteService:
    def __init__(
        self,
        *,
        notes: KnowledgeNoteRepository,
        promotions: PromotionRepository,
        books: BookRepository,
        reading_notes: ReadingNoteRepository,
        psychology: PsychologyRepository,
        reviews: PeriodReviewRepository,
    ) -> None:
        self.notes = notes
        self.promotions = promotions
        self.books = books
        self.reading_notes = reading_notes
        self.psychology = psychology
        self.reviews = reviews

    async def promote(self, user_id: str, data: PromoteRequest) -> PromoteReport:
        modules = {m.strip().lower() for m in data.modules if m.strip()}
        all_notes = await self.notes.list_for_user(user_id, limit=500)
        if data.note_ids:
            wanted = set(data.note_ids)
            all_notes = [n for n in all_notes if n.id in wanted]

        items: list[PromoteItem] = []
        created = updated = skipped = unsupported = 0

        for note in all_notes:
            plan = _plan_for_note(note, modules)
            if plan is None:
                continue

            target_module, entity_type, detail_hint = plan
            existing_promo = await self.promotions.get_for_note(user_id, note.id, target_module)

            if target_module == "books":
                result = await self._promote_book(user_id, note, data.dry_run, existing_promo)
            elif target_module == "trading":
                if entity_type == "period_review":
                    result = await self._promote_review(user_id, note, data.dry_run, existing_promo)
                else:
                    result = await self._promote_psychology(
                        user_id, note, data.dry_run, existing_promo, mood=_trading_mood(note)
                    )
            else:
                result = PromoteItem(
                    note_id=note.id,
                    title=note.title,
                    vault_path=note.vault_path,
                    area=note.area,  # type: ignore[arg-type]
                    kind=note.kind,  # type: ignore[arg-type]
                    target_module=target_module,
                    target_entity_type=entity_type,
                    action="unsupported",
                    detail=detail_hint,
                )

            items.append(result)
            if result.action == "create":
                created += 1
            elif result.action == "update":
                updated += 1
            elif result.action == "skip":
                skipped += 1
            else:
                unsupported += 1

        if not data.dry_run:
            await self.notes.session.flush()

        return PromoteReport(
            dry_run=data.dry_run,
            modules=sorted(modules),
            eligible=len(items),
            created=created,
            updated=updated,
            skipped=skipped,
            unsupported=unsupported,
            items=sorted(items, key=lambda i: (i.target_module, i.title.lower())),
        )

    async def _promote_book(
        self,
        user_id: str,
        note: KnowledgeNote,
        dry_run: bool,
        existing_promo: KnowledgePromotion | None,
    ) -> PromoteItem:
        title = note.title.strip()
        body = (note.body or "").strip()
        summary = body[:8000] if body else None

        book = None
        if existing_promo:
            book = await self.books.get_owned(user_id, existing_promo.target_entity_id)
        if book is None:
            book = await self.books.get_by_title(user_id, title)

        if book and existing_promo and book.summary == summary:
            return _item(note, "books", "book", book.id, "skip", "Already promoted — unchanged")

        if dry_run:
            action = "update" if book else "create"
            return _item(
                note,
                "books",
                "book",
                book.id if book else None,
                action,
                f"Would {action} Books entry" + (" + summary note" if body else ""),
            )

        if book is None:
            book = Book(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=title,
                status=BookStatus.READING if body else BookStatus.WANTED,
                summary=summary,
                tags_csv="obsidian,imported",
            )
            await self.books.add(book)
            action = "create"
            detail = "Created book in Books module"
        else:
            book.summary = summary or book.summary
            if body and book.status == BookStatus.WANTED:
                book.status = BookStatus.READING
            tags = {t for t in (book.tags_csv or "").split(",") if t}
            tags.update({"obsidian", "imported"})
            book.tags_csv = ",".join(sorted(tags))
            action = "update"
            detail = "Updated existing book from Knowledge"

        if body:
            # Keep one Obsidian summary note — replace by matching title prefix
            notes = await self.reading_notes.list_for_book(user_id, book.id)
            obsidian_note = next(
                (n for n in notes if not n.deleted_at and (n.title or "").startswith("Obsidian")),
                None,
            )
            if obsidian_note:
                obsidian_note.body = body
                obsidian_note.kind = BookNoteKind.SUMMARY
            else:
                await self.reading_notes.add(
                    ReadingNote(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        book_id=book.id,
                        kind=BookNoteKind.SUMMARY,
                        title="Obsidian import",
                        body=body,
                    )
                )
            detail += " · reading note synced"

        await self._upsert_promo(user_id, note.id, "books", "book", book.id, action)
        return _item(note, "books", "book", book.id, action, detail)

    async def _promote_psychology(
        self,
        user_id: str,
        note: KnowledgeNote,
        dry_run: bool,
        existing_promo: KnowledgePromotion | None,
        *,
        mood: str,
    ) -> PromoteItem:
        entry_date = note.journal_date or date.today()
        body = (note.body or "").strip() or note.title

        row = None
        if existing_promo:
            from sqlalchemy import select

            from app.modules.trading.models import PsychologyEntry as PE

            row = await self.psychology.session.scalar(
                select(PE).where(
                    PE.id == existing_promo.target_entity_id,
                    PE.user_id == user_id,
                    PE.deleted_at.is_(None),
                )
            )
        if row is None:
            row = await self.psychology.get_by_date_mood(user_id, entry_date, mood)

        if row and row.notes == body:
            return _item(note, "trading", "psychology", row.id, "skip", "Already in Trading mind log")

        if dry_run:
            action = "update" if row else "create"
            return _item(
                note,
                "trading",
                "psychology",
                row.id if row else None,
                action,
                f"Would {action} Trading psychology entry ({entry_date}, mood={mood})",
            )

        if row is None:
            row = PsychologyEntry(
                id=str(uuid.uuid4()),
                user_id=user_id,
                entry_date=entry_date,
                mood=mood,
                confidence=3,
                stress=3,
                discipline=3,
                notes=body,
            )
            await self.psychology.add(row)
            action = "create"
            detail = f"Created Trading psychology entry for {entry_date}"
        else:
            row.notes = body
            row.mood = mood
            action = "update"
            detail = f"Updated Trading psychology entry for {entry_date}"

        await self._upsert_promo(user_id, note.id, "trading", "psychology", row.id, action)
        return _item(note, "trading", "psychology", row.id, action, detail)

    async def _promote_review(
        self,
        user_id: str,
        note: KnowledgeNote,
        dry_run: bool,
        existing_promo: KnowledgePromotion | None,
    ) -> PromoteItem:
        start = note.journal_date or date.today()
        # Weekly review: week containing journal_date
        period_start = start - timedelta(days=start.weekday())
        period_end = period_start + timedelta(days=6)
        body = (note.body or "").strip() or note.title

        existing = await self.reviews.get_unique(
            user_id, ReviewPeriod.WEEKLY.value, period_start
        )
        if existing_promo and existing is None:
            from sqlalchemy import select

            existing = await self.reviews.session.scalar(
                select(PeriodReview).where(
                    PeriodReview.id == existing_promo.target_entity_id,
                    PeriodReview.user_id == user_id,
                    PeriodReview.deleted_at.is_(None),
                )
            )

        if existing and existing.what_went_well == body:
            return _item(note, "trading", "period_review", existing.id, "skip", "Weekly review already promoted")

        if dry_run:
            action = "update" if existing else "create"
            return _item(
                note,
                "trading",
                "period_review",
                existing.id if existing else None,
                action,
                f"Would {action} Trading weekly review ({period_start})",
            )

        if existing is None:
            existing = PeriodReview(
                id=str(uuid.uuid4()),
                user_id=user_id,
                period_type=ReviewPeriod.WEEKLY,
                period_start=period_start,
                period_end=period_end,
                title=note.title[:255],
                what_went_well=body,
            )
            await self.reviews.add(existing)
            action = "create"
            detail = f"Created Trading weekly review starting {period_start}"
        else:
            existing.title = note.title[:255]
            existing.what_went_well = body
            existing.period_end = period_end
            action = "update"
            detail = f"Updated Trading weekly review starting {period_start}"

        await self._upsert_promo(user_id, note.id, "trading", "period_review", existing.id, action)
        return _item(note, "trading", "period_review", existing.id, action, detail)

    async def _upsert_promo(
        self,
        user_id: str,
        note_id: str,
        module: str,
        entity_type: str,
        entity_id: str,
        action: str,
    ) -> None:
        row = await self.promotions.get_for_note(user_id, note_id, module)
        if row:
            row.target_entity_type = entity_type
            row.target_entity_id = entity_id
            row.action = action
            return
        await self.promotions.add(
            KnowledgePromotion(
                id=str(uuid.uuid4()),
                user_id=user_id,
                note_id=note_id,
                target_module=module,
                target_entity_type=entity_type,
                target_entity_id=entity_id,
                action=action,
            )
        )


def _normalize_title(title: str) -> str:
    cleaned = re.sub(r"[^\w\s\-]", "", title, flags=re.UNICODE)
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def _plan_for_note(note: KnowledgeNote, modules: set[str]) -> tuple[str, str, str] | None:
    area = note.area.value if hasattr(note.area, "value") else str(note.area)
    kind = note.kind.value if hasattr(note.kind, "value") else str(note.kind)
    title_l = _normalize_title(note.title)

    if "books" in modules and area == NoteArea.BOOKS.value:
        if title_l in BOOKS_SKIP_TITLES:
            return None
        if kind == NoteKind.BOOK.value or kind == NoteKind.NOTE.value:
            return ("books", "book", "Books library")
        return None

    if "trading" in modules:
        if kind == NoteKind.TRADING_JOURNAL.value:
            return ("trading", "psychology", "Trading mind / day journal")
        if kind == NoteKind.RULES.value or (
            area == NoteArea.TRADING.value and "rule" in title_l
        ):
            return ("trading", "psychology", "Trading playbook / rules")
        if kind == NoteKind.WEEKLY_REVIEW.value and area in {
            NoteArea.JOURNAL.value,
            NoteArea.TRADING.value,
        }:
            return ("trading", "period_review", "Trading weekly review")
        # Execution Rules etc. in trading folder with kind note
        if area == NoteArea.TRADING.value and kind == NoteKind.NOTE.value:
            return ("trading", "psychology", "Trading note")
    return None


def _trading_mood(note: KnowledgeNote) -> str:
    kind = note.kind.value if hasattr(note.kind, "value") else str(note.kind)
    if kind == NoteKind.TRADING_JOURNAL.value:
        return "obsidian_journal"
    if kind == NoteKind.RULES.value:
        return "obsidian_rules"
    return "obsidian_note"


def _item(
    note: KnowledgeNote,
    module: str,
    entity_type: str,
    entity_id: str | None,
    action: str,
    detail: str,
) -> PromoteItem:
    return PromoteItem(
        note_id=note.id,
        title=note.title,
        vault_path=note.vault_path,
        area=note.area,  # type: ignore[arg-type]
        kind=note.kind,  # type: ignore[arg-type]
        target_module=module,
        target_entity_type=entity_type,
        target_entity_id=entity_id,
        action=action,
        detail=detail,
    )
