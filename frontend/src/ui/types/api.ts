import { Finding } from './finding';
import { Job } from './job';

export type WebhookPayload = {
  pull_request?: {
    number?: number;
    head?: {
      sha?: string;
    };
  };
  repository?: {
    full_name?: string;
  };
  number?: number;
};

export type IngestResponse = {
  ok: boolean;
  queued: boolean;
  job_id: string;
  check_run_id?: number;
  mode?: string;
};

export type HealthResponse = {
  status: string;
  llm_provider?: string;
  queue_provider?: string;
  rag_enabled?: boolean;
};

export type RagSearchResponse = {
  results: Array<{
    source: string;
    text: string;
    score: number;
  }>;
};

export type RagIngestResponse = {
  ok: boolean;
  chunks_ingested: number;
};

export type JobListResponse = Job[];

export type JobDetailResponse = {
  id: string;
  status: string;
  result?: {
    overall: string;
    should_fail: boolean;
    count: number;
    findings?: Finding[];
  };
  patch?: string;
  error?: string;
  created_at?: string;
};

export type GitHubStatusResponse = {
  check_runs?: Array<{
    id: number;
    name: string;
    status: string;
    conclusion?: string;
    started_at?: string;
    completed_at?: string;
    html_url?: string;
  }>;
  commit_statuses?: Array<{
    state: string;
    context: string;
    description?: string;
    target_url?: string;
    created_at?: string;
  }>;
};
