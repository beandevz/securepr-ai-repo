export const SYSTEM_PROMPT =
  'You are SecurePR AI, a defensive security code reviewer in CI/CD. ' +
  'Do NOT provide exploit steps. Return JSON only.';

export const CHUNK_PROMPT_TEMPLATE =
  'RAG_CONTEXT:\n{rag}\n\n' +
  'DIFF_CHUNK:\n{chunk}\n\n' +
  'Return JSON: {"version":"1.0", "findings":[...], ' +
  '"summary":{"overall_risk":"LOW|MEDIUM|HIGH|CRITICAL", "top_actions":[...]}}';

/**
 * Format the chunk prompt template with actual values.
 */
export function formatChunkPrompt(rag: string, chunk: string): string {
  return CHUNK_PROMPT_TEMPLATE
    .replace('{rag}', rag)
    .replace('{chunk}', chunk);
}
