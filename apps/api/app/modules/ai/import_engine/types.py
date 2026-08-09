"""Shared types for the Knowledge Import Engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ParserType(str, Enum):
    TRADING = "trading"
    BOOK = "book"
    MEETING = "meeting"
    FINANCE = "finance"
    HEALTH = "health"
    ENGLISH = "english"
    DAILY_JOURNAL = "daily_journal"
    PROJECT = "project"
    RESEARCH = "research"
    GENERAL = "general"


class DestinationModule(str, Enum):
    TRADING = "trading"
    BOOKS = "books"
    FINANCE = "finance"
    HEALTH = "health"
    PLANNER = "planner"
    KNOWLEDGE = "knowledge"
    INBOX = "inbox"


@dataclass(slots=True)
class ReviewField:
    """Metadata for the generic Review Engine UI."""

    key: str
    label: str
    field_type: str  # text | date | number | textarea | section_list | trade_list | select
    required: bool = False
    group: str = "main"
    options: list[str] = field(default_factory=list)
    description: str | None = None


@dataclass(slots=True)
class ClassificationResult:
    parser_type: ParserType
    confidence: float
    reasons: list[str] = field(default_factory=list)
    destination: DestinationModule = DestinationModule.INBOX
    raw_scores: dict[str, float] = field(default_factory=dict)

    @property
    def is_low_confidence(self) -> bool:
        return self.confidence < 0.55


@dataclass(slots=True)
class ParserExtractResult:
    """Output of parser.extract() — domain draft + opaque meta for later stages."""

    draft: Any
    warnings: list[str] = field(default_factory=list)
    parse_status: str = "needs_review"
    meta: dict[str, Any] = field(default_factory=dict)
    trade_count: int = 0
    section_count: int = 0
