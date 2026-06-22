import { Job } from '../../queue/models.js';
import { PipelineStage, PipelineContext } from './base.js';
import { FetchDiffStage } from './stages/fetch-diff.js';
import { AnalyzeStage } from './stages/analyze.js';
import { AggregateStage } from './stages/aggregate.js';
import { PublishStage } from './stages/publish.js';
import { PipelineError } from '../../exceptions.js';

/**
 * Orchestrates security analysis pipeline stages.
 * Pipeline: Fetch Diff → Analyze → Aggregate → Publish
 */
export class PipelineOrchestrator {
  private stages: PipelineStage[];

  constructor() {
    this.stages = [
      new FetchDiffStage(),
      new AnalyzeStage(),
      new AggregateStage(),
      new PublishStage(),
    ];
  }

  /**
   * Execute full pipeline for a job.
   */
  async execute(job: Job): Promise<Record<string, unknown>> {
    let context = new PipelineContext(job);

    for (const stage of this.stages) {
      try {
        context = await stage.execute(context);
      } catch (e) {
        throw new PipelineError(
          `Stage ${stage.getName()} failed: ${(e as Error).message}`,
          { jobId: job.jobId, stage: stage.getName() }
        );
      }
    }

    return context.metadata;
  }

  /** Add a custom stage to pipeline. */
  addStage(stage: PipelineStage): void {
    this.stages.push(stage);
  }

  /** Remove a stage by name. */
  removeStage(stageName: string): void {
    this.stages = this.stages.filter(s => s.getName() !== stageName);
  }
}
