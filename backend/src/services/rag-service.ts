import { settings } from '../core/settings.js';
import { PolicySource } from '../domain/models.js';
import type { RagHit } from '../rag/store.js';

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

/** Longest excerpt quoted back in a PR comment. */
const EXCERPT_MAX_CHARS = 200;

export function emptyRagContext(status: RagStatus = 'disabled'): RagContext {
  return { chunks: [], promptText: '', status };
}

function formatPromptText(chunks: RagChunk[]): string {
  return chunks
    .map(c =>
      `[${c.refId} | source=${c.source} | chunk ${c.chunkIndex + 1}/${c.totalChunks} | ` +
      `relevance ${c.score.toFixed(3)}]\n${c.text}`
    )
    .join('\n\n---\n\n');
}

/**
 * Turn a retrieved chunk into a citation. The excerpt is taken from the stored
 * chunk rather than from the model, so quoted policy text is always verbatim.
 */
export function toPolicySource(chunk: RagChunk): PolicySource {
  const collapsed = chunk.text.replace(/\s+/g, ' ').trim();
  const excerpt = collapsed.length > EXCERPT_MAX_CHARS
    ? `${collapsed.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…`
    : collapsed;

  return {
    source: chunk.source,
    chunk_index: chunk.chunkIndex,
    total_chunks: chunk.totalChunks,
    score: chunk.score,
    excerpt,
  };
}

/**
 * Collapse per-file retrieval outcomes into one status for the PR summary:
 * a single successful retrieval means the knowledge base contributed.
 */
export function summarizeRagStatuses(statuses: RagStatus[]): RagStatus | undefined {
  if (statuses.length === 0) return undefined;
  return statuses.includes('ok') ? 'ok' : statuses[0];
}

/**
 * Merge per-query hit lists into one ranked list, keeping a chunk's best score
 * so a chunk matched by several hunks is not counted (or cited) twice.
 */
function mergeHits(hitLists: RagHit[][], topK: number): RagHit[] {
  const best = new Map<string, RagHit>();

  for (const hits of hitLists) {
    for (const hit of hits) {
      const key = `${hit.source}#${hit.chunkIndex}`;
      const existing = best.get(key);
      if (!existing || hit.score > existing.score) {
        best.set(key, hit);
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(topK, 1));
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
  /**
   * @param queryText One query, or several (e.g. one per diff hunk) whose hits
   *                  are merged: a chunk retrieved by more than one query keeps
   *                  its best score.
   */
  async retrieve(queryText: string | string[]): Promise<RagContext> {
    if (!settings.ragEnabled) {
      return emptyRagContext('disabled');
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
      return emptyRagContext('no_embedding_model');
    }

    const queries = (Array.isArray(queryText) ? queryText : [queryText]).filter(q => q.trim());
    if (queries.length === 0) {
      return emptyRagContext('no_relevant_docs');
    }

    try {
      const { search } = await import('../rag/store.js');
      const embeddings = await embedTexts(queries);
      const hitLists = await Promise.all(embeddings.map(emb => search(emb, settings.ragTopK)));
      const hits = mergeHits(hitLists, settings.ragTopK);

      if (hits.length === 0) {
        return emptyRagContext('no_documents');
      }

      const relevant = hits.filter(h => h.score >= settings.ragMinScore);
      if (relevant.length === 0) {
        return emptyRagContext('no_relevant_docs');
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
      return emptyRagContext('error');
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
