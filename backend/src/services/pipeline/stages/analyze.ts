import { PipelineContext, PipelineStage } from '../base.js';
import { createAnalyzers } from '../../analyzers/factory.js';
import { RagService } from '../../rag-service.js';
import { buildRagQueries } from '../../rag-query.js';

/**
 * Stage 2: Run security analyzers on diff files.
 */
export class AnalyzeStage implements PipelineStage {
  async execute(context: PipelineContext): Promise<PipelineContext> {
    const rag = new RagService();

    for (const fileItem of context.files) {
      const path = fileItem.filename as string | undefined;
      const patch = fileItem.patch as string | undefined;

      if (!path || !patch) {
        continue;
      }

      // Get RAG context. retrieve() never throws: when no relevant policy is
      // available it returns an empty context plus the reason, and the review
      // continues on general secure-coding knowledge.
      const ragContext = await rag.retrieve(buildRagQueries(path, patch));
      context.ragStatuses.push(ragContext.status);
      if (ragContext.status !== 'ok') {
        console.log(`[RAG] No policy context for ${path} (${ragContext.status})`);
      }

      // Create analyzers with RAG context
      const analyzers = createAnalyzers(ragContext);

      // Run all analyzers
      for (const analyzer of analyzers) {
        const findings = await analyzer.analyze(path, patch);
        context.findings.push(...findings);
      }
    }

    return context;
  }

  getName(): string {
    return 'AnalyzeStage';
  }
}
