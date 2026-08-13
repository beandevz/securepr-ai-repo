import { Job } from './models.js';
import { jobStore } from './job-store.js';
import { settings } from '../core/settings.js';

/**
 * In-process queue implementation with proper lifecycle management.
 */
export class InProcQueue {
  private maxsize: number;
  private queue: Job[] = [];
  private isRunning = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxsize?: number) {
    this.maxsize = maxsize || Math.max(settings.inprocQueueMaxsize, 1);
  }

  async enqueue(job: Job): Promise<void> {
    if (this.queue.length >= this.maxsize) {
      throw new Error('Queue is full');
    }
    await jobStore.setStatus(job.jobId, 'queued');
    this.queue.push(job);
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) return;

    const job = this.queue.shift()!;
    try {
      await jobStore.setStatus(job.jobId, 'running');
      const { processJob } = await import('../services/pipeline/pipeline-v2.js');
      const result = await processJob(job);
      await jobStore.setResult(job.jobId, result);
    } catch (e) {
      await jobStore.setError(job.jobId, (e as Error).message);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.pollTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.processNext().catch(err => {
          console.error('Queue consumer error:', err);
        });
      }
    }, 1000);
    console.log('[InProcQueue] Consumer started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  isHealthy(): boolean {
    return this.isRunning;
  }
}

/**
 * Azure Service Bus queue implementation (placeholder).
 */
export class ServiceBusQueue {
  private isRunning = false;

  async enqueue(_job: Job): Promise<void> {
    throw new Error('Service Bus queue not yet implemented');
  }

  async start(): Promise<void> {
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  isHealthy(): boolean {
    return this.isRunning;
  }
}
