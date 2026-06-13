"""RAG Provider Protocol for knowledge base retrieval."""
from typing import Protocol, List, Tuple


class RagProvider(Protocol):
    """Protocol for RAG/vector store providers."""

    def retrieve(self, query_text: str, top_k: int = 4) -> str:
        """
        Retrieve relevant context from knowledge base.

        Args:
            query_text: Query text (code snippet, file path, etc.)
            top_k: Number of results to return

        Returns:
            Formatted string with retrieved context
        """
        ...

    def ingest_document(self, source: str, text: str, metadata: dict) -> None:
        """
        Ingest a document into the knowledge base.

        Args:
            source: Source identifier (filename, URL, etc.)
            text: Document text content
            metadata: Additional metadata
        """
        ...

    def search_raw(self, query_text: str, top_k: int = 4) -> List[Tuple[str, str, float]]:
        """
        Search knowledge base and return raw results.

        Args:
            query_text: Query text
            top_k: Number of results

        Returns:
            List of (source, text, score) tuples
        """
        ...

    def is_enabled(self) -> bool:
        """
        Check if RAG is enabled and configured.

        Returns:
            True if RAG is enabled, False otherwise
        """
        ...
