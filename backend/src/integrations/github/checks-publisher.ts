import { GitHubClient } from './client.js';

/**
 * GitHub checks/status publisher with shared HTTP client.
 */
export class ChecksPublisher {
  private client: GitHubClient;

  constructor(githubToken: string) {
    this.client = GitHubClient.getInstance(githubToken);
  }

  async createCheckRun(
    owner: string, repo: string,
    options: { name: string; headSha: string; detailsUrl?: string }
  ): Promise<number> {
    const url = `/repos/${owner}/${repo}/check-runs`;
    const payload: Record<string, unknown> = {
      name: options.name,
      head_sha: options.headSha,
      status: 'in_progress',
      output: { title: options.name, summary: 'SecurePR AI is running.' },
    };
    if (options.detailsUrl) {
      payload.details_url = options.detailsUrl;
    }
    const r = await this.client.http.post(url, { json: payload });
    return parseInt(r.data.id, 10);
  }

  async updateCheckRun(
    owner: string, repo: string, checkRunId: number,
    options: { conclusion: string; summary: string; detailsUrl?: string }
  ): Promise<Record<string, unknown>> {
    const url = `/repos/${owner}/${repo}/check-runs/${checkRunId}`;
    const payload: Record<string, unknown> = {
      status: 'completed',
      conclusion: options.conclusion,
      output: { title: 'SecurePR AI', summary: options.summary },
    };
    if (options.detailsUrl) {
      payload.details_url = options.detailsUrl;
    }
    const r = await this.client.http.patch(url, { json: payload });
    return r.data;
  }

  async createCommitStatus(
    owner: string, repo: string, sha: string,
    options: { state: string; context: string; description?: string; targetUrl?: string }
  ): Promise<Record<string, unknown>> {
    const url = `/repos/${owner}/${repo}/statuses/${sha}`;
    const payload: Record<string, unknown> = {
      state: options.state,
      context: options.context,
    };
    if (options.description) {
      payload.description = options.description;
    }
    if (options.targetUrl) {
      payload.target_url = options.targetUrl;
    }
    const r = await this.client.http.post(url, { json: payload });
    return r.data;
  }
}
