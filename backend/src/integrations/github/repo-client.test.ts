import { describe, it, expect, beforeEach } from 'vitest';
import { AxiosResponse } from 'axios';
import { GitHubClient } from './client.js';
import { RepoWebhookClient } from './repo-client.js';

const API = 'https://api.github.test';
const TOKEN = 'test-token';

/** Fake page of PRs: numbers descending from `from`. */
function page(from: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    number: from - i,
    head: { sha: `sha${from - i}` },
  }));
}

/** Replace the pooled client's transport and record the URLs it is asked for. */
function stubGet(pages: unknown[][]): string[] {
  const requested: string[] = [];
  const http = GitHubClient.getInstance(TOKEN, API).http as unknown as {
    get: (url: string) => Promise<AxiosResponse>;
  };
  http.get = async (url: string) => {
    requested.push(url);
    return { data: pages.shift() ?? [] } as AxiosResponse;
  };
  return requested;
}

describe('RepoWebhookClient.listOpenPullRequests', () => {
  beforeEach(() => {
    GitHubClient.resetAll();
  });

  it('asks only for open PRs and stops on a short page', async () => {
    const requested = stubGet([page(30, 3)]);
    const client = new RepoWebhookClient(TOKEN, API);

    const prs = await client.listOpenPullRequests('acme', 'web', 20);

    expect(prs.map(p => p.number)).toEqual([30, 29, 28]);
    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain('state=open');
    expect(requested[0]).toContain('per_page=20');
  });

  it('pages until the cap is reached, never past it', async () => {
    const requested = stubGet([page(150, 100), page(50, 100)]);
    const client = new RepoWebhookClient(TOKEN, API);

    const prs = await client.listOpenPullRequests('acme', 'web', 120);

    expect(prs).toHaveLength(120);
    expect(requested).toHaveLength(2);
    // Second request asks only for the remainder, so the cap is never exceeded.
    expect(requested[1]).toContain('per_page=20');
    expect(requested[1]).toContain('page=2');
  });

  it('returns nothing for a repo with no open PRs', async () => {
    stubGet([[]]);
    const client = new RepoWebhookClient(TOKEN, API);

    expect(await client.listOpenPullRequests('acme', 'web', 20)).toEqual([]);
  });
});
