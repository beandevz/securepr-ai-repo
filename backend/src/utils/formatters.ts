import { Finding, PolicySource } from '../domain/models.js';
import { RagStatus } from '../services/rag-service.js';

/** Render one citation as a blockquote naming the document it came from. */
function formatPolicySource(src: PolicySource): string {
  const location = `chunk ${src.chunk_index + 1}/${src.total_chunks}`;
  const relevance = `relevance ${src.score.toFixed(2)}`;
  const header = `> 📚 **Policy source:** \`${src.source}\` — ${location} · ${relevance}`;
  return src.excerpt ? `${header}\n> "${src.excerpt}"` : header;
}

/**
 * Format a finding as an inline PR comment body.
 *
 * Every comment states its grounding: either the internal document(s) that back
 * it, or an explicit note that no internal policy matched.
 */
export function formatInlineComment(finding: Finding): string {
  const severity = finding.severity || 'MEDIUM';
  const owasp = finding.owasp_top10_2025 || 'N/A';
  const title = finding.title || 'Security Issue';
  const risk = finding.risk || 'Unknown risk';
  const recommendation = finding.recommendation || 'Review and fix';

  const sources = finding.policy_sources || [];
  const grounding = sources.length > 0
    ? sources.map(formatPolicySource).join('\n>\n')
    : '_No matching internal policy — assessed from general secure-coding knowledge._';

  return (
    `**${severity}** \`${owasp}\` ${title}\n\n` +
    `**Risk:** ${risk}\n\n` +
    `**Recommendation:** ${recommendation}\n\n` +
    `${grounding}`
  );
}

/** One-line explanation of what the knowledge base contributed to this review. */
function formatKnowledgeBaseLine(ragStatus: RagStatus, citedSources: string[]): string {
  if (ragStatus === 'ok') {
    return citedSources.length > 0
      ? `Knowledge base: **${citedSources.length} document(s) cited** (${citedSources.join(', ')})\n`
      : 'Knowledge base: policy context retrieved, but no finding cited it\n';
  }

  const reasons: Record<Exclude<RagStatus, 'ok'>, string> = {
    disabled: 'RAG disabled',
    no_embedding_model: 'unavailable (no embedding model configured)',
    no_documents: 'empty (no documents ingested)',
    no_relevant_docs: 'no relevant documents matched',
    error: 'retrieval failed',
  };

  return `Knowledge base: ${reasons[ragStatus]}\n`;
}

/**
 * Format a summary comment for PR review.
 */
export function formatSummary(
  overall: string,
  count: number,
  shouldFail: boolean,
  threshold: string,
  rag?: { status: RagStatus; citedSources: string[] }
): string {
  const gateStatus = shouldFail ? 'FAIL' : 'PASS';

  return (
    '## SecurePR AI Review\n\n' +
    `Overall: **${overall}**\n` +
    `Findings: **${count}**\n` +
    `Merge gate: **${gateStatus}** ` +
    `(threshold=${threshold})\n` +
    (rag ? formatKnowledgeBaseLine(rag.status, rag.citedSources) : '')
  );
}

/** Distinct document names cited across findings, in first-seen order. */
export function collectCitedSources(findings: Finding[]): string[] {
  const seen = new Set<string>();
  for (const finding of findings) {
    for (const src of finding.policy_sources || []) {
      seen.add(src.source);
    }
  }
  return [...seen];
}
