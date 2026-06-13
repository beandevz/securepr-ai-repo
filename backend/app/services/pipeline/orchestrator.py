"""Pipeline orchestrator - chains stages together."""
from typing import List, Dict, Any
from app.queue.models import Job
from app.services.pipeline.base import PipelineStage, PipelineContext
from app.services.pipeline.stages.fetch_diff import FetchDiffStage
from app.services.pipeline.stages.analyze import AnalyzeStage
from app.services.pipeline.stages.aggregate import AggregateStage
from app.services.pipeline.stages.publish import PublishStage
from app.exceptions import PipelineError


class PipelineOrchestrator:
    """
    Orchestrates security analysis pipeline stages.

    Pipeline: Fetch Diff → Analyze → Aggregate → Publish
    """

    def __init__(self):
        """Initialize pipeline with default stages."""
        self.stages: List[PipelineStage] = [
            FetchDiffStage(),
            AnalyzeStage(),
            AggregateStage(),
            PublishStage(),
        ]

    def execute(self, job: Job) -> Dict[str, Any]:
        """
        Execute full pipeline for a job.

        Args:
            job: Job with PR details

        Returns:
            Dictionary with pipeline results

        Raises:
            PipelineError: If any stage fails
        """
        context = PipelineContext(job)

        # Execute each stage in sequence
        for stage in self.stages:
            try:
                context = stage.execute(context)
            except Exception as e:
                raise PipelineError(
                    f"Stage {stage.get_name()} failed: {str(e)}",
                    {"job_id": job.job_id, "stage": stage.get_name()}
                )

        return context.metadata

    def add_stage(self, stage: PipelineStage) -> None:
        """Add a custom stage to pipeline."""
        self.stages.append(stage)

    def remove_stage(self, stage_name: str) -> None:
        """Remove a stage by name."""
        self.stages = [s for s in self.stages if s.get_name() != stage_name]
