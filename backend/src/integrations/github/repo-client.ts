import { GitHubClient } from './client.js';

/**
 * GitHub repo + webhook management, shared HTTP client per token.
 */
export class RepoWebhookClient {
  private client: GitHubClient;

  constructor(token: string) {
    this.client = GitHubClient.getInstance(token);
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

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.client.http.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }
}
