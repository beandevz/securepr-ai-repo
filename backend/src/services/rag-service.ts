import { settings } from '../core/settings.js';

/**
 * RAG retrieval wrapper service.
 */
export class RagService {
  async retrieve(queryText: string): Promise<string> {
    if (!settings.ragEnabled) {
      return '';
    }

    const { embedTexts } = await import('../integrations/ai/openai-client.js');
    const { search } = await import('../rag/store.js');

    const [queryEmb] = await embedTexts([queryText]);
    const hits = await search(queryEmb, settings.ragTopK);

    return hits
      .map(([s, t, sc]) => `[source=${s} score=${sc.toFixed(3)}]\n${t}`)
      .join('\n\n---\n\n');
  }
}
