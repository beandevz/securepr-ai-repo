import { Router, Request, Response } from 'express';
import { settings } from '../../core/settings.js';
import { verifyHmacSha256 } from '../../core/security.js';
import { IngestService } from '../../services/ingest-service.js';
import { ValidationError } from '../../exceptions.js';

const router = Router();

router.post('/ingest/github-actions', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ detail: 'Missing raw body' });
      return;
    }

    const signature = req.headers['x-securepr-signature'] as string | undefined;
    if (!verifyHmacSha256(settings.securePrIngestSecret, rawBody, signature)) {
      res.status(401).json({ detail: 'Invalid signature' });
      return;
    }

    // Parse payload
    const payload = req.body;

    // Validate and extract PR details
    let owner: string, repoName: string, prNumber: number, headSha: string;
    try {
      [owner, repoName, prNumber, headSha] = IngestService.validateGithubPayload(payload);
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).json({ detail: e.message });
        return;
      }
      throw e;
    }

    // Get GitHub token
    const token = (req.headers['x-securepr-github-token'] as string) || settings.githubToken;
    if (!token) {
      res.status(400).json({ detail: 'Missing GitHub token' });
      return;
    }

    // Create check run or commit status
    const mode = settings.statusReportingMode.toLowerCase();
    const checkRunId = await IngestService.createCheckRunIfEnabled(
      token, owner, repoName, headSha, mode
    );

    // Create job
    const job = IngestService.createJob(
      owner, repoName, prNumber, headSha, token, payload, checkRunId, mode
    );

    // Enqueue for processing
    await IngestService.enqueueJob(job);

    res.json({
      ok: true,
      queued: true,
      job_id: job.jobId,
      check_run_id: checkRunId,
      mode,
    });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
