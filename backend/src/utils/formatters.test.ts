import { describe, it, expect } from 'vitest';
import { collectCitedSources, formatInlineComment, formatSummary } from './formatters.js';
import type { Finding, PolicySource } from '../domain/models.js';

function policySource(overrides: Partial<PolicySource> = {}): PolicySource {
  return {
    source: 'secure-coding.pdf',
    chunk_index: 2,
    total_chunks: 12,
    score: 0.7123,
    excerpt: 'All database access MUST use parameterized queries.',
    ...overrides,
  };
}

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    title: 'SQL injection',
    severity: 'HIGH',
    owasp_top10_2025: 'A03',
    confidence: 'HIGH',
    file_path: 'src/db.ts',
    location: { start_line: 4, end_line: 6 },
    evidence: [],
    risk: 'Untrusted input concatenated into a query',
    recommendation: 'Use parameterized queries',
    ...overrides,
  };
}

describe('formatInlineComment', () => {
  it('names the document, chunk and relevance behind a finding', () => {
    const body = formatInlineComment(finding({ policy_sources: [policySource()] }));

    expect(body).toContain('> 📚 **Policy source:** `secure-coding.pdf` — chunk 3/12 · relevance 0.71');
    expect(body).toContain('> "All database access MUST use parameterized queries."');
  });

  it('lists every cited document', () => {
    const body = formatInlineComment(
      finding({
        policy_sources: [
          policySource(),
          policySource({ source: 'api-guidelines.md', chunk_index: 0, total_chunks: 3 }),
        ],
      })
    );

    expect(body).toContain('`secure-coding.pdf`');
    expect(body).toContain('`api-guidelines.md` — chunk 1/3');
  });

  it('says so explicitly when no internal policy matched', () => {
    const body = formatInlineComment(finding({ policy_sources: [] }));

    expect(body).toContain('_No matching internal policy — assessed from general secure-coding knowledge._');
    expect(body).not.toContain('Policy source');
  });

  it('treats a finding without the field as uncited', () => {
    expect(formatInlineComment(finding())).toContain('_No matching internal policy');
  });
});

describe('formatSummary', () => {
  it('lists the cited documents when the knowledge base contributed', () => {
    const summary = formatSummary('HIGH', 3, true, 'HIGH', {
      status: 'ok',
      citedSources: ['secure-coding.pdf', 'api-guidelines.md'],
    });

    expect(summary).toContain('Knowledge base: **2 document(s) cited** (secure-coding.pdf, api-guidelines.md)');
  });

  it('distinguishes retrieved-but-uncited from unavailable', () => {
    expect(formatSummary('LOW', 0, false, 'HIGH', { status: 'ok', citedSources: [] }))
      .toContain('policy context retrieved, but no finding cited it');
    expect(formatSummary('LOW', 0, false, 'HIGH', { status: 'no_relevant_docs', citedSources: [] }))
      .toContain('Knowledge base: no relevant documents matched');
    expect(formatSummary('LOW', 0, false, 'HIGH', { status: 'no_embedding_model', citedSources: [] }))
      .toContain('unavailable (no embedding model configured)');
    expect(formatSummary('LOW', 0, false, 'HIGH', { status: 'disabled', citedSources: [] }))
      .toContain('Knowledge base: RAG disabled');
  });

  it('omits the knowledge base line when no retrieval ran', () => {
    expect(formatSummary('LOW', 0, false, 'HIGH')).not.toContain('Knowledge base');
  });
});

describe('collectCitedSources', () => {
  it('returns distinct document names in first-seen order', () => {
    const sources = collectCitedSources([
      finding({ policy_sources: [policySource()] }),
      finding({ policy_sources: [policySource({ source: 'api-guidelines.md' }), policySource()] }),
      finding(),
    ]);

    expect(sources).toEqual(['secure-coding.pdf', 'api-guidelines.md']);
  });
});
