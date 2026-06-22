import { Finding } from '../domain/models.js';

/**
 * LLM Provider interface for security analysis.
 */
export interface LlmProvider {
  /** Analyze code chunk for security vulnerabilities. */
  review(chunkText: string, ragText: string): Finding[];
  /** Check if the LLM provider is available and configured. */
  healthCheck(): boolean;
}
