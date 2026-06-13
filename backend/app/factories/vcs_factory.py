"""Factory for creating VCS provider instances."""
from app.interfaces.vcs_provider import VcsProvider


class GitHubProvider:
    """GitHub implementation of VCS provider."""

    def __init__(self, token: str):
        self.token = token
        from app.integrations.github.client import GitHubClient
        self._client = GitHubClient(token)

    def fetch_pr_diff(self, owner: str, repo: str, pr_number: int):
        from app.services.diff_fetcher import DiffFetcher
        fetcher = DiffFetcher(self.token)
        return fetcher.fetch_files(owner, repo, pr_number)

    def create_review(self, owner: str, repo: str, pr_number: int, commit_id: str, body: str, comments: list):
        from app.integrations.github.review_publisher import ReviewPublisher
        publisher = ReviewPublisher(self.token)
        return publisher.create_review(owner, repo, pr_number, commit_id=commit_id, body=body, comments=comments)

    def create_commit_status(self, owner: str, repo: str, sha: str, state: str, context: str, description: str, target_url: str | None = None):
        from app.integrations.github.checks_publisher import ChecksPublisher
        checks = ChecksPublisher(self.token)
        return checks.create_commit_status(owner, repo, sha, state=state, context=context, description=description, target_url=target_url)

    def create_check_run(self, owner: str, repo: str, name: str, head_sha: str, details_url: str | None = None):
        from app.integrations.github.checks_publisher import ChecksPublisher
        checks = ChecksPublisher(self.token)
        return checks.create_check_run(owner, repo, name=name, head_sha=head_sha, details_url=details_url)

    def update_check_run(self, owner: str, repo: str, check_run_id: int, conclusion: str, summary: str, details_url: str | None = None):
        from app.integrations.github.checks_publisher import ChecksPublisher
        checks = ChecksPublisher(self.token)
        return checks.update_check_run(owner, repo, check_run_id, conclusion=conclusion, summary=summary, details_url=details_url)


def create_vcs_provider(token: str, vcs_type: str = 'github') -> VcsProvider:
    """
    Factory method to create VCS provider.

    Args:
        token: Authentication token
        vcs_type: Type of VCS (github, gitlab, azuredevops)

    Returns:
        VCS provider instance
    """
    if vcs_type.lower() == 'github':
        return GitHubProvider(token)
    else:
        raise ValueError(f"Unknown VCS provider: {vcs_type}")
