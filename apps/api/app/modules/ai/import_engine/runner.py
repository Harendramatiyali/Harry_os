"""Pipeline orchestrator — runs all stages in order.

Domain-specific parse/validate/confidence/structure is delegated to a
``KnowledgeParser`` from the Parser Registry (default: TradingParser).
"""

from __future__ import annotations

from app.core.errors import DomainError
from app.modules.ai.import_engine.classifier import HeuristicDocumentClassifier
from app.modules.ai.import_engine.parsers import resolve_parser
from app.modules.ai.import_engine.types import ParserType
from app.modules.ai.imports.pipeline.ocr import LocalOcrEngine, run_ocr
from app.modules.ai.imports.pipeline.ports import OcrEngine, UnderstandingEngine
from app.modules.ai.imports.pipeline.preprocess import preprocess_images
from app.modules.ai.imports.pipeline.review import enqueue_for_review
from app.modules.ai.imports.pipeline.structure import to_structured_json
from app.modules.ai.imports.pipeline.types import (
    PipelineImage,
    PipelineOptions,
    PipelineResult,
    PipelineStage,
    StageEvent,
)
from app.modules.ai.imports.pipeline.understand import HeuristicUnderstandingEngine, run_understanding
from app.modules.ai.import_engine.parsers.base import KnowledgeParser


