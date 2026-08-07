import { v4 as uuidv4 } from 'uuid';
import { settings } from '../core/settings.js';
import { ValidationError } from '../exceptions.js';
import { Job } from '../queue/models.js';
import { jobStore } from '../queue/job-store.js';
import { ChecksPublisher } from '../integrations/github/checks-publisher.js';

/**
 * Service for handling webhook ingestion and job creation.
 */
export class IngestService {
  /**
   * Validate and extract GitHub webhook payload.
   */
  static validateGithubPayload(
    payload: Record<string, unknown>
  ): [string, string, number, string] {
    const pr = (payload.pull_request as Record<string, unknown>) || {};
    const repo = (payload.repository as Record<string, unknown>) || {};
    const fullName = (repo.full_name as string) || '';

    if (!fullName.includes('/')) {
      throw new ValidationError('Missing repository.full_name', { payload });
    }

    const [owner, repoName] = fullName.split('/', 2);

    const prNumber = parseInt(
      String((pr.number as number) || (payload.number as number) || 0), 10
    );
    if (prNumber <= 0) {
      throw new ValidationError('Missing PR number', { payload });
    }

    const head = (pr.head as Record<string, unknown>) || {};
    const headSha = (head.sha as string) || '';
    if (!headSha) {
      throw new ValidationError('Missing pull_request.head.sha', { payload });
    }

    return [owner, repoName, prNumber, headSha];
  }

  /**
   * Create GitHub check run or commit status if enabled.
   */
  static async createCheckRunIfEnabled(
    token: string,
    owner: string,
    repo: string,
    headSha: string,
    mode: string
  ): Promise<number | null> {
    if (!settings.statusReportingEnabled) {
      return null;
    }

    const checks = new ChecksPublisher(token);

    try {
      if (mode === 'check_run') {
        return await checks.createCheckRun(owner, repo, {
          name: settings.statusCheckName,
          headSha,
          detailsUrl: settings.statusDetailsUrl,
        });
      } else {
        await checks.createCommitStatus(owner, repo, headSha, {
          state: 'pending',
          context: settings.statusCheckName,
          description: 'SecurePR AI is running',
          targetUrl: settings.statusDetailsUrl,
        });
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Create a security review job.
   */
  static async createJob(
    owner: string,
    repo: string,
    prNumber: number,
    headSha: string,
    token: string,
    payload: Record<string, unknown>,
    checkRunId: number | null,
    statusMode: string
  ): Promise<Job> {
    const jobId = 'job_' + uuidv4().replace(/-/g, '');

    // Create job record for UI monitoring
    await jobStore.create({
      jobId,
      owner,
      repo,
      prNumber,
      headSha,
    });

    return {
      jobId,
      owner,
      repo,
      prNumber,
      headSha,
      githubToken: token,
      payload,
      checkRunId,
      statusMode,
    };
  }

  /**
   * Enqueue job for processing.
   */
  static async enqueueJob(job: Job): Promise<void> {
    // Get the global queue instance
    const { getQueueInstance } = await import('../queue/instance.js');
    const queue = getQueueInstance();
    await queue.enqueue(job);
  }
}
