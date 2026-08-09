"""Parse Obsidian markdown: frontmatter, tags, wikilinks."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
TAG_RE = re.compile(r"(?<!\w)#([A-Za-z][\w/-]*)")
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]")


@dataclass(slots=True)
class ParsedMarkdown:
    title_hint: str | None
    body: str
    frontmatter: dict = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
    wikilinks: list[str] = field(default_factory=list)


def parse_markdown(raw: str, *, filename_stem: str) -> ParsedMarkdown:
    text = raw.replace("\r\n", "\n")
    frontmatter: dict = {}
    body = text
    m = FRONTMATTER_RE.match(text)
    if m:
        frontmatter = _parse_simple_yaml(m.group(1))
        body = text[m.end() :]

    tags = sorted({t.lower() for t in TAG_RE.findall(body)})
    fm_tags = frontmatter.get("tags")
    if isinstance(fm_tags, list):
        tags = sorted({*tags, *[str(t).lower().lstrip("#") for t in fm_tags]})
    elif isinstance(fm_tags, str) and fm_tags.strip():
        tags = sorted({*tags, fm_tags.strip().lower().lstrip("#")})

    wikilinks = sorted({w.strip() for w in WIKILINK_RE.findall(body) if w.strip()})
    title = None
    if isinstance(frontmatter.get("title"), str) and frontmatter["title"].strip():
        title = frontmatter["title"].strip()
    else:
        for line in body.splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
                break
    if not title:
        title = filename_stem

    return ParsedMarkdown(
        title_hint=title,
        body=body.strip(),
        frontmatter=frontmatter,
        tags=tags,
        wikilinks=wikilinks,
    )


def _parse_simple_yaml(block: str) -> dict:
    """Minimal YAML subset for Obsidian frontmatter (no dependency)."""
    data: dict = {}
    current_list_key: str | None = None
    for raw_line in block.splitlines():
        line = raw_line.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        if line.lstrip().startswith("- ") and current_list_key:
            data.setdefault(current_list_key, [])
            if isinstance(data[current_list_key], list):
                data[current_list_key].append(_scalar(line.lstrip()[2:].strip()))
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if value == "" or value == "[]":
                current_list_key = key
                data[key] = [] if value == "[]" else []
                continue
            current_list_key = None
            if value.startswith("[") and value.endswith("]"):
                inner = value[1:-1].strip()
                data[key] = [_scalar(p.strip()) for p in inner.split(",") if p.strip()] if inner else []
            else:
                data[key] = _scalar(value)
        else:
            current_list_key = None
    return data


def _scalar(value: str):
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    low = value.lower()
    if low in {"true", "yes"}:
        return True
    if low in {"false", "no"}:
        return False
    if low in {"null", "~"}:
        return None
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


def frontmatter_to_json(data: dict) -> str | None:
    if not data:
        return None
    return json.dumps(data, ensure_ascii=False, default=str)
