"""Queue Provider Protocol for job processing."""
from typing import Protocol
from app.queue.models import Job


class QueueProvider(Protocol):
    """Protocol for queue implementations (in-process, Azure Service Bus, etc.)."""

    async def enqueue(self, job: Job) -> None:
        """
        Add a job to the queue.

        Args:
            job: Job to enqueue for processing
        """
        ...

    async def start(self) -> None:
        """Start the queue consumer/worker."""
        ...

    async def stop(self) -> None:
        """Stop the queue consumer/worker gracefully."""
        ...

    def is_healthy(self) -> bool:
        """
        Check if queue is operational.

        Returns:
            True if queue is healthy, False otherwise
        """
        ...
