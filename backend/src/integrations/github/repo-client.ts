import { GitHubClient } from './client.js';
import { GITHUB_DOTCOM_API } from './host.js';

/**
 * GitHub repo + webhook management, shared HTTP client per token.
 */
export class RepoWebhookClient {
  private client: GitHubClient;

  constructor(token: string, apiBaseUrl: string = GITHUB_DOTCOM_API) {
    this.client = GitHubClient.getInstance(token, apiBaseUrl);
  }

  /** Validates the token has access to the repo; throws on 401/404. */
  async getRepo(owner: string, repo: string): Promise<Record<string, unknown>> {
    const r = await this.client.http.get(`/repos/${owner}/${repo}`);
    return r.data;
  }

  /**
   * Open PRs, newest first, capped at `limit`. Used to backfill scans for PRs
   * that already existed when the repo was connected — the webhook only ever
   * delivers events that happen after it is created.
   */
  async listOpenPullRequests(
    owner: string, repo: string, limit: number
  ): Promise<Array<{ number: number; head?: { sha?: string } }>> {
    const prs: Array<{ number: number; head?: { sha?: string } }> = [];
    for (let page = 1; prs.length < limit; page++) {
      const perPage = Math.min(100, limit - prs.length);
      const r = await this.client.http.get(
        `/repos/${owner}/${repo}/pulls?state=open&sort=created&direction=desc` +
        `&per_page=${perPage}&page=${page}`
      );
      const batch = (r.data || []) as Array<{ number: number; head?: { sha?: string } }>;
      // Slice rather than trusting per_page: the cap is a safety limit on how
      // much work one connect can queue, so it holds whatever the API returns.
      prs.push(...batch.slice(0, perPage));
      if (batch.length < perPage) break;
    }
    return prs;
  }

  async createWebhook(
    owner: string, repo: string, targetUrl: string, secret: string
  ): Promise<number> {
    const payload = {
      name: 'web',
      active: true,
      events: ['pull_request'],
      config: {
        url: targetUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    };
    const r = await this.client.http.post(`/repos/${owner}/${repo}/hooks`, { json: payload });
    return r.data.id as number;
  }

  async listWebhooks(
    owner: string, repo: string
  ): Promise<Array<{ id: number; config?: { url?: string } }>> {
    const r = await this.client.http.get(`/repos/${owner}/${repo}/hooks`);
    return (r.data || []) as Array<{ id: number; config?: { url?: string } }>;
  }

  /** Re-points an existing hook at our config (secret, events, target). */
  async updateWebhook(
    owner: string, repo: string, hookId: number, targetUrl: string, secret: string
  ): Promise<void> {
    const payload = {
      active: true,
      events: ['pull_request'],
      config: {
        url: targetUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    };
    await this.client.http.patch(`/repos/${owner}/${repo}/hooks/${hookId}`, { json: payload });
  }

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.client.http.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }
}
