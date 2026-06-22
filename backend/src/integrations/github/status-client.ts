import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

export async function getCommitStatus(owner: string, repo: string, sha: string, token: string): Promise<Record<string, unknown>> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}/status`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
  };
  const r = await axios.get(url, { headers });
  return r.data;
}

export async function getCheckRuns(owner: string, repo: string, sha: string, token: string): Promise<Record<string, unknown>> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}/check-runs`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
  };
  const r = await axios.get(url, { headers });
  return r.data;
}
