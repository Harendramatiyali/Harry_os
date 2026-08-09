"""Null vector store — RAG search seam."""

from __future__ import annotations

from app.core.errors import NotImplementedAppError
from app.modules.ai.ports.retriever import RetrievedChunk


class NullVectorStore:
    async def upsert(
        self,
        *,
        user_id: str,
        chunk_id: str,
        vector: list[float],
        metadata: dict,
    ) -> None:
        raise NotImplementedAppError(
            "Vector store upsert not implemented yet.",
            details={"user_id": user_id, "chunk_id": chunk_id},
        )

    async def delete(self, *, user_id: str, chunk_id: str) -> None:
        raise NotImplementedAppError(
            "Vector store delete not implemented yet.",
            details={"user_id": user_id, "chunk_id": chunk_id},
        )

    async def search(
        self,
        *,
        user_id: str,
        query_vector: list[float],
        top_k: int,
        sources: list[str] | None = None,
    ) -> list[RetrievedChunk]:
        raise NotImplementedAppError(
            "RAG vector search not implemented yet.",
            details={"user_id": user_id, "top_k": top_k, "sources": sources},
        )
