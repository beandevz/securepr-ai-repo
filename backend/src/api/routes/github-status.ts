import { Router, Request, Response } from 'express';
import { getCommitStatus, getCheckRuns } from '../../integrations/github/status-client.js';

const router = Router();

router.get('/github/status/:owner/:repo/:sha', async (req: Request, res: Response) => {
  try {
    const { owner, repo, sha } = req.params;
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ detail: 'Missing token query parameter' });
      return;
    }

    const status = await getCommitStatus(owner, repo, sha, token);
    const checks = await getCheckRuns(owner, repo, sha, token);

    res.json({
      state: (status as Record<string, unknown>).state,
      statuses: (status as Record<string, unknown>).statuses || [],
      check_runs: (checks as Record<string, unknown>).check_runs || [],
    });
  } catch (err) {
    console.error('GitHub status error:', err);
    res.status(500).json({ detail: 'Failed to fetch GitHub status' });
  }
});

export default router;
