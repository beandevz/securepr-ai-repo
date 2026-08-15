import { Finding, PolicySource } from '../../domain/models.js';
import { SecurityAnalyzer } from './base.js';
import { settings } from '../../core/settings.js';
import { formatChunkPrompt, SYSTEM_PROMPT } from '../prompts.js';
import { RagChunk, RagContext, emptyRagContext, toPolicySource } from '../rag-service.js';

/**
 * LLM-based contextual security analyzer.
 */
export class LlmAnalyzer implements SecurityAnalyzer {
  private ragContext: RagContext;
  private chunksByRef: Map<string, RagChunk>;

  constructor(ragContext: RagContext = emptyRagContext()) {
    this.ragContext = ragContext;
    this.chunksByRef = new Map(ragContext.chunks.map(c => [c.refId, c]));
  }

  /**
   * Resolve the reference ids a finding claims to rely on back to retrieved
   * chunks. Ids that were not in this prompt's RAG_CONTEXT are dropped: the
   * model cannot cite a document we did not actually retrieve.
   */
  private resolvePolicySources(raw: unknown): PolicySource[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    const sources: PolicySource[] = [];
    const seen = new Set<string>();

    for (const ref of raw) {
      if (typeof ref !== 'string') continue;
      const refId = ref.trim();
      const chunk = this.chunksByRef.get(refId);
      if (!chunk) {
        console.warn(`[LlmAnalyzer] Dropping unknown policy ref "${refId}" from LLM response`);
        continue;
      }
      if (seen.has(refId)) continue;
      seen.add(refId);
      sources.push(toPolicySource(chunk));
    }

    return sources;
  }

  async analyze(filePath: string, content: string): Promise<Finding[]> {
    const provider = settings.llmProvider.toLowerCase();
    if (provider !== 'openai' && provider !== 'azure_openai') {
      return [];
    }

    try {
      const { chatCompletionJson } = await import('../../integrations/ai/openai-client.js');
      const prompt = formatChunkPrompt(this.ragContext.promptText, content);
      const data = await chatCompletionJson(SYSTEM_PROMPT, prompt);

      const findings: Finding[] = [];
      const rawFindings = (data.findings as Record<string, unknown>[]) || [];

      for (const item of rawFindings) {
        const location = item.location as Partial<Finding['location']> | undefined;
        const startLine = Number(location?.start_line);
        if (
          typeof item.title !== 'string' || !item.title ||
          typeof item.severity !== 'string' ||
          !location || !Number.isFinite(startLine)
        ) {
          console.warn('[LlmAnalyzer] Skipping malformed finding from LLM response:', item);
          continue;
        }

        const finding: Finding = {
          title: item.title as string,
          severity: item.severity as Finding['severity'],
          owasp_top10_2025: item.owasp_top10_2025 as Finding['owasp_top10_2025'],
          confidence: (item.confidence as Finding['confidence']) || 'MEDIUM',
          file_path: filePath, // Ensure file path is set
          location: {
            start_line: startLine,
            end_line: Number.isFinite(Number(location.end_line)) ? Number(location.end_line) : startLine,
          },
          evidence: Array.isArray(item.evidence) ? (item.evidence as Finding['evidence']) : [],
          risk: (item.risk as string) || '',
          recommendation: (item.recommendation as string) || '',
          safe_fix_example: (item.safe_fix_example as string) || '',
          references: (item.references as string[]) || [],
          policy_sources: this.resolvePolicySources(item.policy_refs),
        };
        findings.push(finding);
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
