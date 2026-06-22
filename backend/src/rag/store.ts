import Database from 'better-sqlite3';
import { settings } from '../core/settings.js';
import fs from 'fs';

/**
 * Cosine similarity between two vectors.
 */
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na <= 0 || nb <= 0) return 0.0;
  return dot / Math.sqrt(na * nb);
}

function connect(): Database.Database {
  return new Database(settings.ragDbPath);
}

/**
 * Initialize the DB schema. Adds created_at column if missing.
 */
export function initDb(): void {
  const db = connect();
  db.exec(
    'CREATE TABLE IF NOT EXISTS doc_chunks(' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'source TEXT NOT NULL, ' +
    'chunk_text TEXT NOT NULL, ' +
    'embedding TEXT NOT NULL, ' +
    'chunk_index INTEGER DEFAULT 0, ' +
    'total_chunks INTEGER DEFAULT 1, ' +
    'created_at TEXT DEFAULT (datetime(\'now\')))'
  );
  db.close();
}

/**
 * Insert chunks with embeddings and metadata.
 */
export function addChunks(
  source: string,
  chunks: string[],
  embeddings: number[][],
  chunkMeta?: Array<{ index: number; totalChunks: number }>
): void {
  initDb();
  const db = connect();
  const stmt = db.prepare(
    'INSERT INTO doc_chunks(source, chunk_text, embedding, chunk_index, total_chunks) VALUES (?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction(() => {
    for (let i = 0; i < chunks.length; i++) {
      const meta = chunkMeta?.[i];
      stmt.run(
        source,
        chunks[i],
        JSON.stringify(embeddings[i]),
        meta?.index ?? i,
        meta?.totalChunks ?? chunks.length
      );
    }
  });
  insertMany();
  db.close();
}

/**
 * Vector similarity search. Returns top-K results sorted by cosine score.
 */
export function search(queryEmb: number[], topK: number): Array<[string, string, number]> {
  initDb();
  const db = connect();
  const rows = db.prepare(
    'SELECT source, chunk_text, embedding FROM doc_chunks'
  ).all() as Array<{ source: string; chunk_text: string; embedding: string }>;
  db.close();

  const scored: Array<[string, string, number]> = rows.map(row => {
    const emb = JSON.parse(row.embedding) as number[];
    const score = cosine(queryEmb, emb);
    return [row.source, row.chunk_text, score];
  });

  scored.sort((a, b) => b[2] - a[2]);
  return scored.slice(0, Math.max(topK, 1));
}

/**
 * List all distinct sources with chunk counts and timestamps.
 */
export function listSources(): Array<{
  source: string;
  chunk_count: number;
  created_at: string;
}> {
  initDb();
  const db = connect();
  const rows = db.prepare(
    'SELECT source, COUNT(*) as chunk_count, MIN(created_at) as created_at ' +
    'FROM doc_chunks GROUP BY source ORDER BY created_at DESC'
  ).all() as Array<{ source: string; chunk_count: number; created_at: string }>;
  db.close();
  return rows;
}

/**
 * Delete all chunks belonging to a source.
 */
export function deleteBySource(source: string): number {
  initDb();
  const db = connect();
  const result = db.prepare('DELETE FROM doc_chunks WHERE source = ?').run(source);
  db.close();
  return result.changes;
}

/**
 * Get knowledge base statistics.
 */
export function getStats(): {
  total_chunks: number;
  total_sources: number;
  db_size_bytes: number;
} {
  initDb();
  const db = connect();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM doc_chunks').get() as { cnt: number };
  const sourceRow = db.prepare('SELECT COUNT(DISTINCT source) as cnt FROM doc_chunks').get() as { cnt: number };
  db.close();

  let dbSize = 0;
  try {
    const stat = fs.statSync(settings.ragDbPath);
    dbSize = stat.size;
  } catch {
    // file may not exist yet
  }

  return {
    total_chunks: countRow.cnt,
    total_sources: sourceRow.cnt,
    db_size_bytes: dbSize,
  };
}

/**
 * Get total chunk count.
 */
export function getChunkCount(): number {
  initDb();
  const db = connect();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM doc_chunks').get() as { cnt: number };
  db.close();
  return row.cnt;
}
