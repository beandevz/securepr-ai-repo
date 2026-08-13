import { Router, Request, Response } from 'express';
import { getCommitStatus, getCheckRuns } from '../../integrations/github/status-client.js';
import { GITHUB_DOTCOM_HOST, apiBaseUrlForHost, isAllowedHost } from '../../integrations/github/host.js';

const router = Router();

router.get('/github/status/:owner/:repo/:sha', async (req: Request, res: Response) => {
  try {
    const { owner, repo, sha } = req.params;
    const token = req.query.token as string;
    const host = ((req.query.host as string) || GITHUB_DOTCOM_HOST).toLowerCase();

    if (!token) {
      res.status(400).json({ detail: 'Missing token query parameter' });
      return;
    }
    // The caller's token is forwarded to this host, so it must be allow-listed.
    if (!isAllowedHost(host)) {
      res.status(400).json({ detail: `GitHub host '${host}' is not allowed` });
      return;
    }

    const apiBaseUrl = apiBaseUrlForHost(host);
    const status = await getCommitStatus(owner, repo, sha, token, apiBaseUrl);
    const checks = await getCheckRuns(owner, repo, sha, token, apiBaseUrl);

    res.json({
      host,
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
