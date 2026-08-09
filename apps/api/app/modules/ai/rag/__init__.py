"""RAG package — chunking & indexing seams for future personal-data RAG."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TextChunk:
    title: str | None
    content: str
    source: str
    source_id: str | None = None


class Chunker:
    """Split personal-data documents into embedding-sized chunks. Stub."""

    def chunk(self, *, title: str | None, body: str, source: str, source_id: str | None = None) -> list[TextChunk]:
        text = body.strip()
        if not text:
            return []
        # Placeholder: one chunk per document until real chunking lands
        return [TextChunk(title=title, content=text, source=source, source_id=source_id)]


class RagIndexer:
    """
    Pipeline: PersonalDataGateway → Chunker → EmbeddingProvider → VectorStore.

    Not run in this phase.
    """

    def __init__(self, *, chunker: Chunker | None = None) -> None:
        self.chunker = chunker or Chunker()
