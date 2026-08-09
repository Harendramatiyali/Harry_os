"""Provider stubs — wire OpenAI when AI logic is implemented."""

from app.modules.ai.providers.null_embeddings import NullEmbeddingProvider
from app.modules.ai.providers.null_llm import NullLLMProvider
from app.modules.ai.providers.null_retriever import NullVectorStore
from app.modules.ai.providers.openai_embeddings import OpenAIEmbeddingProvider
from app.modules.ai.providers.openai_llm import OpenAICompatibleLLM
from app.modules.ai.providers.personal_data_stub import StubPersonalDataGateway

__all__ = [
    "NullEmbeddingProvider",
    "NullLLMProvider",
    "NullVectorStore",
    "OpenAICompatibleLLM",
    "OpenAIEmbeddingProvider",
    "StubPersonalDataGateway",
]
