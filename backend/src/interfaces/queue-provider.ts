import { Job } from '../queue/models.js';

/**
 * Queue Provider interface for job processing.
 */
export interface QueueProvider {
  /** Add a job to the queue. */
  enqueue(job: Job): Promise<void>;
  /** Start the queue consumer/worker. */
  start(): Promise<void>;
  /** Stop the queue consumer/worker gracefully. */
  stop(): Promise<void>;
  /** Check if queue is operational. */
  isHealthy(): boolean;
}
