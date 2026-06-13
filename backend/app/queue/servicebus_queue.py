import json
from azure.servicebus import ServiceBusClient, ServiceBusMessage
from app.core.config import settings
from app.queue.models import Job


def enqueue(job: Job) -> None:
    if not settings.servicebus_connection_string:
        raise ValueError('SERVICEBUS_CONNECTION_STRING not set')
    msg = ServiceBusMessage(json.dumps(job.__dict__))
    with ServiceBusClient.from_connection_string(settings.servicebus_connection_string) as client:
        sender = client.get_queue_sender(settings.servicebus_queue_name)
        with sender:
            sender.send_messages(msg)
