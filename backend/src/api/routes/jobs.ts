import { Router, Request, Response } from 'express';
import { jobStore } from '../../queue/job-store.js';

const router = Router();

// Scans of closed/merged PRs are hidden by default; ?include_closed=true shows them.
router.get('/jobs', async (req: Request, res: Response) => {
  const includeClosed = String(req.query.include_closed).toLowerCase() === 'true';
  res.json(await jobStore.list({ includeClosed }));
});

router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  const job = await jobStore.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ detail: 'Job not found' });
    return;
  }
  res.json(job);
});

router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
  const ok = await jobStore.delete(req.params.jobId);
  if (!ok) {
    res.status(404).json({ detail: 'Job not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
