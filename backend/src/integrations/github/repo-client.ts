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
