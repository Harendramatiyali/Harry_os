"""AI FastAPI dependencies — wires ports (OpenAI stubs / nulls)."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.modules.ai.providers.null_embeddings import NullEmbeddingProvider
from app.modules.ai.providers.null_llm import NullLLMProvider
from app.modules.ai.providers.null_retriever import NullVectorStore
from app.modules.ai.providers.openai_embeddings import OpenAIEmbeddingProvider
from app.modules.ai.providers.openai_llm import OpenAICompatibleLLM
from app.modules.ai.providers.personal_data_stub import StubPersonalDataGateway
from app.modules.ai.repository import (
    ConversationRepository,
    EmbeddingChunkRepository,
    MemoryRepository,
    MessageRepository,
)
from app.modules.ai.service import AiService


def get_ai_service(session: DbSessionDep, settings: Annotated[Settings, Depends(get_settings)]) -> AiService:
    # Prefer named OpenAI adapter classes even while methods raise NotImplemented —
    # swap Null → live implementation inside the same class later.
    if settings.ai_enabled and settings.llm_api_key:
        llm = OpenAICompatibleLLM(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            default_model=settings.llm_model,
        )
        embeddings = OpenAIEmbeddingProvider(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            default_model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )
    else:
        llm = NullLLMProvider()
        embeddings = NullEmbeddingProvider()

    return AiService(
        settings=settings,
        conversations=ConversationRepository(session),
        messages=MessageRepository(session),
        memory=MemoryRepository(session),
        chunks=EmbeddingChunkRepository(session),
        llm=llm,
        embeddings=embeddings,
        vector_store=NullVectorStore(),
        personal_data=StubPersonalDataGateway(),
    )


AiServiceDep = Annotated[AiService, Depends(get_ai_service)]
