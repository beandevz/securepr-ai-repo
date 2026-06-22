import { InProcQueue, ServiceBusQueue } from './manager.js';
import { settings } from '../core/settings.js';

interface QueueLike {
  enqueue(job: import('./models.js').Job): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

let _queueInstance: QueueLike | null = null;

export function getQueueInstance(): QueueLike {
  if (!_queueInstance) {
    const provider = settings.queueProvider.toLowerCase();
    if (provider === 'inproc') {
      _queueInstance = new InProcQueue();
    } else if (provider === 'azure_servicebus') {
      _queueInstance = new ServiceBusQueue();
    } else {
      throw new Error(`Unknown queue provider: ${provider}`);
    }
  }
  return _queueInstance;
}

export function resetQueueInstance(): void {
  _queueInstance = null;
}
