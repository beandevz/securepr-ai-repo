/**
 * RAG + LLM answer generation.
 * Retrieves relevant chunks from the vector store, then uses LLM to generate
 * a natural language answer grounded in the retrieved context.
 */

import { settings } from '../core/settings.js';
import { search } from './store.js';

interface AskResult {
  answer: string;
  sources: Array<{ source: string; score: number; text: string }>;
  llm_used: boolean;
}

const RAG_SYSTEM_PROMPT =
  `You are SecurePR AI, a security knowledge assistant. ` +
  `Answer the user's question using ONLY the provided context from the knowledge base. ` +
  `If the context does not contain enough information, say so clearly. ` +
  `Be concise, accurate, and cite which source documents you used. ` +
  `Format your answer in clear paragraphs. Do not invent information.`;

function buildContextPrompt(
  question: string,
  chunks: Array<{ source: string; text: string; score: number }>
): string {
  const contextBlock = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.source} (relevance: ${(c.score * 100).toFixed(1)}%)]\n${c.text}`)
    .join('\n\n---\n\n');

  return (
    `KNOWLEDGE BASE CONTEXT:\n` +
    `${contextBlock}\n\n` +
    `---\n\n` +
    `USER QUESTION: ${question}\n\n` +
    `Answer the question based on the context above. Cite which sources you used.`
  );
}

/**
 * Full RAG pipeline: embed query → retrieve chunks → generate LLM answer.
 */
export async function askWithRag(question: string, topK?: number): Promise<AskResult> {
  const k = topK || settings.ragTopK;

  // Step 1: Embed the question and retrieve relevant chunks
  const { embedTexts } = await import('../integrations/ai/openai-client.js');
  const [queryEmb] = await embedTexts([question]);
  const hits = await search(queryEmb, k);

  const sources = hits.map(([source, text, score]) => ({ source, text, score }));

  // If no chunks found, return early
  if (sources.length === 0) {
    return {
      answer: 'No relevant documents found in the knowledge base. Please ingest some documents first.',
      sources: [],
      llm_used: false,
    };
  }

  // Step 2: Try to generate an LLM answer
  try {
    const { chatCompletion } = await import('../integrations/ai/openai-client.js');
    const userPrompt = buildContextPrompt(question, sources);
    const answer = await chatCompletion(RAG_SYSTEM_PROMPT, userPrompt);

    return {
      answer,
      sources,
      llm_used: true,
    };
  } catch (err) {
    // LLM not available — return raw chunks as a formatted answer
    console.log(`[RAG] LLM not available, returning raw chunks: ${(err as Error).message}`);

    const fallbackAnswer = sources
      .map((s, i) => `**[${i + 1}] ${s.source}** (score: ${(s.score * 100).toFixed(1)}%)\n${s.text}`)
      .join('\n\n---\n\n');

    return {
      answer: `*LLM not configured — showing raw retrieved chunks:*\n\n${fallbackAnswer}`,
      sources,
      llm_used: false,
    };
  }
}
