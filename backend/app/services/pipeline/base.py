"""Base pipeline stage protocol."""
from typing import Protocol, Any, Dict
from app.queue.models import Job


class PipelineContext:
    """Context object passed between pipeline stages."""

    def __init__(self, job: Job):
        self.job = job
        self.files: list = []
        self.findings: list = []
        self.overall_severity: str = "LOW"
        self.should_fail: bool = False
        self.metadata: Dict[str, Any] = {}


class PipelineStage(Protocol):
    """Protocol for pipeline stages."""

    def execute(self, context: PipelineContext) -> PipelineContext:
        """
        Execute this pipeline stage.

        Args:
            context: Pipeline context with job and accumulated data

        Returns:
            Updated context for next stage
        """
        ...

    def get_name(self) -> str:
        """Get stage name for logging."""
        ...
