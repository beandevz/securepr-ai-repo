"""Factory for creating queue provider instances."""
from typing import Optional
from app.core.config import settings
from app.interfaces.queue_provider import QueueProvider


_queue_instance: Optional[QueueProvider] = None


def create_queue_provider() -> QueueProvider:
    """
    Factory method to create queue provider based on configuration.

    Returns:
        Queue provider instance (singleton)
    """
    global _queue_instance

    if _queue_instance is not None:
        return _queue_instance

    provider = settings.queue_provider.lower()

    if provider == 'inproc':
        from app.queue.inproc_queue import InProcQueue
        _queue_instance = InProcQueue()
    elif provider == 'azure_servicebus':
        from app.queue.servicebus_queue import ServiceBusQueue
        _queue_instance = ServiceBusQueue()
    else:
        raise ValueError(f"Unknown queue provider: {provider}")

    return _queue_instance


def reset_queue_provider() -> None:
    """Reset singleton instance (useful for testing)."""
    global _queue_instance
    _queue_instance = None
