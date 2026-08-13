import { PipelineContext, PipelineStage } from '../base.js';
import { DiffFetcher } from '../../diff-fetcher.js';
import { settings } from '../../../core/settings.js';
import { PipelineError } from '../../../exceptions.js';

const NOISE_PATH_SEGMENTS = ['node_modules/', 'dist/', 'build/', '.next/', 'vendor/'];
const NOISE_EXTENSIONS = [
  '.lock', '.map', '.min.js',
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.zip', '.db', '.exe', '.node',
];
const NOISE_BASENAMES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

/** Skip vendored/generated/binary files so they don't crowd out real source changes. */
function isNoiseFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (NOISE_PATH_SEGMENTS.some(seg => lower.includes(seg))) return true;
  if (NOISE_BASENAMES.some(name => lower.endsWith('/' + name) || lower === name)) return true;
  if (NOISE_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
  return false;
}

/**
 * Stage 1: Fetch PR diff files from GitHub.
 */
export class FetchDiffStage implements PipelineStage {
  async execute(context: PipelineContext): Promise<PipelineContext> {
    try {
      const fetcher = new DiffFetcher(context.job.githubToken, context.job.apiBaseUrl);
      const allFiles = await fetcher.fetchFiles(
        context.job.owner,
        context.job.repo,
        context.job.prNumber
      );

      // Ignore vendored/generated noise before applying the analysis cap, so a
      // large dependency diff can't crowd out the actual source changes.
      const relevantFiles = allFiles.filter(
        f => !isNoiseFile((f.filename as string | undefined) || '')
      );

      // Limit files to process
      context.files = relevantFiles.slice(0, Math.max(settings.maxLlmChunks, 1));
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
