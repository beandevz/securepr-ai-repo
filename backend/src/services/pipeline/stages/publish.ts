import { PipelineContext, PipelineStage } from '../base.js';
import { ReviewPublisher } from '../../../integrations/github/review-publisher.js';
import { ChecksPublisher } from '../../../integrations/github/checks-publisher.js';
import { collectCitedSources, formatInlineComment, formatSummary } from '../../../utils/formatters.js';
import { summarizeRagStatuses } from '../../rag-service.js';
import { settings } from '../../../core/settings.js';

/**
 * Stage 4: Publish findings to GitHub PR.
 */
export class PublishStage implements PipelineStage {
  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Build inline comments
    const comments: Record<string, unknown>[] = [];
    const limitedFindings = context.findings.slice(0, settings.maxInlineComments);
    for (const finding of limitedFindings) {
      comments.push({
        path: finding.file_path,
        body: formatInlineComment(finding),
        line: Math.max(finding.location?.start_line ?? 1, 1),
        side: 'RIGHT',
      });
    }

    // Build summary
    const summary = this.buildSummary(context);

    // Publish review (best-effort: a publishing failure must not block the
    // status/check-run update below, which is the actual merge-gate signal).
    const publisher = new ReviewPublisher(context.job.githubToken, context.job.apiBaseUrl);
    try {
      await publisher.createReview(
        context.job.owner,
        context.job.repo,
        context.job.prNumber,
        {
          commitId: context.job.headSha,
          body: summary,
          comments,
        }
      );
    } catch (err) {
      console.error('createReview failed, falling back to issue comment:', (err as Error).message);
      try {
        // Fallback: post as issue comment + individual review comments
        await publisher.postIssueComment(
          context.job.owner,
          context.job.repo,
          context.job.prNumber,
          summary
        );
        for (const comment of comments) {
          try {
            await publisher.createReviewComment(
              context.job.owner,
              context.job.repo,
              context.job.prNumber,
              {
                commitId: context.job.headSha,
                path: comment.path as string,
                line: comment.line as number,
                body: comment.body as string,
                side: (comment.side as string) || 'RIGHT',
              }
            );
          } catch {
            continue;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback publish also failed:', (fallbackErr as Error).message);
      }
    }

    // Update status check/run
    if (settings.statusReportingEnabled) {
      await this.updateStatus(context);
    }

    return context;
  }

  /** Review body and check-run summary must tell the same story, including RAG grounding. */
  private buildSummary(context: PipelineContext): string {
    const ragStatus = summarizeRagStatuses(context.ragStatuses);

    return formatSummary(
      context.overallSeverity,
      context.findings.length,
      context.shouldFail,
      settings.mergeGateMinSeverity,
      ragStatus
        ? { status: ragStatus, citedSources: collectCitedSources(context.findings) }
        : undefined
    );
  }

  private async updateStatus(context: PipelineContext): Promise<void> {
    const checks = new ChecksPublisher(context.job.githubToken, context.job.apiBaseUrl);
    const mode = (context.job.statusMode || settings.statusReportingMode).toLowerCase();

    const conclusion = context.shouldFail ? 'failure' : 'success';
    const summary = this.buildSummary(context);

    try {
      if (mode === 'check_run' && context.job.checkRunId) {
        await checks.updateCheckRun(
          context.job.owner,
          context.job.repo,
          context.job.checkRunId,
          {
            conclusion,
            summary,
            detailsUrl: settings.statusDetailsUrl,
          }
        );
      } else {
        const state = context.shouldFail ? 'failure' : 'success';
        await checks.createCommitStatus(
          context.job.owner,
          context.job.repo,
          context.job.headSha,
          {
            state,
            context: settings.statusCheckName,
            description: `SecurePR AI: ${context.overallSeverity}`,
            targetUrl: settings.statusDetailsUrl,
          }
        );
      }
    } catch {
      // Silently ignore status update failures
    }
  }

  getName(): string {
    return 'PublishStage';
  }
}
