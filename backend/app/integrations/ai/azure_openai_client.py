import json
from typing import Any, Dict, List

from openai import AzureOpenAI
from app.core.config import settings


def _client() -> AzureOpenAI:
    if not settings.azure_openai_endpoint or not settings.azure_openai_key:
        raise ValueError('Azure OpenAI endpoint/key not configured')
    return AzureOpenAI(azure_endpoint=settings.azure_openai_endpoint, api_key=settings.azure_openai_key, api_version=settings.azure_openai_api_version)


def chat_completion_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    c = _client()
    if not settings.azure_openai_deployment:
        raise ValueError('AZURE_OPENAI_DEPLOYMENT not set')
    resp = c.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[{'role':'system','content':system_prompt},{'role':'user','content':user_prompt}],
        temperature=settings.llm_temperature,
    )
    content = (resp.choices[0].message.content or '').strip()
    if content.startswith('```'):
        content = content.strip('`').replace('json', '')
    return json.loads(content)


def embed_texts(texts: List[str]) -> List[List[float]]:
    c = _client()
    if not settings.azure_openai_embedding_deployment:
        raise ValueError('AZURE_OPENAI_EMBEDDING_DEPLOYMENT not set')
    r = c.embeddings.create(model=settings.azure_openai_embedding_deployment, input=texts)
    return [d.embedding for d in r.data]
