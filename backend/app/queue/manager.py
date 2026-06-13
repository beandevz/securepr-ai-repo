"""Queue manager with proper lifecycle and no global state."""
import asyncio
from typing import Optional
from app.core.config import settings
from app.queue.models import Job
from app.queue.job_store import job_store


class InProcQueue:
    """In-process queue implementation with proper lifecycle management."""

    def __init__(self, maxsize: Optional[int] = None):
        """
        Initialize in-process queue.

        Args:
            maxsize: Maximum queue size (defaults to config setting)
        """
        self.maxsize = maxsize or max(settings.inproc_queue_maxsize, 1)
        self._queue: Optional[asyncio.Queue] = None
        self._consumer_task: Optional[asyncio.Task] = None
        self._is_running = False

    def _get_or_create_queue(self) -> asyncio.Queue:
        """Get or create the asyncio queue."""
        if self._queue is None:
            self._queue = asyncio.Queue(maxsize=self.maxsize)
        return self._queue

    async def enqueue(self, job: Job) -> None:
        """
        Add job to queue.

        Args:
            job: Job to enqueue
        """
        queue = self._get_or_create_queue()
        job_store.set_status(job.job_id, "queued")
        await queue.put(job)

    async def _consumer_loop(self) -> None:
        """Background consumer that processes jobs from queue."""
        from app.services.pipeline import process_job

        queue = self._get_or_create_queue()

        while self._is_running:
            try:
                # Wait for job with timeout to check running flag periodically
                job: Job = await asyncio.wait_for(queue.get(), timeout=1.0)

                try:
                    job_store.set_status(job.job_id, "running")
                    result = process_job(job)
                    job_store.set_result(job.job_id, result)
                except Exception as e:
                    job_store.set_error(job.job_id, str(e))
                finally:
                    queue.task_done()

            except asyncio.TimeoutError:
                # Timeout is normal - just check if we should keep running
                continue
            except Exception as e:
                # Log unexpected errors but keep running
                print(f"Queue consumer error: {e}")
                continue

    async def start(self) -> None:
        """Start the queue consumer."""
        if self._is_running:
            return

        self._is_running = True
        self._consumer_task = asyncio.create_task(self._consumer_loop())

    async def stop(self) -> None:
        """Stop the queue consumer gracefully."""
        self._is_running = False

        if self._consumer_task:
            await self._consumer_task
            self._consumer_task = None

    def is_healthy(self) -> bool:
        """Check if queue is operational."""
        return self._is_running and self._consumer_task is not None

    async def __aenter__(self):
        """Context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.stop()


class ServiceBusQueue:
    """Azure Service Bus queue implementation (placeholder)."""

    def __init__(self):
        """Initialize Service Bus queue."""
        self._is_running = False

    async def enqueue(self, job: Job) -> None:
        """Enqueue job to Service Bus."""
        # TODO: Implement Service Bus enqueue
        raise NotImplementedError("Service Bus queue not yet implemented")

    async def start(self) -> None:
        """Start Service Bus consumer."""
        self._is_running = True
        # TODO: Implement Service Bus consumer

    async def stop(self) -> None:
        """Stop Service Bus consumer."""
        self._is_running = False
        # TODO: Implement graceful shutdown

    def is_healthy(self) -> bool:
        """Check Service Bus health."""
        return self._is_running

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
