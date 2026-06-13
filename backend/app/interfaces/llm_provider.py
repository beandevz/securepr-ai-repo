"""LLM Provider Protocol for security analysis."""
from typing import Protocol, List
from app.domain.schemas import Finding


class LlmProvider(Protocol):
    """Protocol for LLM providers that perform security analysis."""

    def review(self, chunk_text: str, rag_text: str) -> List[Finding]:
        """
        Analyze code chunk for security vulnerabilities.

        Args:
            chunk_text: Code diff or patch to analyze
            rag_text: Retrieved context from RAG knowledge base

        Returns:
            List of security findings
        """
        ...

    def health_check(self) -> bool:
        """
        Check if the LLM provider is available and configured.

        Returns:
            True if provider is healthy, False otherwise
        """
        ...
