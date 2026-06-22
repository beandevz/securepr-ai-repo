import { Finding } from '../../domain/models.js';

/**
 * Interface for security analyzers using Strategy pattern.
 */
export interface SecurityAnalyzer {
  /** Analyze code for security issues. */
  analyze(filePath: string, content: string): Finding[] | Promise<Finding[]>;
  /** Get analyzer name for logging/debugging. */
  getName(): string;
}
