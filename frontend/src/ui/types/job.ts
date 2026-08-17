export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'skipped';

/** Scans of closed PRs are hidden from listings; 'closed' only shows up on a direct link. */
export type PrState = 'open' | 'closed';

export type JobResult = {
  overall: string;
  should_fail: boolean;
  count: number;
};

export type Job = {
  id: string;
  status: JobStatus;
  owner?: string;
  repo?: string;
  /** 'github.com' or an enterprise host such as 'github.boschdevcloud.com'. */
  host?: string;
  pr_number?: number;
  head_sha?: string;
  pr_state?: PrState;
  result?: JobResult;
  error?: string;
  created_at?: string;
  updated_at?: string;
};
