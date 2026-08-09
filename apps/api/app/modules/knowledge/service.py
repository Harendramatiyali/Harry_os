"""Knowledge use-cases + Obsidian import-only."""

from __future__ import annotations

import json
import uuid
from collections import Counter
from pathlib import Path

from app.core.config import Settings
from app.core.errors import DomainError, NotFoundError
from app.modules.knowledge.models import ImportRun, KnowledgeNote, NoteArea, NoteKind, NoteSource
from app.modules.knowledge.obsidian.importer import scan_vault
from app.modules.knowledge.obsidian.parser import frontmatter_to_json
from app.modules.knowledge.repository import ImportRunRepository, KnowledgeNoteRepository, soft_delete
from app.modules.knowledge.schemas import (
    AreaCount,
    ImportFilePreview,
    ImportFolderGroup,
    KnowledgeDashboard,
    NoteCreate,
    NoteOut,
    NoteSummary,
    NoteUpdate,
    ObsidianImportReport,
    ObsidianImportRequest,
)


def _csv(items: list[str]) -> str | None:
    cleaned = sorted({i.strip() for i in items if i and i.strip()})
    return ",".join(cleaned) if cleaned else None


def _list(csv: str | None) -> list[str]:
    return [p for p in (csv or "").split(",") if p]


class KnowledgeService:
    def __init__(
        self,
        *,
        settings: Settings,
        notes: KnowledgeNoteRepository,
        imports: ImportRunRepository,
    ) -> None:
        self.settings = settings
        self.notes = notes
        self.imports = imports

    def to_out(self, row: KnowledgeNote) -> NoteOut:
        return NoteOut(
            id=row.id,
            title=row.title,
            body=row.body,
            source=row.source,  # type: ignore[arg-type]
            area=row.area,  # type: ignore[arg-type]
            kind=row.kind,  # type: ignore[arg-type]
            vault_path=row.vault_path,
            folder_path=row.folder_path,
            tags=_list(row.tags_csv),
            wikilinks=_list(row.wikilinks_csv),
            journal_date=row.journal_date,
            word_count=row.word_count,
            is_empty=bool(row.is_empty),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def to_summary(self, row: KnowledgeNote) -> NoteSummary:
        return NoteSummary(
            id=row.id,
            title=row.title,
            source=row.source,  # type: ignore[arg-type]
            area=row.area,  # type: ignore[arg-type]
            kind=row.kind,  # type: ignore[arg-type]
            vault_path=row.vault_path,
            folder_path=row.folder_path,
            journal_date=row.journal_date,
            word_count=row.word_count,
            is_empty=bool(row.is_empty),
            updated_at=row.updated_at,
        )

    async def dashboard(self, user_id: str) -> KnowledgeDashboard:
        by_area = [AreaCount(area=a, count=c) for a, c in await self.notes.counts_by_area(user_id)]
        recent = await self.notes.list_for_user(user_id, limit=8)
        return KnowledgeDashboard(
            total_notes=await self.notes.count_all(user_id),
            from_obsidian=await self.notes.count_source(user_id, NoteSource.OBSIDIAN.value),
            empty_notes=await self.notes.count_empty(user_id),
            by_area=by_area,
            recent=[self.to_summary(r) for r in recent],
        )

    async def list_notes(self, user_id: str, **kwargs) -> list[NoteSummary]:
        rows = await self.notes.list_for_user(user_id, **kwargs)
        return [self.to_summary(r) for r in rows]

    async def get_note(self, user_id: str, note_id: str) -> NoteOut:
        return self.to_out(await self._note(user_id, note_id))

    async def create_note(self, user_id: str, data: NoteCreate) -> NoteOut:
        body = data.body or ""
        row = KnowledgeNote(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title.strip(),
            body=body,
            source=NoteSource.NATIVE,
            area=NoteArea(data.area.value),
            kind=NoteKind(data.kind.value),
            tags_csv=_csv(data.tags),
            word_count=len(body.split()) if body.strip() else 0,
            is_empty=0 if body.strip() else 1,
        )
        await self.notes.add(row)
        return self.to_out(row)

    async def update_note(self, user_id: str, note_id: str, data: NoteUpdate) -> NoteOut:
        row = await self._note(user_id, note_id)
        payload = data.model_dump(exclude_unset=True)
        if "title" in payload and payload["title"]:
            payload["title"] = payload["title"].strip()
        if "tags" in payload and payload["tags"] is not None:
            row.tags_csv = _csv(payload.pop("tags"))
        if "area" in payload and payload["area"] is not None:
            payload["area"] = NoteArea(payload["area"].value if hasattr(payload["area"], "value") else payload["area"])
        if "kind" in payload and payload["kind"] is not None:
            payload["kind"] = NoteKind(payload["kind"].value if hasattr(payload["kind"], "value") else payload["kind"])
        for k, v in payload.items():
            setattr(row, k, v)
        if "body" in payload:
            body = row.body or ""
            row.word_count = len(body.split()) if body.strip() else 0
            row.is_empty = 0 if body.strip() else 1
        await self.notes.session.flush()
        return self.to_out(row)

    async def delete_note(self, user_id: str, note_id: str) -> None:
        soft_delete(await self._note(user_id, note_id))
        await self.notes.session.flush()

    async def import_obsidian(self, user_id: str, data: ObsidianImportRequest) -> ObsidianImportReport:
        vault = data.vault_path or self.settings.obsidian_vault_path
        if not vault:
            raise DomainError(
                "Obsidian vault path not configured. Set OBSIDIAN_VAULT_PATH or pass vault_path."
            )
        root = Path(vault).expanduser().resolve()
        if not root.is_dir():
            raise DomainError(f"Vault path does not exist or is not a directory: {root}")

        scanned = scan_vault(
            root,
            include_harendra=data.include_harendra,
            skip_empty=data.skip_empty,
        )

        created = updated = skipped = empty = 0
        area_counter: Counter[str] = Counter()
        files: list[ImportFilePreview] = []

        for item in scanned:
            area_counter[item.area.value] += 1
            if item.is_empty:
                empty += 1

            existing = await self.notes.get_by_vault_path(user_id, item.vault_path)
            if existing and existing.content_hash == item.content_hash:
                action = "skip"
                skipped += 1
            elif existing:
                action = "update"
                if not data.dry_run:
                    existing.title = item.title
                    existing.body = item.body
                    existing.area = NoteArea(item.area.value)
                    existing.kind = NoteKind(item.kind.value)
                    existing.folder_path = item.folder_path
                    existing.content_hash = item.content_hash
                    existing.tags_csv = _csv(item.tags)
                    existing.wikilinks_csv = _csv(item.wikilinks)
                    existing.frontmatter_json = frontmatter_to_json(item.frontmatter)
                    existing.journal_date = item.journal_date  # type: ignore[assignment]
                    existing.word_count = item.word_count
                    existing.is_empty = 1 if item.is_empty else 0
                    existing.source = NoteSource.OBSIDIAN
                    updated += 1
                else:
                    updated += 1
            else:
                action = "create"
                if not data.dry_run:
                    row = KnowledgeNote(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        title=item.title,
                        body=item.body,
                        source=NoteSource.OBSIDIAN,
                        area=NoteArea(item.area.value),
                        kind=NoteKind(item.kind.value),
                        vault_path=item.vault_path,
                        folder_path=item.folder_path,
                        content_hash=item.content_hash,
                        tags_csv=_csv(item.tags),
                        wikilinks_csv=_csv(item.wikilinks),
                        frontmatter_json=frontmatter_to_json(item.frontmatter),
                        journal_date=item.journal_date,  # type: ignore[arg-type]
                        word_count=item.word_count,
                        is_empty=1 if item.is_empty else 0,
                    )
                    await self.notes.add(row)
                    created += 1
                else:
                    created += 1

            files.append(
                ImportFilePreview(
                    vault_path=item.vault_path,
                    folder_path=item.folder_path or "(vault root)",
                    title=item.title,
                    area=item.area,
                    kind=item.kind,
                    journal_date=item.journal_date,  # type: ignore[arg-type]
                    word_count=item.word_count,
                    is_empty=item.is_empty,
                    action=action,
                )
            )

        if not data.dry_run:
            await self.notes.session.flush()

        by_folder = _group_by_folder(files)
        report_payload = {
            "by_area": dict(area_counter),
            "by_folder": [g.model_dump(mode="json") for g in by_folder],
            "files": [f.model_dump(mode="json") for f in files],
        }
        run_id = None
        if not data.dry_run:
            run = ImportRun(
                id=str(uuid.uuid4()),
                user_id=user_id,
                vault_path=str(root),
                dry_run=0,
                scanned=len(scanned),
                created_count=created,
                updated_count=updated,
                skipped_count=skipped,
                empty_count=empty,
                report_json=json.dumps(report_payload, ensure_ascii=False),
            )
            await self.imports.add(run)
            run_id = run.id

        return ObsidianImportReport(
            vault_path=str(root),
            dry_run=data.dry_run,
            scanned=len(scanned),
            created=created,
            updated=updated,
            skipped=skipped,
            empty=empty,
            by_area=[AreaCount(area=a, count=c) for a, c in sorted(area_counter.items())],
            by_folder=by_folder,
            files=files,
            samples=files,
            run_id=run_id,
        )

    async def _note(self, user_id: str, note_id: str) -> KnowledgeNote:
        row = await self.notes.get_owned(user_id, note_id)
        if not row:
            raise NotFoundError("Note not found")
        return row


def _group_by_folder(files: list[ImportFilePreview]) -> list[ImportFolderGroup]:
    buckets: dict[str, list[ImportFilePreview]] = {}
    for f in files:
        key = f.folder_path or "(vault root)"
        buckets.setdefault(key, []).append(f)

    groups: list[ImportFolderGroup] = []
    for folder in sorted(buckets.keys(), key=lambda s: s.lower()):
        items = sorted(buckets[folder], key=lambda x: x.title.lower())
        # Dominant area in folder for the group header
        area_counts = Counter(i.area for i in items)
        dominant = area_counts.most_common(1)[0][0]
        groups.append(
            ImportFolderGroup(
                folder_path=folder,
                area=dominant,
                count=len(items),
                empty=sum(1 for i in items if i.is_empty),
                create=sum(1 for i in items if i.action == "create"),
                update=sum(1 for i in items if i.action == "update"),
                skip=sum(1 for i in items if i.action == "skip"),
                files=items,
            )
        )
    return groups
