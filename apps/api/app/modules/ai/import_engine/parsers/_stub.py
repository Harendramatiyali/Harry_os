"""Shared stub base for architecture-only parsers."""

from __future__ import annotations

from datetime import date
from typing import Any

from app.core.errors import DomainError
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
from app.modules.ai.imports.schemas import ConfidenceMap, JournalDraft, JournalDraftSection


class ArchitectureOnlyParser:
    """Placeholder parser — registers in the registry but cannot save yet."""

    parser_type: ParserType
    name: str
    destination_module: DestinationModule = DestinationModule.INBOX
    architecture_only = True
    _label: str = "Knowledge"
    _future_fields: list[str]

    def extract(
        self,
        understanding: UnderstandingResult,
        *,
        options: PipelineOptions,
        page_ids: list[str],
    ) -> ParserExtractResult:
        title = options.title or options.notebook_label or f"{self._label} import"
        journal_date = options.journal_date or date.today()
        body = (understanding.markdown or "").strip() or (
            f"{self._label} document detected. Structured extraction is not implemented yet — "
            "routed to Knowledge Inbox."
        )
        draft = JournalDraft(
            journal_date=journal_date,
            title=title,
            tags=[self.parser_type.value, "architecture_only"],
            sections=[
                JournalDraftSection(
                    section_key="uncategorized",
                    heading_original=self._label,
                    body_markdown=body[:8000],
                    sort_order=0,
                )
            ],
            day_attachment_page_ids=list(page_ids),
            uncategorized_markdown=body[:4000] if not understanding.markdown else None,
        )
        return ParserExtractResult(
            draft=draft,
            warnings=[f"{self.name} is architecture-only — draft is a review scaffold"],
            parse_status="needs_review",
            meta={"architecture_only": True, "future_fields": self._future_fields},
            section_count=1,
        )

    def validate(self, draft: Any, *, page_ids: list[str]) -> ValidationResult:
        return ValidationResult(ok=True, warnings=["architecture-only parser"])

    def confidence(
        self,
        draft: Any,
        *,
        ocr_pages: list[OcrPageResult],
        validation: ValidationResult,
        meta: dict[str, Any],
    ) -> ConfidenceMap:
        return ConfidenceMap(
            overall=0.25,
            journal_date=0.4,
            fields={"ocr": 0.3, "validation": 0.5},
            notes=f"{self.name}: architecture stub",
        )

    def transform(
        self,
        draft: Any,
        *,
        page_ids: list[str],
        validation: ValidationResult,
        confidence: ConfidenceMap,
    ) -> Any:
        return draft

    def review_fields(self) -> list[ReviewField]:
        fields = [
            ReviewField(key="title", label="Title", field_type="text", group="header"),
            ReviewField(key="journal_date", label="Date", field_type="date", group="header"),
            ReviewField(
                key="sections",
                label="Content",
                field_type="section_list",
                group="body",
            ),
        ]
        for key in self._future_fields:
            fields.append(
                ReviewField(
                    key=key,
                    label=key.replace("_", " ").title(),
                    field_type="textarea",
                    group="planned",
                    description="Planned field — not extracted yet",
                )
            )
        return fields

    async def save(self, *args: Any, **kwargs: Any) -> Any:
        raise DomainError(
            f"{self.name} is architecture-only and cannot save yet. "
            "Use Knowledge Inbox or Trading parser."
        )


class BookParser(ArchitectureOnlyParser):
    parser_type = ParserType.BOOK
    name = "book_notes_v0"
    destination_module = DestinationModule.BOOKS
    _label = "Book Notes"
    _future_fields = [
        "author",
        "chapter",
        "summary",
        "key_learnings",
        "quotes",
        "vocabulary",
        "action_items",
        "personal_reflection",
    ]


class MeetingParser(ArchitectureOnlyParser):
    parser_type = ParserType.MEETING
    name = "meeting_notes_v0"
    destination_module = DestinationModule.PLANNER
    _label = "Meeting Notes"
    _future_fields = [
        "project",
        "agenda",
        "discussion",
        "decisions",
        "action_items",
        "follow_ups",
    ]


class FinanceParser(ArchitectureOnlyParser):
    parser_type = ParserType.FINANCE
    name = "finance_notes_v0"
    destination_module = DestinationModule.FINANCE
    _label = "Finance Notes"
    _future_fields = ["investment_journal", "research", "watchlist", "action_items"]


class HealthParser(ArchitectureOnlyParser):
    parser_type = ParserType.HEALTH
    name = "health_notes_v0"
    destination_module = DestinationModule.HEALTH
    _label = "Health Notes"
    _future_fields = ["workout", "nutrition", "measurements", "progress"]


class EnglishParser(ArchitectureOnlyParser):
    parser_type = ParserType.ENGLISH
    name = "english_notes_v0"
    destination_module = DestinationModule.KNOWLEDGE
    _label = "English Notes"
    _future_fields = ["vocabulary", "meaning", "examples", "grammar", "revision_queue"]


class DailyJournalParser(ArchitectureOnlyParser):
    parser_type = ParserType.DAILY_JOURNAL
    name = "daily_journal_v0"
    destination_module = DestinationModule.KNOWLEDGE
    _label = "Daily Journal"
    _future_fields = ["mood", "highlights", "gratitude", "reflection"]


class ProjectParser(ArchitectureOnlyParser):
    parser_type = ParserType.PROJECT
    name = "project_notes_v0"
    destination_module = DestinationModule.PLANNER
    _label = "Project Notes"
    _future_fields = ["architecture", "requirements", "tasks", "api", "database"]


class ResearchParser(ArchitectureOnlyParser):
    parser_type = ParserType.RESEARCH
    name = "research_notes_v0"
    destination_module = DestinationModule.KNOWLEDGE
    _label = "Research Notes"
    _future_fields = ["topic", "sources", "findings", "questions", "next_steps"]


class GeneralParser(ArchitectureOnlyParser):
    parser_type = ParserType.GENERAL
    name = "general_inbox_v0"
    destination_module = DestinationModule.INBOX
    _label = "Knowledge Inbox"
    _future_fields = ["destination_module", "user_notes"]
