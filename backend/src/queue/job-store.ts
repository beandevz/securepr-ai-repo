/**
 * In-memory job store for tracking job status and results.
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

export class JobStore {
  private jobs: Map<string, JobRecord> = new Map();

  create(options: {
    jobId: string;
    owner: string;
    repo: string;
    prNumber: number;
    headSha: string;
  }): JobRecord {
    const rec: JobRecord = {
      id: options.jobId,
      status: 'queued',
      created_at: nowIso(),
      updated_at: nowIso(),
      owner: options.owner,
      repo: options.repo,
      pr_number: options.prNumber,
      head_sha: options.headSha,
      result: null,
      error: null,
    };
    this.jobs.set(options.jobId, rec);
    return rec;
  }

  setStatus(jobId: string, status: string): void {
    const rec = this.jobs.get(jobId);
    if (!rec) return;
    rec.status = status;
    rec.updated_at = nowIso();
  }

  setResult(jobId: string, result: Record<string, unknown>): void {
    const rec = this.jobs.get(jobId);
    if (!rec) return;
    rec.result = result;
    rec.status = 'done';
    rec.updated_at = nowIso();
  }

  setError(jobId: string, error: string): void {
    const rec = this.jobs.get(jobId);
    if (!rec) return;
    rec.error = error;
    rec.status = 'failed';
    rec.updated_at = nowIso();
  }

  list(): JobRecord[] {
    const items = Array.from(this.jobs.values());
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return items;
  }

  get(jobId: string): JobRecord | null {
    return this.jobs.get(jobId) || null;
  }

  delete(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }
}

/** Singleton store */
export const jobStore = new JobStore();
