"""Factory for creating analyzer strategies."""
from typing import List
from app.services.analyzers.base import SecurityAnalyzer
from app.services.analyzers.rule_analyzer import RuleBasedAnalyzer
from app.services.analyzers.llm_analyzer import LlmAnalyzer
from app.core.config import settings


def create_analyzers(rag_context: str = "") -> List[SecurityAnalyzer]:
    """
    Create list of active analyzers based on configuration.

    Args:
        rag_context: Optional RAG context for LLM analyzer

    Returns:
        List of analyzer instances
    """
    analyzers: List[SecurityAnalyzer] = []

    # Always include rule-based analyzer (fast, deterministic)
    analyzers.append(RuleBasedAnalyzer())

    # Add LLM analyzer if enabled
    if settings.llm_provider.lower() in ('azure_openai', 'openai'):
        analyzers.append(LlmAnalyzer(rag_context=rag_context))

    return analyzers
