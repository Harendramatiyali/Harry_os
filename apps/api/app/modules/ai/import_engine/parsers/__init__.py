"""Parser registry — resolve KnowledgeParser by ParserType."""

from __future__ import annotations

from app.core.errors import DomainError
from app.modules.ai.import_engine.parsers.base import KnowledgeParser
from app.modules.ai.import_engine.types import ParserType

_REGISTRY: dict[ParserType, KnowledgeParser] | None = None


def _build_default_registry() -> dict[ParserType, KnowledgeParser]:
    from app.modules.ai.import_engine.parsers.book import BookParser
    from app.modules.ai.import_engine.parsers.daily_journal import DailyJournalParser
    from app.modules.ai.import_engine.parsers.english import EnglishParser
    from app.modules.ai.import_engine.parsers.finance import FinanceParser
    from app.modules.ai.import_engine.parsers.general import GeneralParser
    from app.modules.ai.import_engine.parsers.health import HealthParser
    from app.modules.ai.import_engine.parsers.meeting import MeetingParser
    from app.modules.ai.import_engine.parsers.project import ProjectParser
    from app.modules.ai.import_engine.parsers.research import ResearchParser
    from app.modules.ai.import_engine.parsers.trading import TradingParser

    parsers: list[KnowledgeParser] = [
        TradingParser(),
        BookParser(),
        MeetingParser(),
        FinanceParser(),
        HealthParser(),
        EnglishParser(),
        DailyJournalParser(),
        ProjectParser(),
        ResearchParser(),
        GeneralParser(),
    ]
    return {p.parser_type: p for p in parsers}


def get_parser_registry() -> dict[ParserType, KnowledgeParser]:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = _build_default_registry()
    return _REGISTRY


def reset_parser_registry() -> None:
    """Test helper — clear singleton."""
    global _REGISTRY
    _REGISTRY = None


def register_parser(parser: KnowledgeParser) -> None:
    get_parser_registry()[parser.parser_type] = parser


def resolve_parser(parser_type: ParserType | str | None) -> KnowledgeParser:
    """Resolve parser; default trading for backward-compatible Trading UX."""
    registry = get_parser_registry()
    if parser_type is None or parser_type == "":
        return registry[ParserType.TRADING]
    key = ParserType(parser_type) if isinstance(parser_type, str) else parser_type
    parser = registry.get(key)
    if parser is None:
        raise DomainError(f"No parser registered for type: {key}")
    return parser
