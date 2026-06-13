"""Stage 1: Fetch diff from VCS."""
from app.services.pipeline.base import PipelineContext
from app.services.diff_fetcher import DiffFetcher
from app.core.config import settings
from app.exceptions import PipelineError


class FetchDiffStage:
    """Fetch PR diff files from GitHub."""

    def execute(self, context: PipelineContext) -> PipelineContext:
        """Fetch diff files and add to context."""
        try:
            fetcher = DiffFetcher(context.job.github_token)
            context.files = fetcher.fetch_files(
                context.job.owner,
                context.job.repo,
                context.job.pr_number
            )

            # Limit files to process
            context.files = context.files[:max(settings.max_llm_chunks, 1)]

        except Exception as e:
            raise PipelineError(
                f"Failed to fetch diff: {str(e)}",
                {"job_id": context.job.job_id}
            )

        return context

    def get_name(self) -> str:
        return "FetchDiffStage"
