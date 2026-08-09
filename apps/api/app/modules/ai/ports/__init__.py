"""AI provider ports (interfaces). Implementations live under providers/."""

from app.modules.ai.ports.embeddings import EmbeddingProvider, EmbeddingResult
from app.modules.ai.ports.llm import ChatCompletionRequest, ChatCompletionResult, LLMProvider, LLMMessage
from app.modules.ai.ports.memory import MemoryPort
from app.modules.ai.ports.personal_data import PersonalDataGateway, PersonalSnippet
from app.modules.ai.ports.retriever import RetrievedChunk, VectorStore

__all__ = [
    "ChatCompletionRequest",
    "ChatCompletionResult",
    "EmbeddingProvider",
    "EmbeddingResult",
    "LLMMessage",
    "LLMProvider",
    "MemoryPort",
    "PersonalDataGateway",
    "PersonalSnippet",
    "RetrievedChunk",
    "VectorStore",
]
