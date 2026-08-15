import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settings } from '../core/settings.js';
import { RagService } from './rag-service.js';
import type { RagHit } from '../rag/store.js';

const embedTexts = vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0]));
const isEmbeddingConfigured = vi.fn(() => true);
const search = vi.fn(async (): Promise<RagHit[]> => []);
const getStats = vi.fn(async () => ({ total_chunks: 0, total_sources: 0, db_size_bytes: 0 }));

vi.mock('../integrations/ai/openai-client.js', () => ({
  embedTexts: (texts: string[]) => embedTexts(texts),
  isEmbeddingConfigured: () => isEmbeddingConfigured(),
}));

vi.mock('../rag/store.js', () => ({
  search: () => search(),
  getStats: () => getStats(),
}));

function hit(source: string, score: number, chunkIndex = 0, totalChunks = 1): RagHit {
  return { source, text: `policy text from ${source}`, chunkIndex, totalChunks, score };
}

describe('RagService.retrieve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEmbeddingConfigured.mockReturnValue(true);
    search.mockResolvedValue([]);
    settings.ragEnabled = true;
    settings.ragAllowLocalEmbeddings = false;
    settings.ragMinScore = 0.3;
    settings.ragTopK = 4;
  });

  it('returns disabled without touching embeddings when RAG_ENABLED=false', async () => {
    settings.ragEnabled = false;

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('disabled');
    expect(ctx.promptText).toBe('');
    expect(ctx.chunks).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  it('skips retrieval when embeddings would fall back to local hashes', async () => {
    isEmbeddingConfigured.mockReturnValue(false);

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('no_embedding_model');
    expect(embedTexts).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it('retrieves with local hash embeddings when explicitly allowed', async () => {
    isEmbeddingConfigured.mockReturnValue(false);
    settings.ragAllowLocalEmbeddings = true;
    search.mockResolvedValue([hit('policy.pdf', 0.9)]);

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('ok');
    expect(embedTexts).toHaveBeenCalled();
  });

  it('reports no_documents when the knowledge base is empty', async () => {
    search.mockResolvedValue([]);

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('no_documents');
    expect(ctx.promptText).toBe('');
  });

  it('reports no_relevant_docs when every hit scores below the threshold', async () => {
    search.mockResolvedValue([hit('unrelated.md', 0.29), hit('other.md', 0.05)]);

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('no_relevant_docs');
    expect(ctx.chunks).toEqual([]);
    expect(ctx.promptText).toBe('');
  });

  it('keeps only above-threshold hits and assigns sequential ref ids', async () => {
    search.mockResolvedValue([
      hit('secure-coding.pdf', 0.71, 2, 12),
      hit('api-guidelines.md', 0.42, 0, 3),
      hit('unrelated.md', 0.11),
    ]);

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('ok');
    expect(ctx.chunks.map(c => c.refId)).toEqual(['R1', 'R2']);
    expect(ctx.chunks.map(c => c.source)).toEqual(['secure-coding.pdf', 'api-guidelines.md']);
    expect(ctx.chunks[0]).toMatchObject({ chunkIndex: 2, totalChunks: 12, score: 0.71 });
  });

  it('labels prompt chunks with the ref id, 1-based chunk numbering and score', async () => {
    search.mockResolvedValue([hit('secure-coding.pdf', 0.712345, 2, 12)]);

    const ctx = await new RagService().retrieve('query');

    expect(ctx.promptText).toContain('[R1 | source=secure-coding.pdf | chunk 3/12 | relevance 0.712]');
    expect(ctx.promptText).toContain('policy text from secure-coding.pdf');
  });

  it('degrades to an error status instead of throwing when search fails', async () => {
    search.mockRejectedValue(new Error('db locked'));

    const ctx = await new RagService().retrieve('query');

    expect(ctx.status).toBe('error');
    expect(ctx.promptText).toBe('');
  });
});
