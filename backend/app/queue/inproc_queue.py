"""
DEPRECATED: Use app.queue.manager.InProcQueue instead.

This module is kept for backward compatibility but will be removed in future versions.
"""
import warnings
from app.queue.manager import InProcQueue
from app.queue.models import Job

warnings.warn(
    "app.queue.inproc_queue is deprecated. Use app.queue.manager.InProcQueue instead.",
    DeprecationWarning,
    stacklevel=2
)

# Global instance for backward compatibility
_queue_instance: InProcQueue | None = None


async def enqueue(job: Job) -> None:
    """Deprecated: Use InProcQueue.enqueue() instead."""
    global _queue_instance
    if _queue_instance is None:
        _queue_instance = InProcQueue()
        await _queue_instance.start()
    await _queue_instance.enqueue(job)


async def start_inproc_consumer() -> None:
    """Deprecated: Use InProcQueue.start() instead."""
    global _queue_instance
    if _queue_instance is None:
        _queue_instance = InProcQueue()
    await _queue_instance.start()