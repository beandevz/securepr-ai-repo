"""LLM-based contextual analyzer."""
from typing import List
from pydantic import ValidationError
from app.core.config import settings
from app.domain.schemas import Finding


class LlmAnalyzer:
    """LLM-based contextual security analyzer."""

    def __init__(self, rag_context: str = ""):
        """
        Initialize LLM analyzer.

        Args:
            rag_context: Optional RAG-retrieved context
        """
        self.rag_context = rag_context

    def analyze(self, file_path: str, content: str) -> List[Finding]:
        """Analyze code using LLM."""
        if settings.llm_provider.lower() != 'azure_openai':
            return []

        from app.integrations.ai.azure_openai_client import chat_completion_json
        from app.services.prompts import SYSTEM_PROMPT, CHUNK_PROMPT_TEMPLATE

        prompt = CHUNK_PROMPT_TEMPLATE.format(rag=self.rag_context, chunk=content)

        try:
            data = chat_completion_json(SYSTEM_PROMPT, prompt)
        except Exception:
            return []

        findings: List[Finding] = []
        for item in (data.get('findings') or []):
            try:
                finding = Finding.model_validate(item)
                finding.file_path = file_path  # Ensure file path is set
                findings.append(finding)
            except ValidationError:
                continue

        return findings

    def get_name(self) -> str:
        return "LlmAnalyzer"
