import { Finding } from '../../../domain/models.js';
import { PipelineContext, PipelineStage } from '../base.js';
import { getMaxSeverity, shouldFailGate } from '../../../utils/severity.js';
import { settings } from '../../../core/settings.js';

/** Shape the result-viewer UI (ResultViewerPageEnhanced/GitHubPRViewPage) expects per finding. */
function toUiFinding(f: Finding): Record<string, unknown> {
  return {
    severity: f.severity,
    title: f.title,
    file_path: f.file_path,
    line_start: f.location?.start_line,
    line_end: f.location?.end_line,
    description: f.risk,
    risk: f.risk,
    recommendation: f.recommendation,
    vulnerable_code: (f.evidence || []).map(e => e.code).join('\n'),
    safe_fix: f.safe_fix_example,
    owasp_category: f.owasp_top10_2025,
    confidence: f.confidence,
    references: f.references || [],
  };
}

/**
 * Stage 3: Aggregate findings and calculate overall severity.
 */
export class AggregateStage implements PipelineStage {
  async execute(context: PipelineContext): Promise<PipelineContext> {
    context.overallSeverity = getMaxSeverity(context.findings);
    context.shouldFail = shouldFailGate(
      context.overallSeverity,
      settings.mergeGateMinSeverity
    );

    context.metadata = {
      overall: context.overallSeverity,
      should_fail: context.shouldFail,
      count: context.findings.length,
      findings: context.findings.map(toUiFinding),
    };

    return context;
  }

  getName(): string {
    return 'AggregateStage';
  }
}
