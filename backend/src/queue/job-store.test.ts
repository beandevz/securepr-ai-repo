import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
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

describe('JobStore.deleteAll', () => {
  beforeEach(async () => {
    await jobStore.deleteAll();
    await seed('job_a', 10);
    await seed('job_b', 11);
    await seed('job_c', 12);
    await jobStore.setStatus('job_b', 'failed');
    await jobStore.markPrClosed('acme', 'web', 12);
  });

  it('deletes everything and reports the count', async () => {
    expect(await jobStore.deleteAll()).toBe(3);
    expect(await jobStore.list({ includeClosed: true })).toEqual([]);
  });

  it('deletes only the matching status', async () => {
    expect(await jobStore.deleteAll({ status: 'failed' })).toBe(1);

    const ids = (await jobStore.list({ includeClosed: true })).map(j => j.id);
    expect(ids.sort()).toEqual(['job_a', 'job_c']);
  });

  it('deletes only the matching PR state', async () => {
    expect(await jobStore.deleteAll({ prState: 'closed' })).toBe(1);

    const ids = (await jobStore.list({ includeClosed: true })).map(j => j.id);
    expect(ids.sort()).toEqual(['job_a', 'job_b']);
  });

  it('combines filters', async () => {
    expect(await jobStore.deleteAll({ status: 'failed', prState: 'closed' })).toBe(0);
    expect(await jobStore.list({ includeClosed: true })).toHaveLength(3);
  });

  it('returns 0 on an empty store', async () => {
    await jobStore.deleteAll();
    expect(await jobStore.deleteAll()).toBe(0);
  });
});

describe('JobStore.deleteByRepo', () => {
  beforeEach(async () => {
    await jobStore.deleteAll();
    await seed('job_web_open', 20);
    await seed('job_web_closed', 21);
    await jobStore.markPrClosed('acme', 'web', 21);
    await jobStore.create({
      jobId: 'job_api', owner: 'acme', repo: 'api', prNumber: 20, headSha: 'sha', host: 'github.com',
    });
    await seed('job_web_ghes', 20, 'github.example.com');
  });

  it('deletes every scan of the repo, open and closed alike', async () => {
    expect(await jobStore.deleteByRepo('acme', 'web', 'github.com')).toBe(2);

    const ids = (await jobStore.list({ includeClosed: true })).map(j => j.id);
    expect(ids.sort()).toEqual(['job_api', 'job_web_ghes']);
  });

  it('leaves the same repo name on another host alone', async () => {
    await jobStore.deleteByRepo('acme', 'web', 'github.com');
    expect(await jobStore.get('job_web_ghes')).not.toBeNull();
  });

  it('returns 0 for a repo with no scans', async () => {
    expect(await jobStore.deleteByRepo('acme', 'nothing', 'github.com')).toBe(0);
    expect(await jobStore.list({ includeClosed: true })).toHaveLength(4);
  });
});
