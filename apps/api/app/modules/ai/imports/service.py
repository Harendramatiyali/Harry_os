"""AI Import Center service — sessions, uploads, preview, commit."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import date
from pathlib import Path

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError, NotFoundError
from app.modules.ai.import_models import (
    AiImportDraftSource,
    AiImportDraftVersion,
    AiImportEvent,
    AiImportEventLevel,
    AiImportJob,
    AiImportJobStatus,
    AiImportPage,
    AiImportPageStatus,
    AiImportReviewStatus,
)
from app.modules.ai.imports.commit import commit_draft_to_journal
from app.modules.ai.imports.pipeline import (
    PipelineImage,
    PipelineOptions,
    run_pipeline,
)
from app.modules.ai.imports.repository import (
    AiImportDraftVersionRepository,
    AiImportEventRepository,
    AiImportJobRepository,
    AiImportPageRepository,
    soft_delete,
)
from app.modules.ai.imports.schemas import (
    ClassificationOut,
    ConfidenceMap,
    ConfirmDestinationOut,
    ConfirmDestinationRequest,
    ImportCommitOut,
    ImportCommitRequest,
    ImportJobCreate,
    ImportJobOut,
    ImportJobStatusOut,
    ImportPageOut,
    ImportPreviewOut,
    ImportPreviewRequest,
    JournalDraft,
    ReviewFieldOut,
)
from app.modules.trading.journal_repository import TradingJournalDayRepository

_DATE_IN_NAME = re.compile(
    r"(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})",
)
_MAX_PAGES = 40


class AiImportService:
    def __init__(
        self,
        *,
        settings: Settings,
        jobs: AiImportJobRepository,
        pages: AiImportPageRepository,
        drafts: AiImportDraftVersionRepository,
        events: AiImportEventRepository,
        journals: TradingJournalDayRepository,
    ) -> None:
        self.settings = settings
        self.jobs = jobs
        self.pages = pages
        self.drafts = drafts
        self.events = events
        self.journals = journals

    # —— mapping ——

    def _page_out(self, page: AiImportPage) -> ImportPageOut:
        status = page.status.value if hasattr(page.status, "value") else str(page.status)
        return ImportPageOut(
            id=page.id,
            job_id=page.job_id,
            page_index=page.page_index,
            original_file_name=page.original_file_name,
            mime_type=page.mime_type,
            byte_size=page.byte_size,
            checksum=page.checksum,
            status=status,
            quality_score=page.quality_score,
            ocr_confidence=page.ocr_confidence,
            has_ocr_transcript=bool(page.ocr_transcript),
            created_at=page.created_at,
            updated_at=page.updated_at,
        )

    def _job_out(self, job: AiImportJob) -> ImportJobOut:
        return ImportJobOut(
            id=job.id,
            title=job.title,
            notebook_label=job.notebook_label,
            status=job.status.value if hasattr(job.status, "value") else str(job.status),
            review_status=(
                job.review_status.value
                if hasattr(job.review_status, "value")
                else str(job.review_status)
            ),
            current_stage=job.current_stage,
            page_count=job.page_count,
            overall_confidence=job.overall_confidence,
            draft_version=job.draft_version,
            detected_journal_date=job.detected_journal_date,
            committed_journal_day_id=job.committed_journal_day_id,
            parser_type=getattr(job, "parser_type", None) or "trading",
            classification_confidence=getattr(job, "classification_confidence", None),
            destination_module=getattr(job, "destination_module", None) or "trading",
            destination_confirmed=bool(getattr(job, "destination_confirmed", False)),
            review_schema_version=getattr(job, "review_schema_version", None),
            model_id=job.model_id,
            prompt_version=job.prompt_version,
            error_code=job.error_code,
            error_message=job.error_message,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

    def _confidence_from_job(self, job: AiImportJob) -> ConfidenceMap | None:
        if not job.confidence_json and job.overall_confidence is None:
            return None
        if job.confidence_json:
            try:
                return ConfidenceMap.model_validate_json(job.confidence_json)
            except Exception:
                pass
        return ConfidenceMap(overall=job.overall_confidence)

    async def _require_job(self, user_id: str, job_id: str) -> AiImportJob:
        job = await self.jobs.get_owned(user_id, job_id, with_pages=True)
        if job is None:
            raise NotFoundError("Import session not found")
        return job

    async def _add_event(
        self,
        *,
        user_id: str,
        job_id: str,
        message: str,
        stage: str | None = None,
        level: AiImportEventLevel = AiImportEventLevel.INFO,
        payload: dict | None = None,
    ) -> None:
        await self.events.add(
            AiImportEvent(
                id=str(uuid.uuid4()),
                user_id=user_id,
                job_id=job_id,
                stage=stage,
                level=level,
                message=message,
                payload_json=json.dumps(payload) if payload else None,
            )
        )

    def _media_dir(self, user_id: str, job_id: str) -> Path:
        path = Path(self.settings.media_root) / "ai_imports" / user_id / job_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _parse_date_hint(self, *texts: str | None) -> date | None:
        for text in texts:
            if not text:
                continue
            m = _DATE_IN_NAME.search(text)
            if not m:
                continue
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                continue
        return None

    # —— APIs ——

    async def create_job(self, user_id: str, data: ImportJobCreate) -> ImportJobOut:
        job = AiImportJob(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title,
            notebook_label=data.notebook_label,
            status=AiImportJobStatus.QUEUED,
            review_status=AiImportReviewStatus.PENDING,
            current_stage="created",
            page_count=0,
            detected_journal_date=data.detected_journal_date,
            parser_type="trading",
            destination_module="trading",
            destination_confirmed=False,
        )
        await self.jobs.add(job)
        await self._add_event(
            user_id=user_id,
            job_id=job.id,
            stage="created",
            message="Import session created",
        )
        return self._job_out(job)

    async def upload_pages(
        self,
        user_id: str,
        job_id: str,
        *,
        files: list[tuple[str, str, bytes]],
    ) -> list[ImportPageOut]:
        """files: list of (file_name, content_type, data)."""
        job = await self._require_job(user_id, job_id)
        if job.status in (AiImportJobStatus.COMMITTED, AiImportJobStatus.COMMITTING):
            raise ConflictError("Cannot upload pages to a committed import session")
        if job.status == AiImportJobStatus.CANCELLED:
            raise ConflictError("Import session is cancelled")

        if not files:
            raise DomainError("At least one image file is required")

        current_count = await self.pages.count_for_job(job_id)
        if current_count + len(files) > _MAX_PAGES:
            raise DomainError(f"Maximum {_MAX_PAGES} pages per import session")

        media = self._media_dir(user_id, job_id)
        created: list[ImportPageOut] = []
        # Clear soft-deleted rows still holding non-negative indexes (legacy / failed deletes)
        await self.pages.free_soft_deleted_indexes(job_id)
        next_index = await self.pages.next_page_index(job_id)

        for file_name, content_type, data in files:
            if len(data) > self.settings.max_upload_bytes:
                raise DomainError(f"File exceeds max upload size: {file_name}")
            if not (content_type or "").startswith("image/"):
                raise DomainError(f"Only image uploads are allowed: {file_name}")

            page_id = str(uuid.uuid4())
            safe_name = Path(file_name).name or f"page_{next_index + 1}.png"
            dest = media / f"{page_id}_{safe_name}"
            dest.write_bytes(data)
            checksum = hashlib.sha256(data).hexdigest()

            page = AiImportPage(
                id=page_id,
                user_id=user_id,
                job_id=job_id,
                page_index=next_index,
                storage_path=str(dest),
                original_file_name=safe_name,
                mime_type=content_type,
                byte_size=len(data),
                checksum=checksum,
                status=AiImportPageStatus.UPLOADED,
            )
            await self.pages.add(page)
            created.append(self._page_out(page))
            next_index += 1

        job.page_count = await self.pages.count_for_job(job_id)
        if job.status == AiImportJobStatus.QUEUED:
            job.status = AiImportJobStatus.QUEUED
        job.current_stage = "uploaded"
        # Invalidate prior draft when pages change
        if job.draft_json:
            job.draft_json = None
            job.overall_confidence = None
            job.confidence_json = None
            if job.status == AiImportJobStatus.AWAITING_REVIEW:
                job.status = AiImportJobStatus.QUEUED
                job.review_status = AiImportReviewStatus.PENDING

        await self._add_event(
            user_id=user_id,
            job_id=job_id,
            stage="uploaded",
            message=f"Uploaded {len(created)} page(s)",
            payload={"page_ids": [p.id for p in created]},
        )
        await self.jobs.session.flush()
        return created

    async def delete_page(self, user_id: str, job_id: str, page_id: str) -> None:
        job = await self._require_job(user_id, job_id)
        if job.status in (AiImportJobStatus.COMMITTED, AiImportJobStatus.COMMITTING):
            raise ConflictError("Cannot delete pages from a committed import session")

        page = await self.pages.get_owned_for_job(user_id, job_id, page_id)
        if page is None:
            raise NotFoundError("Import page not found")

        path = Path(page.storage_path) if page.storage_path else None
        # Free unique (job_id, page_index) slots held by this page + any soft-deleted leftovers
        page.page_index = -(abs(int(uuid.UUID(page.id).int % 1_000_000_000)) + 1)
        soft_delete(page)
        await self.pages.free_soft_deleted_indexes(job_id)
        if path and path.is_file():
            try:
                path.unlink()
            except OSError:
                pass

        # Compact active page indexes into 0..n-1 without colliding with tombstones
        remaining = await self.pages.list_for_job(user_id, job_id)
        # Park active rows on temporary negative indexes first (avoid unique clashes mid-update)
        for i, row in enumerate(remaining):
            row.page_index = -(1_000_000_000 + i + 1)
        await self.jobs.session.flush()
        for i, row in enumerate(remaining):
            row.page_index = i
        await self.jobs.session.flush()

        job.page_count = len(remaining)
        job.current_stage = "uploaded"
        if job.draft_json:
            job.draft_json = None
            job.overall_confidence = None
            job.confidence_json = None
            if job.status == AiImportJobStatus.AWAITING_REVIEW:
                job.status = AiImportJobStatus.QUEUED
                job.review_status = AiImportReviewStatus.PENDING

        await self._add_event(
            user_id=user_id,
            job_id=job_id,
            stage="uploaded",
            message=f"Deleted page {page_id}",
        )
        await self.jobs.session.flush()

    async def list_pages(self, user_id: str, job_id: str) -> list[ImportPageOut]:
        await self._require_job(user_id, job_id)
        rows = await self.pages.list_for_job(user_id, job_id)
        return [self._page_out(p) for p in rows]

    async def get_page_file(self, user_id: str, page_id: str) -> AiImportPage:
        page = await self.pages.get_owned(user_id, page_id)
        if page is None:
            raise NotFoundError("Import page not found")
        return page

    async def get_status(self, user_id: str, job_id: str) -> ImportJobStatusOut:
        job = await self._require_job(user_id, job_id)
        pages = await self.pages.list_for_job(user_id, job_id)
        base = self._job_out(job)
        draft = None
        if job.draft_json:
            draft = JournalDraft.model_validate_json(job.draft_json)
        return ImportJobStatusOut(
            **base.model_dump(),
            has_draft=bool(job.draft_json),
            confidence=self._confidence_from_job(job),
            pages=[self._page_out(p) for p in pages],
            draft=draft,
        )

    async def generate_preview(
        self,
        user_id: str,
        job_id: str,
        data: ImportPreviewRequest | None = None,
    ) -> ImportPreviewOut:
        job = await self._require_job(user_id, job_id)
        if job.status == AiImportJobStatus.COMMITTED:
            raise ConflictError("Import session already committed")
        if job.status == AiImportJobStatus.CANCELLED:
            raise ConflictError("Import session is cancelled")

        pages = await self.pages.list_for_job(user_id, job_id)
        if not pages:
            raise DomainError("Upload at least one notebook image before generating a preview")

        data = data or ImportPreviewRequest()
        journal_date = (
            data.journal_date
            or job.detected_journal_date
            or self._parse_date_hint(
                job.title,
                job.notebook_label,
                *(p.original_file_name for p in pages),
            )
            or date.today()
        )
        job.detected_journal_date = journal_date

        pipeline_images = [
            PipelineImage(
                page_id=p.id,
                page_index=p.page_index,
                file_name=p.original_file_name,
                mime_type=p.mime_type,
                path=p.storage_path,
                checksum=p.checksum,
            )
            for p in pages
        ]

        # Reflect pipeline stages on the job while processing (persistence only)
        job.status = AiImportJobStatus.PREPROCESSING
        job.current_stage = "preprocessing"
        await self.jobs.session.flush()

        job.status = AiImportJobStatus.OCR
        job.current_stage = "ocr"
        await self.jobs.session.flush()

        result = await run_pipeline(
            pipeline_images,
            options=PipelineOptions(
                journal_date=journal_date,
                title=data.title or job.title,
                notebook_label=job.notebook_label,
                job_id=job.id,
                parser_type=data.parser_type or getattr(job, "parser_type", None) or None,
            ),
        )

        parser_meta = (result.structured_json or {}).get("parser") or {}
        class_meta = (result.structured_json or {}).get("classification") or {}
        job.parser_type = parser_meta.get("type") or job.parser_type or "trading"
        job.destination_module = parser_meta.get("destination") or job.destination_module or "trading"
        if class_meta.get("confidence") is not None:
            job.classification_confidence = class_meta["confidence"]
        job.review_schema_version = "trading_v1" if job.parser_type == "trading" else "v0"
        # AI suggests destination; user must confirm on Understanding screen.
        job.destination_confirmed = False

        # Persist OCR outputs onto pages (existing columns — no schema change)
        ocr_by_id = {p.page_id: p for p in result.ocr_pages}
        pre_stage = next((s for s in result.stages if s.stage.value == "preprocess"), None)
        quality_by_id = {
            p["page_id"]: p.get("quality_score")
            for p in (pre_stage.detail.get("pages", []) if pre_stage else [])
        }
        for page in pages:
            ocr = ocr_by_id.get(page.id)
            if ocr is not None:
                page.ocr_transcript = ocr.transcript or None
                page.ocr_confidence = ocr.confidence
                page.ocr_meta_json = json.dumps(
                    {"engine": ocr.engine, "meta": ocr.meta, "warnings": ocr.warnings}
                )
                page.status = (
                    AiImportPageStatus.OCR_DONE
                    if (ocr.transcript or "").strip()
                    else AiImportPageStatus.PREPROCESSED
                )
            if page.id in quality_by_id and quality_by_id[page.id] is not None:
                page.quality_score = quality_by_id[page.id]

        job.status = AiImportJobStatus.STRUCTURING
        job.current_stage = "structuring"
        await self.jobs.session.flush()

        job.status = AiImportJobStatus.VALIDATION
        job.current_stage = "validation"
        await self.jobs.session.flush()

        draft = result.draft
        confidence = result.confidence
        warnings = result.warnings
        job.detected_journal_date = draft.journal_date

        version = await self.drafts.next_version(job_id)
        draft_json = draft.model_dump_json()
        conf_json = confidence.model_dump_json()

        await self.drafts.add(
            AiImportDraftVersion(
                id=str(uuid.uuid4()),
                user_id=user_id,
                job_id=job_id,
                version=version,
                source=AiImportDraftSource.MODEL,
                draft_json=draft_json,
                confidence_json=conf_json,
                overall_confidence=confidence.overall,
                notes=f"pipeline:{result.model_id}",
            )
        )

        job.draft_json = draft_json
        job.draft_version = version
        job.confidence_json = conf_json
        job.overall_confidence = confidence.overall
        job.model_id = result.model_id
        job.prompt_version = result.prompt_version
        job.status = AiImportJobStatus.AWAITING_REVIEW
        job.review_status = AiImportReviewStatus.PENDING
        job.current_stage = "awaiting_review"
        job.error_code = None
        job.error_message = None

        await self._add_event(
            user_id=user_id,
            job_id=job_id,
            stage="awaiting_review",
            message="Pipeline complete — queued for review",
            payload={
                "draft_version": version,
                "warnings": warnings,
                "stages": [
                    {"stage": s.stage.value, "message": s.message, "ok": s.ok}
                    for s in result.stages
                ],
                "parse_status": result.parse_status,
                "review_status": result.review_item.status,
            },
        )
        await self.jobs.session.flush()
        await self.jobs.session.refresh(job)

        return ImportPreviewOut(
            job=self._job_out(job),
            draft=draft,
            confidence=confidence,
            draft_version=version,
            warnings=warnings,
            parser_type=job.parser_type or "trading",
            classification=(
                ClassificationOut(
                    parser_type=class_meta.get("parser_type", job.parser_type or "trading"),
                    confidence=float(class_meta.get("confidence") or 0),
                    destination=class_meta.get("destination", job.destination_module or "trading"),
                    reasons=list(class_meta.get("reasons") or []),
                )
                if class_meta
                else None
            ),
            review_fields=[
                ReviewFieldOut(**f) if isinstance(f, dict) else f
                for f in (parser_meta.get("review_fields") or [])
            ],
        )

    @staticmethod
    def _parser_for_destination(destination: str, parser_hint: str | None = None) -> str:
        if parser_hint:
            return parser_hint.strip().lower()
        mapping = {
            "trading": "trading",
            "books": "book",
            "finance": "finance",
            "health": "health",
            "planner": "meeting",
            "career": "meeting",
            "knowledge": "research",
            "inbox": "general",
        }
        return mapping.get(destination.strip().lower(), "general")

    async def confirm_destination(
        self,
        user_id: str,
        job_id: str,
        data: ConfirmDestinationRequest,
    ) -> ConfirmDestinationOut:
        """Lock destination after Understanding screen — required before Review/Save."""
        job = await self._require_job(user_id, job_id)
        if job.status == AiImportJobStatus.COMMITTED:
            raise ConflictError("Import session is already committed")
        if not job.draft_json:
            raise DomainError("Generate a preview before confirming destination")

        dest = data.destination_module.strip().lower()
        allowed = {
            "trading",
            "books",
            "finance",
            "health",
            "planner",
            "career",
            "knowledge",
            "inbox",
        }
        if dest not in allowed:
            raise DomainError(f"Invalid destination_module: {dest}")

        # Normalize career → planner (Career module hosts meetings)
        if dest == "career":
            dest = "planner"

        if data.classify_later or dest == "inbox":
            pages = await self.pages.list_for_job(user_id, job_id)
            draft = JournalDraft.model_validate_json(job.draft_json)
            from app.modules.ai.import_engine.inbox.repository import (
                ImportCorrectionRepository,
                KnowledgeInboxRepository,
            )
            from app.modules.ai.import_engine.inbox.service import KnowledgeInboxService

            inbox_svc = KnowledgeInboxService(
                settings=self.settings,
                inbox=KnowledgeInboxRepository(self.jobs.session),
                corrections=ImportCorrectionRepository(self.jobs.session),
                journals=self.journals,
            )
            item = await inbox_svc.create_from_job(
                user_id=user_id,
                job=job,
                draft=draft,
                pages=pages,
                parser_type=job.parser_type or "general",
                suggested_destination=job.destination_module or "inbox",
            )
            job.destination_module = "inbox"
            job.destination_confirmed = True
            job.current_stage = "inbox"
            job.review_status = AiImportReviewStatus.PENDING
            await self._add_event(
                user_id=user_id,
                job_id=job_id,
                stage="inbox",
                message="Classify later — queued in Knowledge Inbox",
                payload={"inbox_item_id": item.id},
            )
            await self.jobs.session.flush()
            await self.jobs.session.refresh(job)
            return ConfirmDestinationOut(
                job=self._job_out(job),
                preview=None,
                inbox_item_id=item.id,
                message="Queued in Knowledge Inbox. Choose a destination when ready.",
            )

        parser_type = self._parser_for_destination(dest, data.parser_type)
        prev_parser = (job.parser_type or "trading").lower()
        job.destination_module = dest
        job.parser_type = parser_type
        job.destination_confirmed = True
        job.current_stage = "destination_confirmed"

        preview: ImportPreviewOut | None = None
        if parser_type != prev_parser:
            # Rebuild draft under the confirmed parser so Review fields match.
            preview = await self.generate_preview(
                user_id,
                job_id,
                ImportPreviewRequest(parser_type=parser_type, title=job.title),
            )
            # generate_preview clears confirmation — re-lock after rebuild.
            job = await self._require_job(user_id, job_id)
            job.destination_module = dest
            job.parser_type = parser_type
            job.destination_confirmed = True
            job.current_stage = "destination_confirmed"
            await self.jobs.session.flush()
            await self.jobs.session.refresh(job)
            preview = ImportPreviewOut(
                job=self._job_out(job),
                draft=preview.draft,
                confidence=preview.confidence,
                draft_version=preview.draft_version,
                warnings=preview.warnings,
                parser_type=parser_type,
                classification=preview.classification,
                review_fields=preview.review_fields,
            )
        else:
            await self.jobs.session.flush()

        await self._add_event(
            user_id=user_id,
            job_id=job_id,
            stage="destination_confirmed",
            message=f"Destination confirmed: {dest}",
            payload={"destination_module": dest, "parser_type": parser_type},
        )
        await self.jobs.session.flush()
        await self.jobs.session.refresh(job)

        return ConfirmDestinationOut(
            job=self._job_out(job),
            preview=preview,
            inbox_item_id=None,
            message=f"Destination set to {dest}. Continue to review.",
        )

    async def save_journal(
        self,
        user_id: str,
        job_id: str,
        data: ImportCommitRequest | None = None,
    ) -> ImportCommitOut:
        job = await self._require_job(user_id, job_id)
        if job.status == AiImportJobStatus.COMMITTED:
            raise ConflictError(
                "Import session already committed",
                details={"journal_day_id": job.committed_journal_day_id},
            )
        if job.status == AiImportJobStatus.CANCELLED:
            raise ConflictError("Import session is cancelled")

        data = data or ImportCommitRequest()
        if data.draft is not None:
            draft = data.draft
        elif job.draft_json:
            draft = JournalDraft.model_validate_json(job.draft_json)
        else:
            raise DomainError("Generate a preview (or provide a draft) before saving the journal")

        if not data.approve:
            raise DomainError("approve=true is required to save the journal")

        pages = await self.pages.list_for_job(user_id, job_id)
        if not pages:
            raise DomainError("No notebook images on this import session")
        pages_by_id = {p.id: p for p in pages}

        # Persist user-edited draft as a new version when provided
        if data.draft is not None:
            version = await self.drafts.next_version(job_id)
            draft_json = draft.model_dump_json()
            await self.drafts.add(
                AiImportDraftVersion(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    job_id=job_id,
                    version=version,
                    source=AiImportDraftSource.USER_EDIT,
                    draft_json=draft_json,
                    confidence_json=job.confidence_json,
                    overall_confidence=job.overall_confidence,
                    notes="user edit before commit",
                )
            )
            job.draft_json = draft_json
            job.draft_version = version
            job.detected_journal_date = draft.journal_date

        job.status = AiImportJobStatus.COMMITTING
        job.current_stage = "committing"
        job.review_status = AiImportReviewStatus.APPROVED
        await self.jobs.session.flush()

        try:
            from app.modules.ai.import_engine.destinations import resolve_committer
            from app.modules.ai.import_engine.inbox.repository import (
                ImportCorrectionRepository,
                KnowledgeInboxRepository,
            )
            from app.modules.ai.import_engine.inbox.service import KnowledgeInboxService
            from app.modules.ai.import_engine.parsers import resolve_parser

            active_parser = resolve_parser(getattr(job, "parser_type", None) or "trading")
            want_inbox = bool(data.save_to_inbox) or (
                (data.destination_module or "").lower() == "inbox"
            )
            dest_override = (data.destination_module or "").lower() or None

            if not want_inbox and not bool(getattr(job, "destination_confirmed", False)):
                raise DomainError(
                    "Confirm a destination on the Understanding screen before saving."
                )

            if want_inbox:
                committer = resolve_committer("inbox", parser_type=active_parser.parser_type)
            else:
                target_dest = (
                    dest_override
                    or getattr(job, "destination_module", None)
                    or active_parser.destination_module
                )
                if isinstance(target_dest, str):
                    target_dest = target_dest.lower()
                else:
                    target_dest = getattr(target_dest, "value", str(target_dest))

                # Architecture-only modules cannot Save yet — never silent-inbox.
                if active_parser.architecture_only and target_dest != "inbox":
                    raise DomainError(
                        f"{target_dest.title()} save is not ready yet. "
                        "Go back and choose Classify Later, or pick Trading."
                    )

                committer = resolve_committer(
                    target_dest,
                    parser_type=active_parser.parser_type,
                )

            if committer.destination.value == "trading":
                day = await committer.commit(
                    user_id=user_id,
                    job=job,
                    draft=draft,
                    pages_by_id=pages_by_id,
                    settings=self.settings,
                    journals=self.journals,
                )
            else:
                inbox_svc = KnowledgeInboxService(
                    settings=self.settings,
                    inbox=KnowledgeInboxRepository(self.jobs.session),
                    corrections=ImportCorrectionRepository(self.jobs.session),
                    journals=self.journals,
                )
                item = await inbox_svc.create_from_job(
                    user_id=user_id,
                    job=job,
                    draft=draft,
                    pages=pages,
                    parser_type=active_parser.parser_type.value,
                    suggested_destination=active_parser.destination_module.value,
                )
                job.destination_module = "inbox"
                job.status = AiImportJobStatus.AWAITING_REVIEW
                job.current_stage = "inbox"
                job.review_status = AiImportReviewStatus.PENDING
                await self._add_event(
                    user_id=user_id,
                    job_id=job_id,
                    stage="inbox",
                    message="Saved to Knowledge Inbox",
                    payload={"inbox_item_id": item.id, "parser_type": item.parser_type},
                )
                await self.jobs.session.flush()
                return ImportCommitOut(
                    job_id=job.id,
                    journal_day_id=None,
                    journal_date=draft.journal_date,
                    status="inbox",
                    review_status=job.review_status.value,
                    trade_count=len(draft.trades),
                    section_count=len(draft.sections),
                    attachment_count=len(pages),
                    destination="inbox",
                    inbox_item_id=item.id,
                    message="Saved to Knowledge Inbox. Choose a destination module next.",
                )
        except DomainError:
            job.status = AiImportJobStatus.AWAITING_REVIEW
            job.current_stage = "awaiting_review"
            job.review_status = AiImportReviewStatus.PENDING
            await self.jobs.session.flush()
            raise
        except Exception:
            job.status = AiImportJobStatus.AWAITING_REVIEW
            job.current_stage = "awaiting_review"
            job.review_status = AiImportReviewStatus.PENDING
            await self.jobs.session.flush()
            raise

        if not hasattr(day, "id"):
            raise DomainError("Committer returned unexpected result")

        job.committed_journal_day_id = day.id
        job.status = AiImportJobStatus.COMMITTED
        job.review_status = AiImportReviewStatus.COMMITTED
        job.current_stage = "committed"
        job.detected_journal_date = draft.journal_date
        job.destination_module = "trading"

        await self._add_event(
            user_id=user_id,
            job_id=job_id,
            stage="committed",
            message="Journal saved from notebook import",
            payload={"journal_day_id": day.id, "journal_date": draft.journal_date.isoformat()},
        )
        await self.jobs.session.flush()

        att_count = len(day.attachments or []) + sum(
            len(t.attachments or []) for t in (day.trades or [])
        )
        return ImportCommitOut(
            job_id=job.id,
            journal_day_id=day.id,
            journal_date=day.journal_date,
            status=job.status.value,
            review_status=job.review_status.value,
            trade_count=len(day.trades or []),
            section_count=len(day.sections or []),
            attachment_count=att_count,
            destination="trading",
            message="Saved to Trading Journal",
        )
