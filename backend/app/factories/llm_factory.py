"""Factory for creating LLM provider instances."""
from typing import Optional
from app.core.config import settings
from app.interfaces.llm_provider import LlmProvider


class NullLlmProvider:
    """Null object pattern for when LLM is disabled."""

    def review(self, chunk_text: str, rag_text: str) -> list:
        return []

    def health_check(self) -> bool:
        return True


class AzureOpenAIProvider:
    """Azure OpenAI implementation of LLM provider."""

    def __init__(self):
        from app.integrations.ai.azure_openai_client import chat_completion_json
        from app.services.prompts import SYSTEM_PROMPT, CHUNK_PROMPT_TEMPLATE
        from pydantic import ValidationError
        from app.domain.schemas import Finding

        self._chat_completion_json = chat_completion_json
        self._system_prompt = SYSTEM_PROMPT
        self._chunk_prompt_template = CHUNK_PROMPT_TEMPLATE
        self._ValidationError = ValidationError
        self._Finding = Finding

    def review(self, chunk_text: str, rag_text: str) -> list:
        prompt = self._chunk_prompt_template.format(rag=rag_text, chunk=chunk_text)

        try:
            data = self._chat_completion_json(self._system_prompt, prompt)
        except Exception:
            return []

        findings = []
        for item in (data.get('findings') or []):
            try:
                findings.append(self._Finding.model_validate(item))
            except self._ValidationError:
                continue

        return findings

    def health_check(self) -> bool:
        return bool(
            settings.azure_openai_endpoint
            and settings.azure_openai_key
            and settings.azure_openai_deployment
        )


_llm_instance: Optional[LlmProvider] = None


def create_llm_provider() -> LlmProvider:
    """
    Factory method to create LLM provider based on configuration.

    Returns:
        LLM provider instance (singleton)
    """
    global _llm_instance

    if _llm_instance is not None:
        return _llm_instance

    provider = settings.llm_provider.lower()

    if provider == 'azure_openai':
        _llm_instance = AzureOpenAIProvider()
    elif provider == 'none' or not provider:
        _llm_instance = NullLlmProvider()
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")

    return _llm_instance


def reset_llm_provider() -> None:
    """Reset singleton instance (useful for testing)."""
    global _llm_instance
    _llm_instance = None
