from typing import List
from pydantic import ValidationError

from app.core.config import settings
from app.domain.schemas import Finding
from app.services.prompts import SYSTEM_PROMPT, CHUNK_PROMPT_TEMPLATE

class LlmService:
    def review(self, chunk_text: str, rag_text: str) -> List[Finding]:
        if settings.llm_provider.lower() != 'azure_openai':
            return []
        from app.integrations.ai.azure_openai_client import chat_completion_json
        prompt = CHUNK_PROMPT_TEMPLATE.format(rag=rag_text, chunk=chunk_text)
        data = chat_completion_json(SYSTEM_PROMPT, prompt)
        out: List[Finding] = []
        for item in (data.get('findings') or []):
            try:
                out.append(Finding.model_validate(item))
            except ValidationError:
                continue
        return out
