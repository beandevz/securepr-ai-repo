import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settings } from '../../core/settings.js';
import { LlmAnalyzer } from './llm-analyzer.js';
import type { RagChunk, RagContext } from '../rag-service.js';

const chatCompletionJson = vi.fn(async (): Promise<Record<string, unknown>> => ({ findings: [] }));

vi.mock('../../integrations/ai/openai-client.js', () => ({
  chatCompletionJson: (system: string, user: string) => chatCompletionJson(system, user),
}));

function chunk(refId: string, source: string): RagChunk {
  return {
    refId,
    source,
    text: `  Policy from ${source}:\n  All database access MUST use parameterized queries.  `,
    chunkIndex: 2,
    totalChunks: 12,
    score: 0.71,
  };
}

function ragContext(...chunks: RagChunk[]): RagContext {
  return { chunks, promptText: chunks.map(c => c.refId).join('\n'), status: 'ok' };
}

function llmFinding(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'SQL injection',
    severity: 'HIGH',
    owasp_top10_2025: 'A03',
    confidence: 'HIGH',
    location: { start_line: 4, end_line: 6 },
    evidence: [],
    risk: 'Untrusted input concatenated into a query',
    recommendation: 'Use parameterized queries',
    ...extra,
  };
}

describe('LlmAnalyzer policy citations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settings.llmProvider = 'openai';
  });

  it('resolves policy refs to the retrieved documents', async () => {
    chatCompletionJson.mockResolvedValue({ findings: [llmFinding({ policy_refs: ['R1'] })] });
    const analyzer = new LlmAnalyzer(ragContext(chunk('R1', 'secure-coding.pdf')));

    const [finding] = await analyzer.analyze('src/db.ts', 'diff');

    expect(finding.policy_sources).toEqual([
      {
        source: 'secure-coding.pdf',
        chunk_index: 2,
        total_chunks: 12,
        score: 0.71,
        excerpt: 'Policy from secure-coding.pdf: All database access MUST use parameterized queries.',
      },
    ]);
  });

  it('drops refs that were not in this prompt\'s context', async () => {
    chatCompletionJson.mockResolvedValue({
      findings: [llmFinding({ policy_refs: ['R1', 'R9', 'company-policy.pdf'] })],
    });
    const analyzer = new LlmAnalyzer(ragContext(chunk('R1', 'secure-coding.pdf')));

    const [finding] = await analyzer.analyze('src/db.ts', 'diff');

    expect(finding.policy_sources?.map(s => s.source)).toEqual(['secure-coding.pdf']);
  });

  it('deduplicates repeated refs', async () => {
    chatCompletionJson.mockResolvedValue({ findings: [llmFinding({ policy_refs: ['R1', 'R1'] })] });
    const analyzer = new LlmAnalyzer(ragContext(chunk('R1', 'secure-coding.pdf')));

    const [finding] = await analyzer.analyze('src/db.ts', 'diff');

    expect(finding.policy_sources).toHaveLength(1);
  });

  it('yields no citation when policy_refs is missing, empty or malformed', async () => {
    const analyzer = new LlmAnalyzer(ragContext(chunk('R1', 'secure-coding.pdf')));

    for (const refs of [undefined, [], 'R1', 42]) {
      chatCompletionJson.mockResolvedValue({
        findings: [llmFinding(refs === undefined ? {} : { policy_refs: refs })],
      });
      const [finding] = await analyzer.analyze('src/db.ts', 'diff');
      expect(finding.policy_sources).toEqual([]);
    }
  });

  it('cites nothing when no policy context was retrieved', async () => {
    chatCompletionJson.mockResolvedValue({ findings: [llmFinding({ policy_refs: ['R1'] })] });
    const analyzer = new LlmAnalyzer();

    const [finding] = await analyzer.analyze('src/db.ts', 'diff');

    expect(finding.policy_sources).toEqual([]);
  });

  it('sends the RAG prompt text to the model', async () => {
    chatCompletionJson.mockResolvedValue({ findings: [] });
    const analyzer = new LlmAnalyzer(ragContext(chunk('R1', 'secure-coding.pdf')));

    await analyzer.analyze('src/db.ts', 'const q = "SELECT " + name;');

    const [, userPrompt] = chatCompletionJson.mock.calls[0] as unknown as [string, string];
    expect(userPrompt).toContain('R1');
    expect(userPrompt).toContain('const q = "SELECT " + name;');
  });
});
