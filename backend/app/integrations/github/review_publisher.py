from app.integrations.github.client import GitHubClient


class ReviewPublisher:
    """GitHub review/comment publisher with shared HTTP client."""

    def __init__(self, github_token: str):
        self.github_token = github_token
        self._client = GitHubClient(github_token)

    def create_review(self, owner: str, repo: str, pr_number: int, *, commit_id: str, body: str, comments: list[dict]):
        url = f'/repos/{owner}/{repo}/pulls/{pr_number}/reviews'
        payload = {'commit_id': commit_id, 'body': body, 'event': 'COMMENT', 'comments': comments}
        r = self._client.http.post(url, json=payload)
        return r.json()

    def create_review_comment(self, owner: str, repo: str, pr_number: int, *, commit_id: str, path: str, line: int, body: str, side: str = 'RIGHT'):
        url = f'/repos/{owner}/{repo}/pulls/{pr_number}/comments'
        payload = {'body': body, 'commit_id': commit_id, 'path': path, 'line': int(line), 'side': side}
        r = self._client.http.post(url, json=payload)
        return r.json()

    def post_issue_comment(self, owner: str, repo: str, pr_number: int, body: str):
        url = f'/repos/{owner}/{repo}/issues/{pr_number}/comments'
        r = self._client.http.post(url, json={'body': body})
        return r.json()
