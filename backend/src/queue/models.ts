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
  payload: Record<string, unknown>;
  checkRunId?: number | null;
  statusMode?: string | null;
}
