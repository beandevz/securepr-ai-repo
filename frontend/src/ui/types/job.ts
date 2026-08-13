export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

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
  result?: JobResult;
  error?: string;
  created_at?: string;
  updated_at?: string;
};

export type JobDetail = Job & {
  patch?: string;
  payload?: Record<string, any>;
};
