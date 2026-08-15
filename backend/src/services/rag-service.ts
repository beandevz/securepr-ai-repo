import { settings } from '../core/settings.js';

/** Why a retrieval produced (or failed to produce) policy context. */
export type RagStatus =
  | 'ok'                  // relevant chunks were retrieved
  | 'disabled'            // RAG_ENABLED=false
  | 'no_embedding_model'  // would fall back to non-semantic hash embeddings
  | 'no_documents'        // knowledge base is empty
  | 'no_relevant_docs'    // every hit scored below RAG_MIN_SCORE
  | 'error';              // embedding/search failed

/** A retrieved chunk carrying a server-assigned id the LLM may cite. */
export interface RagChunk {
  /** 'R1', 'R2', … — assigned here so a citation can never name a document we did not retrieve. */
  refId: string;
  source: string;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  score: number;
}

export interface RagContext {
  chunks: RagChunk[];
  /** Pre-formatted block to embed in the review prompt; empty unless status is 'ok'. */
  promptText: string;
  status: RagStatus;
}

function emptyContext(status: RagStatus): RagContext {
  return { chunks: [], promptText: '', status };
}

function formatPromptText(chunks: RagChunk[]): string {
  return chunks
    .map(c => `[source=${c.source} chunk=${c.chunkIndex + 1}/${c.totalChunks} score=${c.score.toFixed(3)}]\n${c.text}`)
    .join('\n\n---\n\n');
}

/** Warn once per process instead of on every file of every PR. */
let warnedLocalEmbeddings = false;

/**
 * RAG retrieval wrapper service.
 *
 * Never throws: every failure mode degrades to an empty context with a status
 * explaining why, so a review is never blocked by the knowledge base.
 */
export class RagService {
  async retrieve(queryText: string): Promise<RagContext> {
    if (!settings.ragEnabled) {
      return emptyContext('disabled');
    }

    const { embedTexts, isEmbeddingConfigured } = await import(
      '../integrations/ai/openai-client.js'
    );

    if (!isEmbeddingConfigured() && !settings.ragAllowLocalEmbeddings) {
      if (!warnedLocalEmbeddings) {
        warnedLocalEmbeddings = true;
        console.warn(
          '[RAG] Retrieval skipped: OPENAI_API_KEY/OPENAI_EMBEDDING_MODEL not set, and hash ' +
          'embeddings are not semantically meaningful. Set RAG_ALLOW_LOCAL_EMBEDDINGS=true to override.'
        );
      }
      return emptyContext('no_embedding_model');
    }

    try {
      const { search } = await import('../rag/store.js');
      const [queryEmb] = await embedTexts([queryText]);
      const hits = await search(queryEmb, settings.ragTopK);

      if (hits.length === 0) {
        return emptyContext('no_documents');
      }

      const relevant = hits.filter(h => h.score >= settings.ragMinScore);
      if (relevant.length === 0) {
        return emptyContext('no_relevant_docs');
      }

      const chunks: RagChunk[] = relevant.map((h, i) => ({
        refId: `R${i + 1}`,
        source: h.source,
        text: h.text,
        chunkIndex: h.chunkIndex,
        totalChunks: h.totalChunks,
        score: h.score,
      }));

      return { chunks, promptText: formatPromptText(chunks), status: 'ok' };
    } catch (err) {
      console.error('[RAG] Retrieval failed, continuing without policy context:', (err as Error).message);
      return emptyContext('error');
    }
  }
}

export interface RagHealth {
  enabled: boolean;
  /** 'openai' = semantic; 'local-hash' = non-semantic override; 'unavailable' = retrieval skipped. */
  embedding: 'openai' | 'local-hash' | 'unavailable' | 'off';
  total_chunks: number;
  total_sources: number;
  top_k: number;
  min_score: number;
}

/**
 * Operator-facing view of whether RAG is actually usable right now.
 */
export async function getRagHealth(): Promise<RagHealth> {
  const base = {
    enabled: settings.ragEnabled,
    total_chunks: 0,
    total_sources: 0,
    top_k: settings.ragTopK,
    min_score: settings.ragMinScore,
  };

  if (!settings.ragEnabled) {
    return { ...base, embedding: 'off' };
  }

  const { isEmbeddingConfigured } = await import('../integrations/ai/openai-client.js');
  const embedding: RagHealth['embedding'] = isEmbeddingConfigured()
    ? 'openai'
    : settings.ragAllowLocalEmbeddings
      ? 'local-hash'
      : 'unavailable';

  try {
    const { getStats } = await import('../rag/store.js');
    const stats = await getStats();
    return {
      ...base,
      embedding,
      total_chunks: stats.total_chunks,
      total_sources: stats.total_sources,
    };
  } catch {
    return { ...base, embedding };
  }
}
