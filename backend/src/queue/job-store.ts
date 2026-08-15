import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { settings } from '../core/settings.js';
import { GITHUB_DOTCOM_HOST } from '../integrations/github/host.js';
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
  /** GitHub host the PR lives on, e.g. 'github.com' or a GHES instance. */
  host: string;
  pr_number: number;
  head_sha: string;
  /** 'open' | 'closed' — scans for closed PRs are hidden from listings. */
  pr_state: string;
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
  host: string | null;
  pr_number: number;
  head_sha: string;
  pr_state: string | null;
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
    host: row.host || GITHUB_DOTCOM_HOST,
    pr_number: row.pr_number,
    head_sha: row.head_sha,
    pr_state: row.pr_state || 'open',
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
    "host TEXT NOT NULL DEFAULT 'github.com', " +
    "pr_state TEXT NOT NULL DEFAULT 'open', " +
    'result TEXT, ' +
    'error TEXT)'
  );
  // Jobs written before multi-host support predate the column; backfill them
  // as github.com rather than forcing users to drop the DB.
  addColumnIfMissing(db, 'jobs', 'host', "TEXT NOT NULL DEFAULT 'github.com'");
  // Older jobs predate PR-state tracking; treat them as open until a webhook
  // says otherwise, so nothing already visible disappears on upgrade.
  addColumnIfMissing(db, 'jobs', 'pr_state', "TEXT NOT NULL DEFAULT 'open'");
  saveDb(db);
}

/** sql.js has no "ADD COLUMN IF NOT EXISTS"; probe PRAGMA and add when absent. */
function addColumnIfMissing(
  db: SqlJsDatabase, table: string, column: string, definition: string
): void {
  const info = db.exec(`PRAGMA table_info(${table})`);
  const columns = info[0]?.values.map(row => String(row[1])) || [];
  if (!columns.includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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
    host?: string;
  }): Promise<JobRecord> {
    await initDb();
    const db = await getDb();
    const now = nowIso();
    const host = options.host || GITHUB_DOTCOM_HOST;
    db.run(
      'INSERT INTO jobs(id, status, created_at, updated_at, owner, repo, pr_number, head_sha, host, pr_state, result, error) ' +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, NULL)",
      [options.jobId, 'queued', now, now, options.owner, options.repo, options.prNumber, options.headSha, host]
    );
    saveDb(db);
    return {
      id: options.jobId,
      status: 'queued',
      created_at: now,
      updated_at: now,
      owner: options.owner,
      repo: options.repo,
      host,
      pr_number: options.prNumber,
      head_sha: options.headSha,
      pr_state: 'open',
      result: null,
      error: null,
    };
  }

  /**
   * Mark every scan of a pull request as belonging to a closed PR, hiding them
   * from listings. Called when GitHub reports the PR closed or merged.
   */
  async markPrClosed(
    owner: string, repo: string, prNumber: number, host: string = GITHUB_DOTCOM_HOST
  ): Promise<number> {
    await initDb();
    const db = await getDb();
    db.run(
      "UPDATE jobs SET pr_state = 'closed', updated_at = ? " +
      'WHERE owner = ? AND repo = ? AND pr_number = ? AND host = ?',
      [nowIso(), owner, repo, prNumber, host]
    );
    const changes = db.getRowsModified();
    if (changes > 0) saveDb(db);
    return changes;
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

  /** Scans of open PRs, newest first; closed PRs only when explicitly asked for. */
  async list(options: { includeClosed?: boolean } = {}): Promise<JobRecord[]> {
    await initDb();
    const db = await getDb();
    const stmt = db.prepare(
      options.includeClosed
        ? 'SELECT * FROM jobs ORDER BY created_at DESC'
        : "SELECT * FROM jobs WHERE pr_state = 'open' ORDER BY created_at DESC"
    );
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
