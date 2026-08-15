import { Router, Request, Response } from 'express';
import { settings } from '../../core/settings.js';
import { verifyHmacSha256, decryptSecret } from '../../core/security.js';
import { IngestService } from '../../services/ingest-service.js';
import { getRepoByOwnerName } from '../../repos/store.js';
import { jobStore } from '../../queue/job-store.js';
import {
  GITHUB_DOTCOM_HOST,
  apiBaseUrlForHost,
  hostFromWebhookPayload,
  isAllowedHost,
} from '../../integrations/github/host.js';
import { ValidationError } from '../../exceptions.js';

const router = Router();

router.post('/ingest/github-actions', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature. Native GitHub webhooks sign with
    // X-Hub-Signature-256; the custom relay path signs with X-SecurePR-Signature.
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ detail: 'Missing raw body' });
      return;
    }

    const signature = (req.headers['x-hub-signature-256'] || req.headers['x-securepr-signature']) as string | undefined;
    if (!verifyHmacSha256(settings.securePrIngestSecret, rawBody, signature)) {
      res.status(401).json({ detail: 'Invalid signature' });
      return;
    }

    // GitHub sends a "ping" event when a webhook is first created — ack it, no PR to process.
    if (req.headers['x-github-event'] === 'ping') {
      res.json({ ok: true, pong: true });
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

    // Which GitHub instance sent this? Header override (relay path) > the host
    // embedded in the payload's repository URLs > github.com.
    const headerHost = (req.headers['x-securepr-github-host'] as string | undefined)?.trim();
    const payloadHost = headerHost || hostFromWebhookPayload(payload);
    if (payloadHost && !isAllowedHost(payloadHost)) {
      res.status(400).json({ detail: `GitHub host '${payloadHost}' is not allowed` });
      return;
    }
    const host = (payloadHost || GITHUB_DOTCOM_HOST).toLowerCase();

    // Only open PRs are reviewed. A close/merge also retires this PR's earlier
    // scans so they stop showing up in the scan list.
    if (IngestService.isPullRequestClosed(payload)) {
      const hidden = await jobStore.markPrClosed(owner, repoName, prNumber, host);
      res.json({ ok: true, queued: false, skipped: 'pr_closed', hidden_scans: hidden });
      return;
    }

    // Get GitHub token: explicit header > stored token for this connected repo > global fallback
    let token = req.headers['x-securepr-github-token'] as string | undefined;
    if (!token) {
      const connectedRepo = await getRepoByOwnerName(owner, repoName, host);
      if (connectedRepo) {
        token = decryptSecret(connectedRepo.encrypted_token);
      }
    }
    token = token || settings.githubToken;
    if (!token) {
      res.status(400).json({ detail: 'Missing GitHub token' });
      return;
    }

    const apiBaseUrl = apiBaseUrlForHost(host);

    // Create check run or commit status
    const mode = settings.statusReportingMode.toLowerCase();
    const checkRunId = await IngestService.createCheckRunIfEnabled(
      token, owner, repoName, headSha, mode, apiBaseUrl
    );

    // Create job
    const job = await IngestService.createJob(
      owner, repoName, prNumber, headSha, token, payload, checkRunId, mode, host, apiBaseUrl
    );

    // Enqueue for processing
    await IngestService.enqueueJob(job);

    res.json({
      ok: true,
      queued: true,
      job_id: job.jobId,
      check_run_id: checkRunId,
      mode,
      host,
    });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
