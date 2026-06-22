import { Router, Request, Response } from 'express';
import { jobStore } from '../../queue/job-store.js';

const router = Router();

router.get('/jobs', (_req: Request, res: Response) => {
  res.json(jobStore.list());
});

router.get('/jobs/:jobId', (req: Request, res: Response) => {
  const job = jobStore.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ detail: 'Job not found' });
    return;
  }
  res.json(job);
});

router.delete('/jobs/:jobId', (req: Request, res: Response) => {
  const ok = jobStore.delete(req.params.jobId);
  if (!ok) {
    res.status(404).json({ detail: 'Job not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
