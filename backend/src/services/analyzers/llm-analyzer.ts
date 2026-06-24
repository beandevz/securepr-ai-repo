import { Finding } from '../../domain/models.js';
import { SecurityAnalyzer } from './base.js';
import { settings } from '../../core/settings.js';
import { formatChunkPrompt, SYSTEM_PROMPT } from '../prompts.js';

/**
 * LLM-based contextual security analyzer.
 */
export class LlmAnalyzer implements SecurityAnalyzer {
  private ragContext: string;

  constructor(ragContext: string = '') {
    this.ragContext = ragContext;
  }

  async analyze(filePath: string, content: string): Promise<Finding[]> {
    if (settings.llmProvider.toLowerCase() !== 'azure_openai') {
      return [];
    }

    try {
      const { chatCompletionJson } = await import('../../integrations/ai/openai-client.js');
      const prompt = formatChunkPrompt(this.ragContext, content);
      const data = await chatCompletionJson(SYSTEM_PROMPT, prompt);

      const findings: Finding[] = [];
      const rawFindings = (data.findings as Record<string, unknown>[]) || [];

      for (const item of rawFindings) {
        try {
          const finding: Finding = {
            title: item.title as string,
            severity: item.severity as Finding['severity'],
            owasp_top10_2025: item.owasp_top10_2025 as Finding['owasp_top10_2025'],
            confidence: item.confidence as Finding['confidence'],
            file_path: filePath, // Ensure file path is set
            location: item.location as Finding['location'],
            evidence: item.evidence as Finding['evidence'],
            risk: item.risk as string,
            recommendation: item.recommendation as string,
            safe_fix_example: (item.safe_fix_example as string) || '',
            references: (item.references as string[]) || [],
          };
          findings.push(finding);
        } catch {
          continue;
        }
      }

      return findings;
    } catch {
      return [];
    }
  }

  getName(): string {
    return 'LlmAnalyzer';
  }
}