async def run_pipeline(
    images: list[PipelineImage],
    *,
    options: PipelineOptions | None = None,
    ocr_engine: OcrEngine | None = None,
    understanding_engine: UnderstandingEngine | None = None,
    parser: KnowledgeParser | None = None,
    classify: bool = True,
) -> PipelineResult:
    """Execute the full AI Import processing pipeline (no DB writes)."""
    options = options or PipelineOptions()
    stages: list[StageEvent] = []
    warnings: list[str] = []

    if not images:
        raise DomainError("Pipeline requires at least one uploaded image")

    stages.append(
        StageEvent(
            stage=PipelineStage.UPLOAD,
            message=f"{len(images)} image(s) received",
            detail={"page_ids": [i.page_id for i in images]},
        )
    )

    pre = preprocess_images(images)
    for p in pre:
        warnings.extend(p.warnings)
    stages.append(
        StageEvent(
            stage=PipelineStage.PREPROCESS,
            message="Image preprocess complete",
            detail={
                "pages": [
                    {
                        "page_id": p.page_id,
                        "quality_score": p.quality_score,
                        "byte_size": p.byte_size,
                    }
                    for p in pre
                ]
            },
        )
    )

    ocr_pages = await run_ocr(images, engine=ocr_engine or LocalOcrEngine())
    for page in ocr_pages:
        warnings.extend(page.warnings)
    stages.append(
        StageEvent(
            stage=PipelineStage.OCR,
            message="OCR complete",
            detail={
                "engine": ocr_pages[0].engine if ocr_pages else None,
                "pages_with_text": sum(1 for p in ocr_pages if (p.transcript or "").strip()),
            },
        )
    )

    # —— Classifier (optional; no extra stage — preserves stage-order contracts) ——
    classification = None
    if classify:
        classification = HeuristicDocumentClassifier().classify(
            ocr_pages,
            options=options,
            forced_type=options.parser_type,
        )

    understanding = await run_understanding(
        ocr_pages,
        options=options,
        engine=understanding_engine or HeuristicUnderstandingEngine(),
    )
    warnings.extend(understanding.warnings)
    stages.append(
        StageEvent(
            stage=PipelineStage.UNDERSTAND,
            message="AI understanding complete",
            detail={
                "engine": understanding.engine,
                "notes": understanding.notes,
                "classification": (
                    {
                        "parser_type": classification.parser_type.value,
                        "confidence": classification.confidence,
                        "destination": classification.destination.value,
                    }
                    if classification
                    else None
                ),
            },
        )
    )

    # —— Domain parser (default Trading) ——
    page_ids = [i.page_id for i in sorted(images, key=lambda x: x.page_index)]
    # Preserve Trading UX: unless explicitly forced away from trading, keep trading parser
    # when classifier is low-confidence or general — Harry OS notebooks default to Trading.
    if options.parser_type:
        use_type = options.parser_type
    elif classification and classification.parser_type == ParserType.TRADING:
        use_type = ParserType.TRADING.value
    elif classification and not classification.is_low_confidence:
        use_type = classification.parser_type.value
    else:
        use_type = ParserType.TRADING.value

    active_parser = parser or resolve_parser(use_type)
    extracted = active_parser.extract(understanding, options=options, page_ids=page_ids)
    warnings.extend(extracted.warnings)
    stages.append(
        StageEvent(
            stage=PipelineStage.PARSE,
            message=f"{active_parser.name} extract complete",
            detail={
                "parser_type": active_parser.parser_type.value,
                "parse_status": extracted.parse_status,
                "trade_count": extracted.trade_count,
                "section_count": extracted.section_count,
            },
        )
    )

    validation = active_parser.validate(extracted.draft, page_ids=page_ids)
    warnings.extend(validation.warnings)
    stages.append(
        StageEvent(
            stage=PipelineStage.VALIDATE,
            message="Validation complete",
            ok=validation.ok,
            detail={"errors": validation.errors, "warnings": validation.warnings},
        )
    )
    if not validation.ok:
        warnings.extend(validation.errors)

    confidence = active_parser.confidence(
        extracted.draft,
        ocr_pages=ocr_pages,
        validation=validation,
        meta=extracted.meta,
    )
    stages.append(
        StageEvent(
            stage=PipelineStage.CONFIDENCE,
            message="Confidence scored",
            detail={"overall": confidence.overall, "fields": confidence.fields},
        )
    )

    draft = active_parser.transform(
        extracted.draft,
        page_ids=page_ids,
        validation=validation,
        confidence=confidence,
    )
    structured = to_structured_json(draft, confidence)
    if classification:
        structured["classification"] = {
            "parser_type": classification.parser_type.value,
            "confidence": classification.confidence,
            "destination": classification.destination.value,
            "reasons": classification.reasons,
        }
    structured["parser"] = {
        "type": active_parser.parser_type.value,
        "name": active_parser.name,
        "destination": active_parser.destination_module.value,
        "architecture_only": active_parser.architecture_only,
        "review_fields": [
            {
                "key": f.key,
                "label": f.label,
                "field_type": f.field_type,
                "required": f.required,
                "group": f.group,
                "description": f.description,
            }
            for f in active_parser.review_fields()
        ],
    }
    stages.append(
        StageEvent(
            stage=PipelineStage.STRUCTURE,
            message="Structured JSON ready",
            detail={
                "journal_date": getattr(draft, "journal_date", None)
                and draft.journal_date.isoformat(),
                "trade_count": len(getattr(draft, "trades", []) or []),
                "section_count": len(getattr(draft, "sections", []) or []),
                "parser_type": active_parser.parser_type.value,
            },
        )
    )

    seen: set[str] = set()
    unique_warnings: list[str] = []
    for w in warnings:
        if w not in seen:
            seen.add(w)
            unique_warnings.append(w)

    review_item = enqueue_for_review(
        draft=draft,
        confidence=confidence,
        job_id=options.job_id,
        warnings=unique_warnings,
    )
    stages.append(
        StageEvent(
            stage=PipelineStage.REVIEW_QUEUE,
            message="Queued for human review",
            detail={
                "status": review_item.status,
                "requires_human_review": review_item.requires_human_review,
                "overall_confidence": review_item.overall_confidence,
            },
        )
    )

    return PipelineResult(
        draft=draft,
        confidence=confidence,
        structured_json=structured,
        review_item=review_item,
        stages=stages,
        warnings=unique_warnings,
        ocr_pages=ocr_pages,
        understanding_markdown=understanding.markdown,
        model_id=options.model_id,
        prompt_version=options.prompt_version,
        parse_status=extracted.parse_status,
    )
