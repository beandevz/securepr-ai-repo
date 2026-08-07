import { settings } from '../../core/settings.js';
import crypto from 'crypto';

function isOpenAIConfigured(): boolean {
  return !!settings.openaiApiKey;
}

async function getClient() {
  const { OpenAI } = await import('openai');
  if (!settings.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: settings.openaiApiKey,
    ...(settings.openaiBaseUrl && { baseURL: settings.openaiBaseUrl }),
  });
}

/**
 * Chat completion that returns the raw string response.
 * Used by RAG answer generation where we want natural language, not JSON.
 */
export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = await getClient();
  if (!settings.openaiModel) {
    throw new Error('OPENAI_MODEL not set');
  }
  const resp = await client.chat.completions.create({
    model: settings.openaiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: settings.llmTemperature,
  });
  return (resp.choices[0]?.message?.content || '').trim();
}

/**
 * Chat completion that returns parsed JSON.
 */
export async function chatCompletionJson(
  systemPrompt: string,
  userPrompt: string
): Promise<Record<string, unknown>> {
  const client = await getClient();
  if (!settings.openaiModel) {
    throw new Error('OPENAI_MODEL not set');
  }
  const resp = await client.chat.completions.create({
    model: settings.openaiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: settings.llmTemperature,
  });
  let content = (resp.choices[0]?.message?.content || '').trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```json?\n?/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(content);
}

/**
 * Generate a deterministic local embedding from text using SHA-256.
 * Produces a 256-dimensional unit vector. Not semantically meaningful,
 * but allows the full RAG pipeline to run without OpenAI.
 */
function localEmbed(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vec: number[] = [];
  for (let i = 0; i < hash.length; i++) {
    // Map byte [0,255] -> [-1,1]
    vec.push((hash[i] / 127.5) - 1);
  }
  // normalize to unit vector
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }
  return vec;
}

/**
 * Generate embeddings for texts.
 * Falls back to a local hash-based embedding when OpenAI is not configured.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!isOpenAIConfigured() || !settings.openaiEmbeddingModel) {
    console.log(`[RAG] Using local hash embeddings for ${texts.length} text(s)`);
    return texts.map(t => localEmbed(t));
  }

  const client = await getClient();
  const r = await client.embeddings.create({
    model: settings.openaiEmbeddingModel,
    input: texts,
  });
  return r.data.map(d => d.embedding);
}
