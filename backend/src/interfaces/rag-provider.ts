/**
 * RAG Provider interface for knowledge base retrieval.
 */
export interface RagProvider {
  retrieve(queryText: string, topK?: number): string;
  ingestDocument(source: string, text: string, metadata: Record<string, unknown>): void;
  searchRaw(queryText: string, topK?: number): Array<[string, string, number]>;
  isEnabled(): boolean;
}
