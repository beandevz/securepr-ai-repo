import { settings } from '../core/settings.js';
import { encryptSecret, decryptSecret } from '../core/security.js';
import { RepoWebhookClient } from '../integrations/github/repo-client.js';
import * as repoStore from '../repos/store.js';
import { ConnectedRepoSafe } from '../repos/store.js';
import { ValidationError, VCSIntegrationError, ConfigurationError } from '../exceptions.js';

const REPO_URL_RE = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i;

export function parseRepoUrl(url: string): { owner: string; name: string } {
  const match = REPO_URL_RE.exec((url || '').trim());
  if (!match) {
    throw new ValidationError('repoUrl must look like https://github.com/owner/repo');
  }
  return { owner: match[1], name: match[2] };
}

function webhookTargetUrl(): string | undefined {
  return settings.publicBaseUrl
    ? `${settings.publicBaseUrl.replace(/\/$/, '')}/ingest/github-actions`
    : undefined;
}

export async function connectRepo(repoUrl: string, githubToken: string): Promise<ConnectedRepoSafe> {
  if (!githubToken) {
    throw new ValidationError('githubToken is required');
  }
  const { owner, name } = parseRepoUrl(repoUrl);

  const client = new RepoWebhookClient(githubToken);
  try {
    await client.getRepo(owner, name);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) {
      throw new VCSIntegrationError('GitHub token is invalid or lacks repo access');
    }
    if (status === 404) {
      throw new VCSIntegrationError('Repository not found (check the URL and token permissions)');
    }
    throw new VCSIntegrationError(`Failed to reach GitHub: ${(err as Error).message}`);
  }

  let repo: ConnectedRepoSafe;
  try {
    repo = await repoStore.insertRepo({
      owner,
      name,
      url: repoUrl,
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
      const webhookId = await client.createWebhook(owner, name, targetUrl, settings.securePrIngestSecret);
      repo = (await repoStore.setWebhook(repo.id, webhookId)) || repo;
    } catch (err) {
      console.error(`Auto-webhook creation failed for ${owner}/${name}:`, (err as Error).message);
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
  const client = new RepoWebhookClient(token);
  let webhookId: number;
  try {
    webhookId = await client.createWebhook(row.owner, row.name, targetUrl, settings.securePrIngestSecret);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) {
      throw new VCSIntegrationError(
        "GitHub token lacks permission to create webhooks. Grant it the 'admin:repo_hook' scope " +
        "(classic PAT) or 'Webhooks: read and write' (fine-grained PAT) and reconnect."
      );
    }
    throw new VCSIntegrationError(`Failed to create GitHub webhook: ${(err as Error).message}`);
  }
  const updated = await repoStore.setWebhook(id, webhookId);
  if (!updated) {
    throw new ValidationError('Repository not found');
  }
  return updated;
}

export async function disconnectRepo(id: string): Promise<boolean> {
  const row = await repoStore.getRepoById(id);
  if (!row) {
    return false;
  }

  if (row.webhook_id != null) {
    try {
      const token = decryptSecret(row.encrypted_token);
      const client = new RepoWebhookClient(token);
      await client.deleteWebhook(row.owner, row.name, row.webhook_id);
    } catch (err) {
      console.error(`Failed to remove GitHub webhook for ${row.owner}/${row.name}:`, (err as Error).message);
    }
  }

  return repoStore.deleteRepo(id);
}
