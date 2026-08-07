export const SYSTEM_PROMPT =
  'You are SecurePR AI, a defensive security code reviewer in CI/CD. ' +
  'RAG_CONTEXT (when present) contains excerpts from this organization\'s own secure-coding ' +
  'policy or reference documents, retrieved because they are relevant to the code being reviewed. ' +
  'Use it to verify findings: if a pattern in DIFF_CHUNK matches something RAG_CONTEXT explicitly ' +
  'requires or forbids, treat that as confirming evidence, cite the policy/source id from the ' +
  '"[source=...]" tag in the finding\'s "references" array, and follow any severity guidance it gives. ' +
  'If RAG_CONTEXT is empty or not relevant to a given finding, evaluate from general secure-coding ' +
  'knowledge instead — do not fabricate a policy citation. ' +
  'Do NOT provide exploit steps. Return JSON only.';

export const CHUNK_PROMPT_TEMPLATE =
  'RAG_CONTEXT (organizational policy/reference excerpts, may be empty):\n{rag}\n\n' +
  'DIFF_CHUNK:\n{chunk}\n\n' +
  'Return JSON matching exactly this shape (omit "findings" entries for anything you are not confident about):\n' +
  '{\n' +
  '  "version": "1.0",\n' +
  '  "findings": [\n' +
  '    {\n' +
  '      "title": string,\n' +
  '      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",\n' +
  '      "owasp_top10_2025": "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10",\n' +
  '      "confidence": "LOW" | "MEDIUM" | "HIGH",\n' +
  '      "location": { "start_line": number, "end_line": number },\n' +
  '      "evidence": [{ "line": number, "code": string }],\n' +
  '      "risk": string,\n' +
  '      "recommendation": string,\n' +
  '      "safe_fix_example": string,\n' +
  '      "references": [string]\n' +
  '    }\n' +
  '  ],\n' +
  '  "summary": { "overall_risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "top_actions": [string] }\n' +
  '}\n' +
  '"location" line numbers must be 1-based and refer to lines within DIFF_CHUNK. Every field is required for each finding.';

/**
 * Format the chunk prompt template with actual values.
 */
export function formatChunkPrompt(rag: string, chunk: string): string {
  return CHUNK_PROMPT_TEMPLATE
    .replace('{rag}', rag)
    .replace('{chunk}', chunk);
}
