import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { settings } from '../core/settings.js';

const dbPath = path.join(os.tmpdir(), `securepr-jobs-${process.pid}-${Date.now()}.db`);
settings.jobsDbPath = dbPath;

// Imported after jobsDbPath is set: the store opens the DB on first use.
const { jobStore } = await import('./job-store.js');

async function seed(jobId: string, prNumber: number, host = 'github.com') {
  return jobStore.create({ jobId, owner: 'acme', repo: 'web', prNumber, headSha: 'sha', host });
}

describe('JobStore PR state', () => {
  beforeAll(async () => {
    await seed('job_open', 1);
    await seed('job_closed_a', 2);
    await seed('job_closed_b', 2);
    await seed('job_other_host', 2, 'github.example.com');
  });

  afterAll(() => {
    fs.rmSync(dbPath, { force: true });
  });

  it('creates jobs as open', async () => {
    expect((await jobStore.get('job_open'))?.pr_state).toBe('open');
  });

  it('retires every scan of a closed PR on the same host', async () => {
    const hidden = await jobStore.markPrClosed('acme', 'web', 2, 'github.com');

    expect(hidden).toBe(2);
    expect((await jobStore.get('job_closed_a'))?.pr_state).toBe('closed');
    expect((await jobStore.get('job_closed_b'))?.pr_state).toBe('closed');
  });

  it('does not touch the same PR number on another host', async () => {
    expect((await jobStore.get('job_other_host'))?.pr_state).toBe('open');
  });

  it('hides closed PRs from the default listing', async () => {
    const ids = (await jobStore.list()).map(j => j.id);

    expect(ids).toContain('job_open');
    expect(ids).toContain('job_other_host');
    expect(ids).not.toContain('job_closed_a');
    expect(ids).not.toContain('job_closed_b');
  });

  it('still lists them when explicitly requested', async () => {
    const ids = (await jobStore.list({ includeClosed: true })).map(j => j.id);

    expect(ids).toContain('job_closed_a');
    expect(ids).toHaveLength(4);
  });

  it('keeps a closed PR reachable by id, so existing links still work', async () => {
    expect(await jobStore.get('job_closed_a')).not.toBeNull();
  });

  it('reports nothing hidden for a PR with no scans', async () => {
    expect(await jobStore.markPrClosed('acme', 'web', 999)).toBe(0);
  });
});
