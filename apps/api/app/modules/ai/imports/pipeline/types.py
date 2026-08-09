"""Shared types for the AI Import processing pipeline."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from app.modules.ai.imports.schemas import ConfidenceMap, JournalDraft


class PipelineStage(str, enum.Enum):
    UPLOAD = "upload"
    PREPROCESS = "preprocess"
    OCR = "ocr"
    UNDERSTAND = "understand"
    PARSE = "parse"
    VALIDATE = "validate"
    CONFIDENCE = "confidence"
    STRUCTURE = "structure"
    REVIEW_QUEUE = "review_queue"


@dataclass(slots=True)
class PipelineImage:
    """One notebook page image entering the pipeline (no ORM)."""

    page_id: str
    page_index: int
    file_name: str | None = None
    mime_type: str | None = None
    data: bytes | None = None
    path: str | Path | None = None
    checksum: str | None = None

    def load_bytes(self) -> bytes:
        if self.data is not None:
            return self.data
        if self.path is None:
            return b""
        return Path(self.path).read_bytes()


@dataclass(slots=True)
class PipelineOptions:
    journal_date: date | None = None
    title: str | None = None
    notebook_label: str | None = None
    job_id: str | None = None
    model_id: str = "import_pipeline_v1"
    prompt_version: str = "pipeline-2026-07-31"
    # Knowledge Import Engine — None means auto-classify with Trading default bias
    parser_type: str | None = None



@dataclass(slots=True)
class StageEvent:
    stage: PipelineStage
    message: str
    ok: bool = True
    detail: dict = field(default_factory=dict)


@dataclass(slots=True)
class PreprocessPageResult:
    page_id: str
    page_index: int
    file_name: str | None
    mime_type: str | None
    byte_size: int
    quality_score: float | None
    checksum: str | None
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class OcrPageResult:
    page_id: str
    page_index: int
    file_name: str | None
    transcript: str
    confidence: float | None
    engine: str
    meta: dict = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class UnderstandingResult:
    """AI understanding output — markdown ready for the trading journal parser."""

    markdown: str
    engine: str
    notes: str | None = None
    page_hints: dict[str, str] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ValidationResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ReviewQueueItem:
    """In-memory review-queue payload (persistence is out of scope for this layer)."""

    status: str = "pending_review"
    job_id: str | None = None
    journal_date: date | None = None
    title: str | None = None
    overall_confidence: float | None = None
    draft: JournalDraft | None = None
    confidence: ConfidenceMap | None = None
    warnings: list[str] = field(default_factory=list)
    requires_human_review: bool = True


@dataclass(slots=True)
class PipelineResult:
    draft: JournalDraft
    confidence: ConfidenceMap
    structured_json: dict
    review_item: ReviewQueueItem
    stages: list[StageEvent] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    ocr_pages: list[OcrPageResult] = field(default_factory=list)
    understanding_markdown: str = ""
    model_id: str = "import_pipeline_v1"
    prompt_version: str = "pipeline-2026-07-31"
    parse_status: str | None = None
