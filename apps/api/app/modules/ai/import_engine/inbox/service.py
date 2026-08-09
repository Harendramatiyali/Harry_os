"""Knowledge Inbox service — queue unmatched imports and learn from corrections."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError, NotFoundError
from app.modules.ai.import_engine.destinations import TradingJournalCommitter
from app.modules.ai.import_engine.inbox.repository import (
    ImportCorrectionRepository,
    KnowledgeInboxRepository,
)
from app.modules.ai.import_engine.inbox.schemas import (
    AssignDestinationOut,
    AssignDestinationRequest,
    KnowledgeInboxDetailOut,
    KnowledgeInboxItemOut,
)
from app.modules.ai.import_models import (
    AiImportCorrection,
    AiImportJob,
    AiImportJobStatus,
    AiImportPage,
    AiImportReviewStatus,
    AiKnowledgeInboxItem,
    AiKnowledgeInboxStatus,
)
from app.modules.ai.imports.schemas import JournalDraft
from app.modules.trading.journal_repository import TradingJournalDayRepository

_VALID_DESTINATIONS = {
    "trading",
    "books",
    "finance",
    "health",
    "planner",
    "knowledge",
    "inbox",
}


class KnowledgeInboxService:
    def __init__(
        self,
        *,
        settings: Settings,
        inbox: KnowledgeInboxRepository,
        corrections: ImportCorrectionRepository,
        journals: TradingJournalDayRepository,
    ) -> None:
        self.settings = settings
        self.inbox = inbox
        self.corrections = corrections
        self.journals = journals

    def _out(self, item: AiKnowledgeInboxItem) -> KnowledgeInboxItemOut:
        return KnowledgeInboxItemOut.model_validate(item)

    async def create_from_job(
        self,
        *,
        user_id: str,
        job: AiImportJob,
        draft: JournalDraft,
        pages: list[AiImportPage],
        parser_type: str,
        suggested_destination: str | None = None,
    ) -> AiKnowledgeInboxItem:
        ocr_bits = []
        for p in pages[:5]:
            if p.ocr_transcript:
                ocr_bits.append((p.ocr_transcript or "")[:400])
        item = AiKnowledgeInboxItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            job_id=job.id,
            parser_type=parser_type or "general",
            suggested_destination=suggested_destination or "inbox",
            title=(draft.title or job.title or "Untitled import")[:255],
            draft_json=draft.model_dump_json(),
            ocr_summary="\n---\n".join(ocr_bits)[:4000] if ocr_bits else None,
            status=AiKnowledgeInboxStatus.QUEUED.value,
            classification_confidence=getattr(job, "classification_confidence", None),
        )
        await self.inbox.add(item)
        return item

    async def list_items(
        self, user_id: str, *, status: str | None = None
    ) -> list[KnowledgeInboxItemOut]:
        rows = await self.inbox.list_for_user(user_id, status=status)
        return [self._out(r) for r in rows]

    async def get_item(self, user_id: str, item_id: str) -> KnowledgeInboxDetailOut:
        item = await self.inbox.get_owned(user_id, item_id)
        if item is None:
            raise NotFoundError("Inbox item not found")
        return KnowledgeInboxDetailOut.model_validate(item)

    async def assign_destination(
        self,
        user_id: str,
        item_id: str,
        body: AssignDestinationRequest,
        *,
        job: AiImportJob | None = None,
        pages_by_id: dict[str, AiImportPage] | None = None,
    ) -> AssignDestinationOut:
        item = await self.inbox.get_owned(user_id, item_id)
        if item is None:
            raise NotFoundError("Inbox item not found")
        if item.status in (
            AiKnowledgeInboxStatus.ROUTED.value,
            AiKnowledgeInboxStatus.DISMISSED.value,
        ):
            raise ConflictError("Inbox item is already closed")

        dest = body.destination_module.strip().lower()
        if dest not in _VALID_DESTINATIONS:
            raise DomainError(f"Invalid destination_module: {dest}")

        predicted_parser = item.parser_type
        predicted_dest = item.suggested_destination

        await self.corrections.add(
            AiImportCorrection(
                id=str(uuid.uuid4()),
                user_id=user_id,
                job_id=item.job_id,
                inbox_item_id=item.id,
                predicted_parser_type=predicted_parser,
                predicted_destination=predicted_dest,
                chosen_parser_type=body.parser_type or (dest if dest != "inbox" else predicted_parser),
                chosen_destination=dest,
                notes=body.notes,
            )
        )

        journal_day_id: str | None = None
        message = f"Destination set to {dest}. Correction recorded for learning."

        if dest == "trading":
            if not item.draft_json:
                raise DomainError("Inbox item has no draft to route into Trading Journal")
            if job is None or pages_by_id is None:
                raise DomainError("Trading route requires the original import session pages")
            draft = JournalDraft.model_validate_json(item.draft_json)
            day = await TradingJournalCommitter().commit(
                user_id=user_id,
                job=job,
                draft=draft,
                pages_by_id=pages_by_id,
                settings=self.settings,
                journals=self.journals,
            )
            journal_day_id = day.id
            item.status = AiKnowledgeInboxStatus.ROUTED.value
            item.chosen_destination = "trading"
            item.routed_journal_day_id = day.id
            job.parser_type = "trading"
            job.destination_module = "trading"
            job.committed_journal_day_id = day.id
            job.status = AiImportJobStatus.COMMITTED
            job.review_status = AiImportReviewStatus.COMMITTED
            job.current_stage = "committed"
            message = f"Routed to Trading Journal ({draft.journal_date.isoformat()})."
        elif dest == "inbox":
            item.status = AiKnowledgeInboxStatus.QUEUED.value
            item.chosen_destination = None
            message = "Kept in Knowledge Inbox."
        else:
            item.status = AiKnowledgeInboxStatus.ASSIGNED.value
            item.chosen_destination = dest
            message = (
                f"Assigned to {dest}. Module parser is architecture-only for now — "
                "item stays available until that destination ships."
            )

        item.updated_at = datetime.now(timezone.utc)
        await self.inbox.session.flush()
        return AssignDestinationOut(
            inbox_item=self._out(item),
            correction_recorded=True,
            journal_day_id=journal_day_id,
            message=message,
        )
