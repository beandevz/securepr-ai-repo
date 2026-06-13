"""Stage 2: Analyze code for security issues."""
from app.services.pipeline.base import PipelineContext
from app.services.analyzers.factory import create_analyzers
from app.services.rag_service import RagService


class AnalyzeStage:
    """Run security analyzers on diff files."""

    def execute(self, context: PipelineContext) -> PipelineContext:
        """Analyze files and collect findings."""
        rag = RagService()

        for file_item in context.files:
            path = file_item.get("filename")
            patch = file_item.get("patch")

            if not path or not patch:
                continue

            # Get RAG context
            rag_query = f"{path}\n{patch[:1500]}"
            rag_text = rag.retrieve(query_text=rag_query)

            # Create analyzers with RAG context
            analyzers = create_analyzers(rag_context=rag_text)

            # Run all analyzers
            for analyzer in analyzers:
                findings = analyzer.analyze(path, patch)
                context.findings.extend(findings)

        return context

    def get_name(self) -> str:
        return "AnalyzeStage"
