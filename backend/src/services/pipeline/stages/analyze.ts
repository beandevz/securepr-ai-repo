import { PipelineContext, PipelineStage } from '../base.js';
import { createAnalyzers } from '../../analyzers/factory.js';
import { RagService } from '../../rag-service.js';

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

      // Get RAG context
      const ragQuery = `${path}\n${patch.substring(0, 1500)}`;
      const ragText = await rag.retrieve(ragQuery);

      // Create analyzers with RAG context
      const analyzers = createAnalyzers(ragText);

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
