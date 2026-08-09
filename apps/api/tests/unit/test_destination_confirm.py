"""Unit tests for destination confirmation helpers."""

from __future__ import annotations

from app.modules.ai.imports.service import AiImportService


def test_parser_for_destination_mapping() -> None:
    assert AiImportService._parser_for_destination("trading") == "trading"
    assert AiImportService._parser_for_destination("books") == "book"
    assert AiImportService._parser_for_destination("planner") == "meeting"
    assert AiImportService._parser_for_destination("career") == "meeting"
    assert AiImportService._parser_for_destination("knowledge") == "research"
    assert AiImportService._parser_for_destination("inbox") == "general"
    assert AiImportService._parser_for_destination("books", "book") == "book"
