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

// Bulk delete. Irreversible, so it refuses to run without ?confirm=true;
// ?status= / ?pr_state= narrow it to one group (e.g. clearing failed jobs).
router.delete('/jobs', async (req: Request, res: Response) => {
  if (String(req.query.confirm).toLowerCase() !== 'true') {
    res.status(400).json({
      detail: 'Refusing to delete jobs without confirmation. Repeat with ?confirm=true',
    });
    return;
  }

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const prState = typeof req.query.pr_state === 'string' ? req.query.pr_state : undefined;

  const deleted = await jobStore.deleteAll({ status, prState });
  res.json({ ok: true, deleted, filter: { status: status || null, pr_state: prState || null } });
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
