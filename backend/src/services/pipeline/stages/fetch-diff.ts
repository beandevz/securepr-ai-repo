import { PipelineContext, PipelineStage } from '../base.js';
import { DiffFetcher } from '../../diff-fetcher.js';
import { settings } from '../../../core/settings.js';
import { PipelineError } from '../../../exceptions.js';

/**
 * Stage 1: Fetch PR diff files from GitHub.
 */
export class FetchDiffStage implements PipelineStage {
  async execute(context: PipelineContext): Promise<PipelineContext> {
    try {
      const fetcher = new DiffFetcher(context.job.githubToken);
      context.files = await fetcher.fetchFiles(
        context.job.owner,
        context.job.repo,
        context.job.prNumber
      );

      // Limit files to process
      context.files = context.files.slice(0, Math.max(settings.maxLlmChunks, 1));
    } catch (e) {
      throw new PipelineError(
        `Failed to fetch diff: ${(e as Error).message}`,
        { jobId: context.job.jobId }
      );
    }

    return context;
  }

  getName(): string {
    return 'FetchDiffStage';
  }
}
