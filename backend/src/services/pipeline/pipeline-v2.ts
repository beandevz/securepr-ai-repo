import { Job } from '../../queue/models.js';
import { PipelineOrchestrator } from './orchestrator.js';

/**
 * Process security review job using pipeline orchestrator.
 */
export async function processJob(job: Job): Promise<Record<string, unknown>> {
  const orchestrator = new PipelineOrchestrator();
  return orchestrator.execute(job);
}
