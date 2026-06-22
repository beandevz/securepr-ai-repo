/**
 * VCS Provider interface for GitHub, GitLab, etc.
 */
export interface VcsProvider {
  fetchPrDiff(owner: string, repo: string, prNumber: number): Promise<Record<string, unknown>[]>;
  createReview(
    owner: string, repo: string, prNumber: number,
    commitId: string, body: string, comments: Record<string, unknown>[]
  ): Promise<Record<string, unknown>>;
  createCommitStatus(
    owner: string, repo: string, sha: string,
    state: string, context: string, description: string, targetUrl?: string
  ): Promise<Record<string, unknown>>;
  createCheckRun(
    owner: string, repo: string, name: string,
    headSha: string, detailsUrl?: string
  ): Promise<number>;
  updateCheckRun(
    owner: string, repo: string, checkRunId: number,
    conclusion: string, summary: string, detailsUrl?: string
  ): Promise<Record<string, unknown>>;
}
