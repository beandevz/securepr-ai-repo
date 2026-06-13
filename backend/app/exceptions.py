"""Custom exception hierarchy for SecurePR AI."""


class SecurePRError(Exception):
    """Base exception for all SecurePR AI errors."""

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ConfigurationError(SecurePRError):
    """Raised when configuration is invalid or missing."""
    pass


class LlmProviderError(SecurePRError):
    """Raised when LLM provider operation fails."""
    pass


class VCSIntegrationError(SecurePRError):
    """Raised when VCS (GitHub, GitLab, etc.) integration fails."""
    pass


class QueueError(SecurePRError):
    """Raised when queue operations fail."""
    pass


class RagError(SecurePRError):
    """Raised when RAG/vector store operations fail."""
    pass


class PipelineError(SecurePRError):
    """Raised when security analysis pipeline fails."""
    pass


class ValidationError(SecurePRError):
    """Raised when input validation fails."""
    pass


class WebhookError(SecurePRError):
    """Raised when webhook processing fails."""
    pass
