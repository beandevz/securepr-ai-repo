import { SecurityAnalyzer } from './base.js';
import { RuleBasedAnalyzer } from './rule-analyzer.js';
import { LlmAnalyzer } from './llm-analyzer.js';
import { settings } from '../../core/settings.js';
import { RagContext, emptyRagContext } from '../rag-service.js';

/**
 * Create list of active analyzers based on configuration.
 */
export function createAnalyzers(ragContext: RagContext = emptyRagContext()): SecurityAnalyzer[] {
  const analyzers: SecurityAnalyzer[] = [];

  // Always include rule-based analyzer (fast, deterministic)
  analyzers.push(new RuleBasedAnalyzer());

  // Add LLM analyzer if enabled
  const provider = settings.llmProvider.toLowerCase();
  if (provider === 'azure_openai' || provider === 'openai') {
    analyzers.push(new LlmAnalyzer(ragContext));
  }

  return analyzers;
}
