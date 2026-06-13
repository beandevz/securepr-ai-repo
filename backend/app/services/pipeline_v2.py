"""New pipeline using orchestrator pattern."""
from typing import Dict, Any
from app.queue.models import Job
from app.services.pipeline.orchestrator import PipelineOrchestrator


def process_job(job: Job) -> Dict[str, Any]:
    """
    Process security review job using pipeline orchestrator.

    Args:
        job: Job with PR details

    Returns:
        Dictionary with overall severity, failure status, and finding count
    """
    orchestrator = PipelineOrchestrator()
    return orchestrator.execute(job)
