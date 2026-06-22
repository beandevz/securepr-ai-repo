import { Job } from '../../queue/models.js';
import { Finding } from '../../domain/models.js';

/**
 * Context object passed between pipeline stages.
 */
export class PipelineContext {
  job: Job;
  files: Record<string, unknown>[] = [];
  findings: Finding[] = [];
  overallSeverity: string = 'LOW';
  shouldFail: boolean = false;
  metadata: Record<string, unknown> = {};

  constructor(job: Job) {
    this.job = job;
  }
}

/**
 * Interface for pipeline stages.
 */
export interface PipelineStage {
  /** Execute this pipeline stage. */
  execute(context: PipelineContext): Promise<PipelineContext>;
  /** Get stage name for logging. */
  getName(): string;
}
