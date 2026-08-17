import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { settings } from '../core/settings.js';
import fs from 'fs';
import path from 'path';

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

// ─── sql.js singleton ───────────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;

/**
 * Open (or create) the SQLite database via sql.js (WASM).
 * Loads from disk file if it exists; otherwise creates a new in-memory DB.
 */
async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;

  const SQL = await initSqlJs();
  const dbPath = settings.ragDbPath;

  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      _db = new SQL.Database(fileBuffer);
    } else {
      _db = new SQL.Database();
    }
  } catch {
    _db = new SQL.Database();
  }

  return _db;
}

/**
 * Persist the in-memory database to disk.
 */
function saveDb(db: SqlJsDatabase): void {
  const dbPath = settings.ragDbPath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

/**
 * Initialize the DB schema.
 */
export async function initDb(): Promise<void> {
  const db = await getDb();
  db.run(
    'CREATE TABLE IF NOT EXISTS doc_chunks(' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'source TEXT NOT NULL, ' +
    'chunk_text TEXT NOT NULL, ' +
    'embedding TEXT NOT NULL, ' +
    'chunk_index INTEGER DEFAULT 0, ' +
    'total_chunks INTEGER DEFAULT 1, ' +
    "created_at TEXT DEFAULT (datetime('now')))"
  );
  saveDb(db);
}

/**
 * Insert chunks with embeddings and metadata.
 */
export async function addChunks(
  source: string,
  chunks: string[],
  embeddings: number[][],
  chunkMeta?: Array<{ index: number; totalChunks: number }>
): Promise<void> {
  await initDb();
  const db = await getDb();

  for (let i = 0; i < chunks.length; i++) {
    const meta = chunkMeta?.[i];
    db.run(
      'INSERT INTO doc_chunks(source, chunk_text, embedding, chunk_index, total_chunks) VALUES (?, ?, ?, ?, ?)',
      [
        source,
        chunks[i],
        JSON.stringify(embeddings[i]),
        meta?.index ?? i,
        meta?.totalChunks ?? chunks.length,
      ]
    );
  }

  saveDb(db);
}

/** A retrieved chunk plus the metadata needed to cite it back to its document. */
export interface RagHit {
  source: string;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  score: number;
}

/**
 * Vector similarity search. Returns top-K results sorted by cosine score.
 */
export async function search(queryEmb: number[], topK: number): Promise<RagHit[]> {
  await initDb();
  const db = await getDb();
  const stmt = db.prepare(
    'SELECT source, chunk_text, embedding, chunk_index, total_chunks FROM doc_chunks'
  );

  const scored: RagHit[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as {
      source: string;
      chunk_text: string;
      embedding: string;
      chunk_index: number;
      total_chunks: number;
    };
    const emb = JSON.parse(row.embedding) as number[];
    scored.push({
      source: row.source,
      text: row.chunk_text,
      chunkIndex: row.chunk_index ?? 0,
      totalChunks: row.total_chunks ?? 1,
      score: cosine(queryEmb, emb),
    });
  }
  stmt.free();

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(topK, 1));
}

/**
 * List all distinct sources with chunk counts and timestamps.
 */
export async function listSources(): Promise<Array<{
  source: string;
  chunk_count: number;
  created_at: string;
}>> {
  await initDb();
  const db = await getDb();
  const stmt = db.prepare(
    'SELECT source, COUNT(*) as chunk_count, MIN(created_at) as created_at ' +
    'FROM doc_chunks GROUP BY source ORDER BY created_at DESC'
  );

  const results: Array<{ source: string; chunk_count: number; created_at: string }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { source: string; chunk_count: number; created_at: string };
    results.push(row);
  }
  stmt.free();
  return results;
}

/**
 * Delete all chunks belonging to a source.
 */
export async function deleteBySource(source: string): Promise<number> {
  await initDb();
  const db = await getDb();
  db.run('DELETE FROM doc_chunks WHERE source = ?', [source]);
  const changes = db.getRowsModified();
  saveDb(db);
  return changes;
}

/**
 * Get knowledge base statistics.
 */
export async function getStats(): Promise<{
  total_chunks: number;
  total_sources: number;
  db_size_bytes: number;
}> {
  await initDb();
  const db = await getDb();

  const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM doc_chunks');
  countStmt.step();
  const totalChunks = (countStmt.getAsObject() as { cnt: number }).cnt;
  countStmt.free();

  const sourceStmt = db.prepare('SELECT COUNT(DISTINCT source) as cnt FROM doc_chunks');
  sourceStmt.step();
  const totalSources = (sourceStmt.getAsObject() as { cnt: number }).cnt;
  sourceStmt.free();

  let dbSize = 0;
  try {
    const stat = fs.statSync(settings.ragDbPath);
    dbSize = stat.size;
  } catch {
    // file may not exist yet
  }

  return {
    total_chunks: totalChunks,
    total_sources: totalSources,
    db_size_bytes: dbSize,
  };
}
