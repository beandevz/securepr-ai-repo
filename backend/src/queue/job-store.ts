import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { settings } from '../core/settings.js';
import fs from 'fs';
import path from 'path';

/**
 * Persistent (sql.js-backed) job store for tracking job status and results.
 * Survives process restarts, unlike a plain in-memory Map.
 */

function nowIso(): string {
  return new Date().toISOString();
}

export interface JobRecord {
  id: string;
  status: string; // queued | running | done | failed
  created_at: string;
  updated_at: string;
  owner: string;
  repo: string;
  pr_number: number;
  head_sha: string;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

interface JobRow {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner: string;
  repo: string;
  pr_number: number;
  head_sha: string;
  result: string | null;
  error: string | null;
}

function toRecord(row: JobRow): JobRecord {
  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: row.owner,
    repo: row.repo,
    pr_number: row.pr_number,
    head_sha: row.head_sha,
    result: row.result ? JSON.parse(row.result) : null,
    error: row.error,
  };
}

// ─── sql.js singleton ───────────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;

async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;

  const SQL = await initSqlJs();
  const dbPath = settings.jobsDbPath;

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
  const dbPath = settings.jobsDbPath;
  const dir = path.dirname(dbPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

async function initDb(): Promise<void> {
  const db = await getDb();
  db.run(
    'CREATE TABLE IF NOT EXISTS jobs(' +
    'id TEXT PRIMARY KEY, ' +
    'status TEXT NOT NULL, ' +
    'created_at TEXT NOT NULL, ' +
    'updated_at TEXT NOT NULL, ' +
    'owner TEXT NOT NULL, ' +
    'repo TEXT NOT NULL, ' +
    'pr_number INTEGER NOT NULL, ' +
    'head_sha TEXT NOT NULL, ' +
    'result TEXT, ' +
    'error TEXT)'
  );
  saveDb(db);
}

async function getRow(jobId: string): Promise<JobRow | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  stmt.bind([jobId]);
  let row: JobRow | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as unknown as JobRow;
  }
  stmt.free();
  return row;
}

export class JobStore {
  async create(options: {
    jobId: string;
    owner: string;
    repo: string;
    prNumber: number;
    headSha: string;
  }): Promise<JobRecord> {
    await initDb();
    const db = await getDb();
    const now = nowIso();
    db.run(
      'INSERT INTO jobs(id, status, created_at, updated_at, owner, repo, pr_number, head_sha, result, error) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)',
      [options.jobId, 'queued', now, now, options.owner, options.repo, options.prNumber, options.headSha]
    );
    saveDb(db);
    return {
      id: options.jobId,
      status: 'queued',
      created_at: now,
      updated_at: now,
      owner: options.owner,
      repo: options.repo,
      pr_number: options.prNumber,
      head_sha: options.headSha,
      result: null,
      error: null,
    };
  }

  async setStatus(jobId: string, status: string): Promise<void> {
    await initDb();
    const db = await getDb();
    db.run('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?', [status, nowIso(), jobId]);
    saveDb(db);
  }

  async setResult(jobId: string, result: Record<string, unknown>): Promise<void> {
    await initDb();
    const db = await getDb();
    db.run(
      "UPDATE jobs SET result = ?, status = 'done', updated_at = ? WHERE id = ?",
      [JSON.stringify(result), nowIso(), jobId]
    );
    saveDb(db);
  }

  async setError(jobId: string, error: string): Promise<void> {
    await initDb();
    const db = await getDb();
    db.run(
      "UPDATE jobs SET error = ?, status = 'failed', updated_at = ? WHERE id = ?",
      [error, nowIso(), jobId]
    );
    saveDb(db);
  }

  async list(): Promise<JobRecord[]> {
    await initDb();
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');
    const results: JobRecord[] = [];
    while (stmt.step()) {
      results.push(toRecord(stmt.getAsObject() as unknown as JobRow));
    }
    stmt.free();
    return results;
  }

  async get(jobId: string): Promise<JobRecord | null> {
    await initDb();
    const row = await getRow(jobId);
    return row ? toRecord(row) : null;
  }

  async delete(jobId: string): Promise<boolean> {
    await initDb();
    const db = await getDb();
    db.run('DELETE FROM jobs WHERE id = ?', [jobId]);
    const changes = db.getRowsModified();
    saveDb(db);
    return changes > 0;
  }
}

/** Singleton store */
export const jobStore = new JobStore();
