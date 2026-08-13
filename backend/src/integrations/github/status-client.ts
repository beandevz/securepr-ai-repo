import axios from 'axios';
import { GITHUB_DOTCOM_API } from './host.js';

function headersFor(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
  };
}

export async function getCommitStatus(
  owner: string, repo: string, sha: string, token: string,
  apiBaseUrl: string = GITHUB_DOTCOM_API
): Promise<Record<string, unknown>> {
  const url = `${apiBaseUrl}/repos/${owner}/${repo}/commits/${sha}/status`;
  const r = await axios.get(url, { headers: headersFor(token) });
  return r.data;
}

export async function getCheckRuns(
  owner: string, repo: string, sha: string, token: string,
  apiBaseUrl: string = GITHUB_DOTCOM_API
): Promise<Record<string, unknown>> {
  const url = `${apiBaseUrl}/repos/${owner}/${repo}/commits/${sha}/check-runs`;
  const r = await axios.get(url, { headers: headersFor(token) });
  return r.data;
}
