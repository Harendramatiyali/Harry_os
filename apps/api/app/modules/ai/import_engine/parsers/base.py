"""Knowledge parser protocol — every domain implements the same interface."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from app.modules.ai.import_engine.types import (
    DestinationModule,
    ParserExtractResult,
    ParserType,
    ReviewField,
)
from app.modules.ai.imports.pipeline.types import (
    OcrPageResult,
    PipelineOptions,
    UnderstandingResult,
    ValidationResult,
)
from app.modules.ai.imports.schemas import ConfidenceMap


@runtime_checkable
class KnowledgeParser(Protocol):
    """Domain parser contract.

    Methods:
      extract / validate / transform / confidence / review_fields / save
    """

    parser_type: ParserType
    name: str
    destination_module: DestinationModule
    architecture_only: bool  # True = stub, not ready for production save

    def extract(
        self,
        understanding: UnderstandingResult,
        *,
        options: PipelineOptions,
        page_ids: list[str],
    ) -> ParserExtractResult: ...

    def validate(self, draft: Any, *, page_ids: list[str]) -> ValidationResult: ...

    def confidence(
        self,
        draft: Any,
        *,
        ocr_pages: list[OcrPageResult],
        validation: ValidationResult,
        meta: dict[str, Any],
    ) -> ConfidenceMap: ...

    def transform(
        self,
        draft: Any,
        *,
        page_ids: list[str],
        validation: ValidationResult,
        confidence: ConfidenceMap,
    ) -> Any: ...

    def review_fields(self) -> list[ReviewField]: ...

    async def save(self, *args: Any, **kwargs: Any) -> Any: ...
