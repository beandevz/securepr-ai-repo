import { Router, Request, Response } from 'express';
import * as repoService from '../../services/repo-service.js';
import { SecurePRError, ValidationError, VCSIntegrationError, ConfigurationError } from '../../exceptions.js';

const router = Router();

function handleError(err: unknown, res: Response): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ detail: err.message });
    return;
  }
  if (err instanceof VCSIntegrationError) {
    res.status(422).json({ detail: err.message });
    return;
  }
  if (err instanceof ConfigurationError) {
    res.status(400).json({ detail: err.message });
    return;
  }
  if (err instanceof SecurePRError) {
    res.status(500).json({ detail: err.message });
    return;
  }
  console.error('Repos route error:', err);
  res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
}

// ─── POST /repos ────────────────────────────────────────────────────────────

router.post('/repos', async (req: Request, res: Response) => {
  try {
    const { repoUrl, githubToken } = req.body as { repoUrl?: string; githubToken?: string };
    if (!repoUrl) {
      res.status(400).json({ detail: 'repoUrl is required' });
      return;
    }
    const repo = await repoService.connectRepo(repoUrl, githubToken || '');
    res.json(repo);
  } catch (err) {
    handleError(err, res);
  }
});

// ─── GET /repos ─────────────────────────────────────────────────────────────

router.get('/repos', async (_req: Request, res: Response) => {
  try {
    const repos = await repoService.listRepos();
    res.json(repos);
  } catch (err) {
    handleError(err, res);
  }
});

// ─── POST /repos/:id/webhook ────────────────────────────────────────────────

router.post('/repos/:id/webhook', async (req: Request, res: Response) => {
  try {
    const repo = await repoService.configureWebhook(req.params.id);
    res.json(repo);
  } catch (err) {
    handleError(err, res);
  }
});

// ─── DELETE /repos/:id ──────────────────────────────────────────────────────

router.delete('/repos/:id', async (req: Request, res: Response) => {
  try {
    const { found, deletedScans } = await repoService.disconnectRepo(req.params.id);
    if (!found) {
      res.status(404).json({ detail: 'Repository not found' });
      return;
    }
    res.json({ ok: true, deleted_scans: deletedScans });
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
