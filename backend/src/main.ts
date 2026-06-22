import express from 'express';
import cors from 'cors';
import { settings } from './core/settings.js';
import { getQueueInstance } from './queue/instance.js';

// Import routes
import healthRouter from './api/routes/health.js';
import ingestRouter from './api/routes/ingest.js';
import jobsRouter from './api/routes/jobs.js';
import githubStatusRouter from './api/routes/github-status.js';
import ragRouter from './api/routes/rag.js';

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// Middleware
app.use(cors());

// Parse JSON with raw body capture for HMAC verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    },
  })
);

// Routes
app.use(healthRouter);
app.use(ingestRouter);
app.use(jobsRouter);
app.use(githubStatusRouter);
app.use(ragRouter);

// Startup
async function startup() {
  // Start queue consumer if using in-process queue
  if (settings.queueProvider.toLowerCase() === 'inproc') {
    const queue = getQueueInstance();
    await queue.start();
    console.log('[Startup] In-process queue consumer started');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received, shutting down...');
  try {
    const queue = getQueueInstance();
    await queue.stop();
  } catch { /* ignore */ }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Shutdown] SIGINT received, shutting down...');
  try {
    const queue = getQueueInstance();
    await queue.stop();
  } catch { /* ignore */ }
  process.exit(0);
});

// Start server
startup()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SecurePR AI backend (Node.js) running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });

export default app;
