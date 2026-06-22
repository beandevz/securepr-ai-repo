import { GitHubClient } from './client.js';

/**
 * GitHub review/comment publisher with shared HTTP client.
 */
export class ReviewPublisher {
  private client: GitHubClient;

  constructor(githubToken: string) {
    this.client = GitHubClient.getInstance(githubToken);
  }

  async createReview(
    owner: string, repo: string, prNumber: number,
    options: { commitId: string; body: string; comments: Record<string, unknown>[] }
  ): Promise<Record<string, unknown>> {
    const url = `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
    const payload = {
      commit_id: options.commitId,
      body: options.body,
      event: 'COMMENT',
      comments: options.comments,
    };
    const r = await this.client.http.post(url, { json: payload as Record<string, unknown> });
    return r.data;
  }

  async createReviewComment(
    owner: string, repo: string, prNumber: number,
    options: { commitId: string; path: string; line: number; body: string; side?: string }
  ): Promise<Record<string, unknown>> {
    const url = `/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
    const payload = {
      body: options.body,
      commit_id: options.commitId,
      path: options.path,
      line: options.line,
      side: options.side || 'RIGHT',
    };
    const r = await this.client.http.post(url, { json: payload as Record<string, unknown> });
    return r.data;
  }

  async postIssueComment(
    owner: string, repo: string, prNumber: number, body: string
  ): Promise<Record<string, unknown>> {
    const url = `/repos/${owner}/${repo}/issues/${prNumber}/comments`;
    const r = await this.client.http.post(url, { json: { body } });
    return r.data;
  }
}
