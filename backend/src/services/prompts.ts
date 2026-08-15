export const SYSTEM_PROMPT =
  'You are SecurePR AI, a defensive security code reviewer in CI/CD. ' +
  'RAG_CONTEXT (when present) contains excerpts from this organization\'s own secure-coding ' +
  'policy or reference documents, retrieved because they are relevant to the code being reviewed. ' +
  'Each excerpt is labelled with a reference id in the form [R1 | source=... | chunk i/n | relevance x]. ' +
  'Use it to verify findings: if a pattern in DIFF_CHUNK matches something RAG_CONTEXT explicitly ' +
  'requires or forbids, treat that as confirming evidence, list the reference ids you relied on in ' +
  'the finding\'s "policy_refs" array, and follow any severity guidance it gives. ' +
  'Only ids that literally appear in RAG_CONTEXT are valid in "policy_refs" — never invent an id, ' +
  'and never write a document or file name yourself; the reviewer resolves ids to documents. ' +
  'If RAG_CONTEXT is empty or not relevant to a given finding, set "policy_refs" to [] and evaluate ' +
  'from general secure-coding knowledge instead — do not fabricate a policy citation. ' +
  'Use "references" only for public references such as OWASP or CWE identifiers. ' +
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
  '      "policy_refs": [string],\n' +
  '      "references": [string]\n' +
  '    }\n' +
  '  ],\n' +
  '  "summary": { "overall_risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "top_actions": [string] }\n' +
  '}\n' +
  '"location" line numbers must be 1-based and refer to lines within DIFF_CHUNK. ' +
  '"policy_refs" holds only reference ids copied verbatim from RAG_CONTEXT (e.g. "R1"), or [] if none apply. ' +
  'Every field is required for each finding.';

/**
 * Format the chunk prompt template with actual values.
 *
 * Both placeholders are filled in one pass by a replacer function, so document
 * or diff text containing `$&`/`$'` or a literal `{chunk}` cannot corrupt the
 * prompt structure.
 */
export function formatChunkPrompt(rag: string, chunk: string): string {
  const values: Record<string, string> = { '{rag}': rag, '{chunk}': chunk };
  return CHUNK_PROMPT_TEMPLATE.replace(/\{rag\}|\{chunk\}/g, m => values[m]);
}
