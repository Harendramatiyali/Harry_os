"""Obsidian vault importer (one-way / import-only)."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from app.modules.knowledge.obsidian.mapper import map_vault_path
from app.modules.knowledge.obsidian.parser import ParsedMarkdown, parse_markdown
from app.modules.knowledge.schemas import NoteArea, NoteKind


SKIP_DIR_NAMES = {".obsidian", ".trash", ".git", "node_modules"}


@dataclass(slots=True)
class ScannedNote:
    abs_path: Path
    vault_path: str  # relative posix
    folder_path: str
    title: str
    body: str
    area: NoteArea
    kind: NoteKind
    journal_date: object | None
    tags: list[str]
    wikilinks: list[str]
    frontmatter: dict
    content_hash: str
    word_count: int
    is_empty: bool


def scan_vault(
    vault_root: Path,
    *,
    include_harendra: bool = True,
    skip_empty: bool = False,
) -> list[ScannedNote]:
    if not vault_root.is_dir():
        raise FileNotFoundError(f"Vault not found: {vault_root}")

    notes: list[ScannedNote] = []
    for path in sorted(vault_root.rglob("*.md")):
        if any(part in SKIP_DIR_NAMES for part in path.parts):
            continue
        rel = path.relative_to(vault_root).as_posix()
        if not include_harendra and "harendra" in rel.lower():
            continue

        raw = path.read_text(encoding="utf-8", errors="replace")
        parsed: ParsedMarkdown = parse_markdown(raw, filename_stem=path.stem)
        mapping = map_vault_path(rel)
        body = parsed.body
        word_count = len(body.split()) if body.strip() else 0
        is_empty = word_count == 0
        if skip_empty and is_empty:
            continue

        content_hash = hashlib.sha256(raw.encode("utf-8", errors="replace")).hexdigest()
        folder = path.parent.relative_to(vault_root).as_posix() if path.parent != vault_root else ""

        notes.append(
            ScannedNote(
                abs_path=path,
                vault_path=rel,
                folder_path=folder,
                title=(parsed.title_hint or path.stem).strip()[:512],
                body=body,
                area=mapping.area,
                kind=mapping.kind,
                journal_date=mapping.journal_date,
                tags=parsed.tags,
                wikilinks=parsed.wikilinks,
                frontmatter=parsed.frontmatter,
                content_hash=content_hash,
                word_count=word_count,
                is_empty=is_empty,
            )
        )
    return notes
