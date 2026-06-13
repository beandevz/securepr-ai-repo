from app.integrations.github.client import GitHubClient


class ChecksPublisher:
    """GitHub checks/status publisher with shared HTTP client."""

    def __init__(self, github_token: str):
        self.github_token = github_token
        self._client = GitHubClient(github_token)

    def create_check_run(self, owner: str, repo: str, *, name: str, head_sha: str, details_url: str | None = None) -> int:
        url = f'/repos/{owner}/{repo}/check-runs'
        payload = {'name': name, 'head_sha': head_sha, 'status': 'in_progress', 'output': {'title': name, 'summary': 'SecurePR AI is running.'}}
        if details_url:
            payload['details_url'] = details_url
        r = self._client.http.post(url, json=payload)
        return int(r.json().get('id'))

    def update_check_run(self, owner: str, repo: str, check_run_id: int, *, conclusion: str, summary: str, details_url: str | None = None):
        url = f'/repos/{owner}/{repo}/check-runs/{check_run_id}'
        payload = {'status': 'completed', 'conclusion': conclusion, 'output': {'title': 'SecurePR AI', 'summary': summary}}
        if details_url:
            payload['details_url'] = details_url
        r = self._client.http.patch(url, json=payload)
        return r.json()

    def create_commit_status(self, owner: str, repo: str, sha: str, *, state: str, context: str, description: str = '', target_url: str | None = None):
        url = f'/repos/{owner}/{repo}/statuses/{sha}'
        payload = {'state': state, 'context': context}
        if description:
            payload['description'] = description
        if target_url:
            payload['target_url'] = target_url
        r = self._client.http.post(url, json=payload)
        return r.json()
