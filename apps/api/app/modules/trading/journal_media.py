"""Resolve Obsidian vault media and copy into Harry OS media_root."""

from __future__ import annotations

import mimetypes
import shutil
import uuid
from pathlib import Path

from app.modules.trading.journal_models import AttachmentImportStatus, TradingJournalAttachment

# Obsidian often keeps screenshots here; still fall back to full-vault search.
_PREFERRED_SUBDIRS = (
    "📁 9_Resources/Screenshots",
    "9_Resources/Screenshots",
    "Screenshots",
    "attachments",
    "Assets",
)


def guess_mime(path: Path) -> str:
    mime, _ = mimetypes.guess_type(str(path))
    return mime or "application/octet-stream"


def build_vault_index(vault_root: Path) -> dict[str, Path]:
    """Map lowercased filename → first matching path (prefer Screenshots dirs)."""
    index: dict[str, Path] = {}
    if not vault_root.is_dir():
        return index

    preferred_roots: list[Path] = []
    for sub in _PREFERRED_SUBDIRS:
        candidate = vault_root / sub
        if candidate.is_dir():
            preferred_roots.append(candidate)

    search_roots = preferred_roots + [vault_root]
    seen_roots: set[Path] = set()

    for root in search_roots:
        resolved = root.resolve()
        if resolved in seen_roots:
            continue
        seen_roots.add(resolved)
        try:
            for path in root.rglob("*"):
                if not path.is_file():
                    continue
                # Skip huge / irrelevant trees
                parts_lower = {p.lower() for p in path.parts}
                if ".obsidian" in parts_lower or "node_modules" in parts_lower:
                    continue
                key = path.name.lower()
                if key not in index:
                    index[key] = path
        except OSError:
            continue
    return index


def resolve_vault_file(
    *,
    vault_root: Path,
    obsidian_ref: str,
    file_name: str,
    index: dict[str, Path] | None = None,
) -> Path | None:
    """Find a vault file for an Obsidian ![[ref]]."""
    ref = (obsidian_ref or file_name or "").strip()
    if not ref:
        return None
    # Strip size/alias after |
    ref = ref.split("|", 1)[0].strip()
    name = Path(ref).name
    if not name:
        return None

    # Direct relative path from vault root
    direct = vault_root / ref
    if direct.is_file():
        return direct

    for sub in _PREFERRED_SUBDIRS:
        candidate = vault_root / sub / name
        if candidate.is_file():
            return candidate

    idx = index if index is not None else build_vault_index(vault_root)
    return idx.get(name.lower())


def copy_attachment_from_vault(
    att: TradingJournalAttachment,
    *,
    vault_root: Path,
    media_root: Path,
    user_id: str,
    index: dict[str, Path] | None = None,
) -> AttachmentImportStatus:
    """Copy vault file into media_root; update attachment row fields in-place."""
    status_val = (
        att.import_status.value if hasattr(att.import_status, "value") else str(att.import_status)
    )
    if status_val == AttachmentImportStatus.COPIED.value and att.storage_path:
        existing = Path(att.storage_path)
        if existing.is_file():
            return AttachmentImportStatus.COPIED

    source = resolve_vault_file(
        vault_root=vault_root,
        obsidian_ref=att.obsidian_ref,
        file_name=att.file_name,
        index=index,
    )
    if source is None or not source.is_file():
        att.import_status = AttachmentImportStatus.MISSING
        att.storage_path = None
        return AttachmentImportStatus.MISSING

    dest_dir = media_root / "trading_journals" / user_id / att.journal_day_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(att.file_name or source.name).name
    dest = dest_dir / f"{att.id}_{safe_name}"
    shutil.copy2(source, dest)

    att.storage_path = str(dest)
    att.mime_type = guess_mime(source)
    att.file_name = safe_name
    att.import_status = AttachmentImportStatus.COPIED
    return AttachmentImportStatus.COPIED


def collect_day_attachments(day) -> list[TradingJournalAttachment]:
    """Flatten day + trade attachments."""
    rows: list[TradingJournalAttachment] = list(day.attachments or [])
    for trade in day.trades or []:
        rows.extend(list(trade.attachments or []))
    # Deduplicate by id
    seen: set[str] = set()
    unique: list[TradingJournalAttachment] = []
    for row in rows:
        if row.id in seen:
            continue
        seen.add(row.id)
        unique.append(row)
    return unique
