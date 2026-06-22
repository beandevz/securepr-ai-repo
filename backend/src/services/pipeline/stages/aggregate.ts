import { PipelineContext, PipelineStage } from '../base.js';
import { getMaxSeverity, shouldFailGate } from '../../../utils/severity.js';
import { settings } from '../../../core/settings.js';

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
    };

    return context;
  }

  getName(): string {
    return 'AggregateStage';
  }
}
