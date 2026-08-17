import { settings } from '../../core/settings.js';
import { ValidationError } from '../../exceptions.js';

export const GITHUB_DOTCOM_HOST = 'github.com';
export const GITHUB_DOTCOM_API = 'https://api.github.com';

/**
 * GitHub.com serves its API from a separate hostname; GitHub Enterprise Server
 * serves it from /api/v3 on the same host as the web UI.
 */
export function apiBaseUrlForHost(host: string): string {
  const normalized = normalizeHost(host);
  return normalized === GITHUB_DOTCOM_HOST
    ? GITHUB_DOTCOM_API
    : `https://${normalized}/api/v3`;
}

export function normalizeHost(host: string): string {
  return (host || '').trim().toLowerCase().replace(/\/$/, '');
}

/**
 * The token we hold for a repo is sent to whatever host we resolve from its
 * URL, so the host is treated as untrusted input and must be allow-listed
 * (GITHUB_ALLOWED_HOSTS) rather than accepted from the URL alone.
 */
export function isAllowedHost(host: string): boolean {
  return settings.githubAllowedHosts.includes(normalizeHost(host));
}

export function assertAllowedHost(host: string): string {
  const normalized = normalizeHost(host);
  if (!isAllowedHost(normalized)) {
    throw new ValidationError(
      `GitHub host '${normalized}' is not allowed. Allowed hosts: ` +
      settings.githubAllowedHosts.join(', ')
    );
  }
  return normalized;
}

const REPO_PATH_RE = /^\/?([^/]+)\/([^/]+?)(?:\.git)?\/?$/;

/**
 * Parse a repo URL into host + owner + name. Accepts both HTTPS
 * (https://host/owner/repo) and SCP-style SSH (git@host:owner/repo.git) forms,
 * and validates the host against GITHUB_ALLOWED_HOSTS.
 */
export function parseRepoUrl(url: string): { host: string; owner: string; name: string } {
  const raw = (url || '').trim();
  if (!raw) {
    throw new ValidationError('repoUrl is required');
  }

  let host: string;
  let pathname: string;

  const scpMatch = /^(?:ssh:\/\/)?(?:[^@/]+@)?([^/:]+):(.+)$/.exec(raw);
  if (scpMatch && !/^https?:\/\//i.test(raw)) {
    host = scpMatch[1];
    pathname = scpMatch[2];
  } else {
    try {
      const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
      host = parsed.hostname;
      pathname = parsed.pathname;
    } catch {
      throw new ValidationError('repoUrl must look like https://github.com/owner/repo');
    }
  }

  const pathMatch = REPO_PATH_RE.exec(pathname);
  if (!pathMatch) {
    throw new ValidationError('repoUrl must look like https://github.com/owner/repo');
  }

  return {
    host: assertAllowedHost(host),
    owner: pathMatch[1],
    name: pathMatch[2],
  };
}

/**
 * Extract the host a webhook came from. GHES payloads carry their own instance
 * hostname in repository.html_url, so this is how a single ingest endpoint can
 * serve github.com and enterprise instances at once.
 */
export function hostFromWebhookPayload(payload: Record<string, unknown>): string | undefined {
  const repo = (payload?.repository as Record<string, unknown>) || {};
  const candidates = [repo.html_url, repo.url, repo.clone_url];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate) continue;
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      // GHES repository.url is the API URL (host/api/v3/repos/...); github.com's
      // is api.github.com. Both map back to the web host the same way.
      return host === 'api.github.com' ? GITHUB_DOTCOM_HOST : host;
    } catch {
      continue;
    }
  }
  return undefined;
}
