import json, time
from azure.servicebus import ServiceBusClient
from app.core.config import settings
from app.queue.models import Job
from app.services.pipeline import process_job


def main():
    if not settings.servicebus_connection_string:
        raise SystemExit('SERVICEBUS_CONNECTION_STRING not set')
    with ServiceBusClient.from_connection_string(settings.servicebus_connection_string) as client:
        receiver = client.get_queue_receiver(settings.servicebus_queue_name)
        with receiver:
            while True:
                msgs = receiver.receive_messages(max_message_count=5, max_wait_time=10)
                for msg in msgs:
                    try:
                        job = Job(**json.loads(str(msg)))
                        process_job(job)
                        receiver.complete_message(msg)
                    except Exception:
                        receiver.abandon_message(msg)
                time.sleep(0.5)

if __name__ == '__main__':
    main()
