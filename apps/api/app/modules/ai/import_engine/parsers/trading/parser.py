"""Trading Journal parser — wraps existing production logic (behavior unchanged)."""

from __future__ import annotations

from typing import Any

from app.modules.ai.import_engine.parsers.trading.review_schema import TRADING_REVIEW_FIELDS
from app.modules.ai.import_engine.types import (
    DestinationModule,
    ParserExtractResult,
    ParserType,
    ReviewField,
)
from app.modules.ai.imports.commit import commit_draft_to_journal
from app.modules.ai.imports.pipeline.confidence import apply_field_confidence, score_confidence
from app.modules.ai.imports.pipeline.parse import run_parse
from app.modules.ai.imports.pipeline.structure import finalize_structure
from app.modules.ai.imports.pipeline.types import (
    OcrPageResult,
    PipelineOptions,
    UnderstandingResult,
    ValidationResult,
)
from app.modules.ai.imports.pipeline.validate import validate_draft
from app.modules.ai.imports.schemas import ConfidenceMap, JournalDraft


class TradingParser:
    """Production Trading Journal parser.

    Delegates to the existing parse / validate / confidence / structure / commit
    modules so Trading UX and wire format stay identical.
    """

    parser_type = ParserType.TRADING
    name = "trading_journal_v1"
    destination_module = DestinationModule.TRADING
    architecture_only = False

    def extract(
        self,
        understanding: UnderstandingResult,
        *,
        options: PipelineOptions,
        page_ids: list[str],
    ) -> ParserExtractResult:
        from datetime import date

        fallback = options.journal_date or date.today()
        stage = run_parse(
            understanding,
            fallback_date=fallback,
            title_hint=options.title or options.notebook_label,
            page_ids=page_ids,
        )
        status = stage.parsed.parse_status
        status_val = status.value if hasattr(status, "value") else str(status)
        return ParserExtractResult(
            draft=stage.draft_partial,
            warnings=list(stage.warnings),
            parse_status=status_val,
            meta={"parsed": stage.parsed},
            trade_count=len(stage.parsed.trades),
            section_count=len(stage.parsed.sections),
        )

    def validate(self, draft: JournalDraft, *, page_ids: list[str]) -> ValidationResult:
        return validate_draft(draft, page_ids=page_ids)

    def confidence(
        self,
        draft: JournalDraft,
        *,
        ocr_pages: list[OcrPageResult],
        validation: ValidationResult,
        meta: dict[str, Any],
    ) -> ConfidenceMap:
        return score_confidence(
            draft=draft,
            parsed=meta["parsed"],
            ocr_pages=ocr_pages,
            validation=validation,
        )

    def transform(
        self,
        draft: JournalDraft,
        *,
        page_ids: list[str],
        validation: ValidationResult,
        confidence: ConfidenceMap,
    ) -> JournalDraft:
        stamped = apply_field_confidence(draft, confidence)
        return finalize_structure(stamped, page_ids=page_ids, validation=validation)

    def review_fields(self) -> list[ReviewField]:
        return list(TRADING_REVIEW_FIELDS)

    async def save(self, *args: Any, **kwargs: Any) -> Any:
        return await commit_draft_to_journal(*args, **kwargs)
