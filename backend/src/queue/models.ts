/**
 * Queue job models.
 */
export interface Job {
  jobId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  githubToken: string;
  /** Host the PR lives on, e.g. 'github.com' or 'github.boschdevcloud.com'. */
  githubHost?: string;
  /** Resolved API root for githubHost; defaults to github.com's when absent. */
  apiBaseUrl?: string;
  payload: Record<string, unknown>;
  checkRunId?: number | null;
  statusMode?: string | null;
}
