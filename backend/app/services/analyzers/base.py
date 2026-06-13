"""Base analyzer protocol."""
from typing import Protocol, List
from app.domain.schemas import Finding


class SecurityAnalyzer(Protocol):
    """Protocol for security analyzers using Strategy pattern."""

    def analyze(self, file_path: str, content: str) -> List[Finding]:
        """
        Analyze code for security issues.

        Args:
            file_path: Path to file being analyzed
            content: Code content or diff patch

        Returns:
            List of security findings
        """
        ...

    def get_name(self) -> str:
        """Get analyzer name for logging/debugging."""
        ...
