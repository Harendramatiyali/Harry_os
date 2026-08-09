"""Map Harry's Obsidian vault folders → Knowledge area/kind."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from pathlib import PurePosixPath

from app.modules.knowledge.schemas import NoteArea, NoteKind

DATE_STEM_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


@dataclass(slots=True)
class FolderMapping:
    area: NoteArea
    kind: NoteKind
    journal_date: date | None = None


def normalize_folder_token(name: str) -> str:
    """Strip emoji / decoration so '📁 07_Books' → '07_books'."""
    cleaned = re.sub(r"[^\w\s\-_/]", "", name, flags=re.UNICODE)
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def map_vault_path(rel_path: str) -> FolderMapping:
    """
    rel_path uses forward slashes, vault-relative, e.g.
    '📁 08_Journals/Daily Journal/2026-07-22.md'
    """
    path = PurePosixPath(rel_path.replace("\\", "/"))
    parts = [normalize_folder_token(p) for p in path.parts[:-1]]
    stem = path.stem
    joined = "/".join(parts)

    journal_date = _parse_date_stem(stem)

    if "templates" in joined or stem.endswith("template"):
        return FolderMapping(NoteArea.RESOURCES, NoteKind.TEMPLATE, journal_date)

    if any(p.startswith("00_") or "dashboard" in p for p in parts):
        return FolderMapping(NoteArea.DASHBOARD, NoteKind.DASHBOARD, journal_date)

    if any(p.startswith("01_") or p == "01_life os" or "life os" in p for p in parts):
        return FolderMapping(NoteArea.LIFE, NoteKind.NOTE, journal_date)

    if any("trading journal" in p for p in parts):
        return FolderMapping(NoteArea.TRADING, NoteKind.TRADING_JOURNAL, journal_date)

    if any("daily journal" in p for p in parts):
        return FolderMapping(NoteArea.JOURNAL, NoteKind.DAILY_JOURNAL, journal_date)

    if any("weekly review" in p for p in parts):
        return FolderMapping(NoteArea.JOURNAL, NoteKind.WEEKLY_REVIEW, journal_date)

    if any("monthly review" in p for p in parts):
        return FolderMapping(NoteArea.JOURNAL, NoteKind.MONTHLY_REVIEW, journal_date)

    if any(p.startswith("08_") or "journals" in p for p in parts):
        return FolderMapping(NoteArea.JOURNAL, NoteKind.NOTE, journal_date)

    if any("trading" in p for p in parts) and any(
        p.startswith("02_") or "wealth" in p for p in parts
    ):
        kind = NoteKind.RULES if "rule" in stem.lower() or "execution" in stem.lower() else NoteKind.NOTE
        return FolderMapping(NoteArea.TRADING, kind, journal_date)

    if any(p.startswith("02_") or "wealth" in p for p in parts):
        return FolderMapping(NoteArea.WEALTH, NoteKind.NOTE, journal_date)

    if any(p.startswith("03_") or "career" in p for p in parts):
        return FolderMapping(NoteArea.CAREER, NoteKind.NOTE, journal_date)

    if any(p.startswith("05_") or p == "05_ai os" or "ai os" in p for p in parts):
        return FolderMapping(NoteArea.AI, NoteKind.NOTE, journal_date)

    if any(p.startswith("06_") or "health" in p for p in parts):
        return FolderMapping(NoteArea.HEALTH, NoteKind.NOTE, journal_date)

    if any(p.startswith("07_") or p.endswith("books") or "/books" in f"/{joined}" for p in parts):
        # Index note named Books.md stays NOTE; titled books → BOOK
        kind = NoteKind.NOTE if stem.lower() in {"books", "reading list"} else NoteKind.BOOK
        return FolderMapping(NoteArea.BOOKS, kind, journal_date)

    if any(p.startswith("9_") or "resources" in p for p in parts):
        return FolderMapping(NoteArea.RESOURCES, NoteKind.NOTE, journal_date)

    if any("archive" in p for p in parts):
        return FolderMapping(NoteArea.ARCHIVE, NoteKind.NOTE, journal_date)

    if any("harendra" in p for p in parts):
        return FolderMapping(NoteArea.PROJECT, NoteKind.NOTE, journal_date)

    return FolderMapping(NoteArea.OTHER, NoteKind.NOTE, journal_date)


def _parse_date_stem(stem: str) -> date | None:
    m = DATE_STEM_RE.match(stem.strip())
    if not m:
        return None
    try:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None
