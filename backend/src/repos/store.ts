import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { settings } from '../core/settings.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ConnectedRepoSafe {
  id: string;
  owner: string;
  name: string;
  url: string;
  webhookConfigured: boolean;
  lastSync: string;
  status: 'active' | 'inactive';
}

export interface ConnectedRepoRow {
  id: string;
  owner: string;
  name: string;
  url: string;
  encrypted_token: string;
  webhook_id: number | null;
  status: string;
  created_at: string;
  last_sync: string | null;
}

// ─── sql.js singleton ───────────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;

async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;

  const SQL = await initSqlJs();
  const dbPath = settings.reposDbPath;

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

function saveDb(db: SqlJsDatabase): void {
  const dbPath = settings.reposDbPath;
  const dir = path.dirname(dbPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  db.run(
    'CREATE TABLE IF NOT EXISTS connected_repos(' +
    'id TEXT PRIMARY KEY, ' +
    'owner TEXT NOT NULL, ' +
    'name TEXT NOT NULL, ' +
    'url TEXT NOT NULL, ' +
    'encrypted_token TEXT NOT NULL, ' +
    'webhook_id INTEGER, ' +
    "status TEXT NOT NULL DEFAULT 'active', " +
    "created_at TEXT DEFAULT (datetime('now')), " +
    'last_sync TEXT, ' +
    'UNIQUE(owner, name))'
  );
  saveDb(db);
}

function toSafe(row: ConnectedRepoRow): ConnectedRepoSafe {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    url: row.url,
    webhookConfigured: row.webhook_id != null,
    lastSync: row.last_sync || row.created_at,
    status: row.status === 'active' ? 'active' : 'inactive',
  };
}

/**
 * Insert a newly-connected repo. Throws if (owner, name) already exists.
 */
export async function insertRepo(options: {
  owner: string;
  name: string;
  url: string;
  encryptedToken: string;
}): Promise<ConnectedRepoSafe> {
  await initDb();
  const db = await getDb();

  const existing = db.exec(
    'SELECT id FROM connected_repos WHERE owner = ? AND name = ?',
    [options.owner, options.name]
  );
  if (existing.length > 0 && existing[0].values.length > 0) {
    const err = new Error('Repository already connected') as Error & { code: string };
    err.code = 'DUPLICATE_REPO';
    throw err;
  }

  const id = crypto.randomUUID();
  db.run(
    'INSERT INTO connected_repos(id, owner, name, url, encrypted_token) VALUES (?, ?, ?, ?, ?)',
    [id, options.owner, options.name, options.url, options.encryptedToken]
  );
  saveDb(db);

  const row = await getRowById(id);
  return toSafe(row!);
}

async function getRowById(id: string): Promise<ConnectedRepoRow | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM connected_repos WHERE id = ?');
  stmt.bind([id]);
  let row: ConnectedRepoRow | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as unknown as ConnectedRepoRow;
  }
  stmt.free();
  return row;
}

/**
 * Get a repo including its encrypted token (internal use only — never expose over the API).
 */
export async function getRepoById(id: string): Promise<ConnectedRepoRow | null> {
  await initDb();
  return getRowById(id);
}

/**
 * Look up a repo (with encrypted token) by owner/name — used to resolve which
 * stored token to use for an inbound webhook (internal use only).
 */
export async function getRepoByOwnerName(owner: string, name: string): Promise<ConnectedRepoRow | null> {
  await initDb();
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM connected_repos WHERE owner = ? AND name = ?');
  stmt.bind([owner, name]);
  let row: ConnectedRepoRow | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as unknown as ConnectedRepoRow;
  }
  stmt.free();
  return row;
}

export async function listRepos(): Promise<ConnectedRepoSafe[]> {
  await initDb();
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM connected_repos ORDER BY created_at DESC');

  const results: ConnectedRepoSafe[] = [];
  while (stmt.step()) {
    results.push(toSafe(stmt.getAsObject() as unknown as ConnectedRepoRow));
  }
  stmt.free();
  return results;
}

export async function setWebhook(id: string, webhookId: number): Promise<ConnectedRepoSafe | null> {
  await initDb();
  const db = await getDb();
  db.run('UPDATE connected_repos SET webhook_id = ? WHERE id = ?', [webhookId, id]);
  saveDb(db);
  const row = await getRowById(id);
  return row ? toSafe(row) : null;
}

export async function touchLastSync(id: string): Promise<void> {
  await initDb();
  const db = await getDb();
  db.run("UPDATE connected_repos SET last_sync = datetime('now') WHERE id = ?", [id]);
  saveDb(db);
}

export async function deleteRepo(id: string): Promise<boolean> {
  await initDb();
  const db = await getDb();
  db.run('DELETE FROM connected_repos WHERE id = ?', [id]);
  const changes = db.getRowsModified();
  saveDb(db);
  return changes > 0;
}
