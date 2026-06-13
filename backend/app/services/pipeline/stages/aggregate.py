"""Stage 3: Aggregate findings and determine severity."""
from app.services.pipeline.base import PipelineContext
from app.utils.severity import get_max_severity, should_fail_gate
from app.core.config import settings


class AggregateStage:
    """Aggregate findings and calculate overall severity."""

    def execute(self, context: PipelineContext) -> PipelineContext:
        """Calculate overall severity and gate decision."""
        context.overall_severity = get_max_severity(context.findings)
        context.should_fail = should_fail_gate(
            context.overall_severity,
            settings.merge_gate_min_severity
        )

        context.metadata = {
            'overall': context.overall_severity,
            'should_fail': context.should_fail,
            'count': len(context.findings)
        }

        return context

    def get_name(self) -> str:
        return "AggregateStage"
