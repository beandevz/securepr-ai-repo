import { settings } from '../core/settings.js';
import { encryptSecret, decryptSecret } from '../core/security.js';
import { RepoWebhookClient } from '../integrations/github/repo-client.js';
import { apiBaseUrlForHost, parseRepoUrl } from '../integrations/github/host.js';
import * as repoStore from '../repos/store.js';
import { jobStore } from '../queue/job-store.js';
import { ConnectedRepoSafe } from '../repos/store.js';
import { ValidationError, VCSIntegrationError, ConfigurationError } from '../exceptions.js';

export { parseRepoUrl };

function webhookTargetUrl(): string | undefined {
  return settings.publicBaseUrl
    ? `${settings.publicBaseUrl.replace(/\/$/, '')}/ingest/github-actions`
    : undefined;
}

/**
 * GitHub puts the useful part of a failure in the response body; the axios
 * message is only ever "Request failed with status code NNN".
 */
function githubErrorDetail(err: unknown): string {
  const data = (err as {
    response?: { data?: { message?: string; errors?: Array<{ message?: string }> } };
  }).response?.data;
  const parts = [data?.message, ...(data?.errors || []).map(e => e.message)].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : (err as Error).message;
}

/**
 * Creates the webhook, or adopts the existing one when GitHub rejects the
 * create as a duplicate (422), re-pointing it at our current secret and
 * events. Without this, reconnecting a repo that was ever connected - or
 * had a hook added by hand - fails permanently.
 */
async function ensureWebhook(
  client: RepoWebhookClient, owner: string, name: string, targetUrl: string
): Promise<number> {
  try {
    return await client.createWebhook(owner, name, targetUrl, settings.securePrIngestSecret);
  } catch (err) {
    if ((err as { response?: { status?: number } }).response?.status !== 422) {
      throw err;
    }
    const existing = (await client.listWebhooks(owner, name))
      .find(hook => hook.config?.url === targetUrl);
    if (!existing) {
      throw err;
    }
    await client.updateWebhook(owner, name, existing.id, targetUrl, settings.securePrIngestSecret);
    return existing.id;
  }
}

export async function connectRepo(repoUrl: string, githubToken: string): Promise<ConnectedRepoSafe> {
  if (!githubToken) {
    throw new ValidationError('githubToken is required');
  }
  const { host, owner, name } = parseRepoUrl(repoUrl);
  const apiBaseUrl = apiBaseUrlForHost(host);

  const client = new RepoWebhookClient(githubToken, apiBaseUrl);
  try {
    await client.getRepo(owner, name);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) {
      throw new VCSIntegrationError(`Token is invalid or lacks repo access on ${host}`);
    }
    if (status === 404) {
      throw new VCSIntegrationError('Repository not found (check the URL and token permissions)');
    }
    throw new VCSIntegrationError(`Failed to reach ${host}: ${(err as Error).message}`);
  }

  let repo: ConnectedRepoSafe;
  try {
    repo = await repoStore.insertRepo({
      owner,
      name,
      url: repoUrl,
      host,
      encryptedToken: encryptSecret(githubToken),
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'DUPLICATE_REPO') {
      throw new ValidationError('Repository already connected');
    }
    throw err;
  }

  const targetUrl = webhookTargetUrl();
  if (targetUrl) {
    try {
      const webhookId = await ensureWebhook(client, owner, name, targetUrl);
      repo = (await repoStore.setWebhook(repo.id, webhookId)) || repo;
    } catch (err) {
      console.error(
        `Auto-webhook creation failed for ${owner}/${name} (target ${targetUrl}): ` +
        githubErrorDetail(err)
      );
    }
  }

  return repo;
}

export async function listRepos(): Promise<ConnectedRepoSafe[]> {
  return repoStore.listRepos();
}

export async function configureWebhook(id: string): Promise<ConnectedRepoSafe> {
  const row = await repoStore.getRepoById(id);
  if (!row) {
    throw new ValidationError('Repository not found');
  }

  const targetUrl = webhookTargetUrl();
  if (!targetUrl) {
    throw new ConfigurationError('PUBLIC_BASE_URL is not configured on the server; cannot register a webhook');
  }

  const token = decryptSecret(row.encrypted_token);
  const client = new RepoWebhookClient(token, apiBaseUrlForHost(row.host || 'github.com'));
  let webhookId: number;
  try {
    webhookId = await ensureWebhook(client, row.owner, row.name, targetUrl);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) {
      throw new VCSIntegrationError(
        "GitHub token lacks permission to create webhooks. Grant it the 'admin:repo_hook' scope " +
        "(classic PAT) or 'Webhooks: read and write' (fine-grained PAT) and reconnect."
      );
    }
    throw new VCSIntegrationError(
      `Failed to create GitHub webhook for target ${targetUrl}: ${githubErrorDetail(err)}`
    );
  }
  const updated = await repoStore.setWebhook(id, webhookId);
  if (!updated) {
    throw new ValidationError('Repository not found');
  }
  return updated;
}

export interface DisconnectResult {
  /** False when no repo with this id exists. */
  found: boolean;
  /** Scans removed along with the repo. */
  deletedScans: number;
}

/**
 * Disconnect a repository: remove its webhook, its stored token, and every
 * scan it produced. The scans are deleted rather than kept because the token
 * that could re-fetch their diffs is gone with the repo row, so they would
 * linger in the queue monitor as findings nobody can act on or refresh.
 */
export async function disconnectRepo(id: string): Promise<DisconnectResult> {
  const row = await repoStore.getRepoById(id);
  if (!row) {
    return { found: false, deletedScans: 0 };
  }

  const host = row.host || 'github.com';

  if (row.webhook_id != null) {
    try {
      const token = decryptSecret(row.encrypted_token);
      const client = new RepoWebhookClient(token, apiBaseUrlForHost(host));
      await client.deleteWebhook(row.owner, row.name, row.webhook_id);
    } catch (err) {
      console.error(`Failed to remove GitHub webhook for ${row.owner}/${row.name}:`, (err as Error).message);
    }
  }

  const removed = await repoStore.deleteRepo(id);
  if (!removed) {
    return { found: false, deletedScans: 0 };
  }

  // Only after the repo row is gone, so a failed delete never orphans scans.
  const deletedScans = await jobStore.deleteByRepo(row.owner, row.name, host);
  return { found: true, deletedScans };
}
