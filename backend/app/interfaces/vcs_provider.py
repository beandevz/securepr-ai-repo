"""VCS Provider Protocol for GitHub, GitLab, etc."""
from typing import Protocol, List, Dict, Any, Optional


class VcsProvider(Protocol):
    """Protocol for Version Control System integrations (GitHub, GitLab, Azure DevOps)."""

    def fetch_pr_diff(self, owner: str, repo: str, pr_number: int) -> List[Dict[str, Any]]:
        """
        Fetch diff/patch for a pull request.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number

        Returns:
            List of file changes with patches
        """
        ...

    def create_review(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        commit_id: str,
        body: str,
        comments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a review with inline comments on a PR.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            commit_id: Commit SHA to attach review to
            body: Review summary body
            comments: List of inline comments

        Returns:
            Created review data
        """
        ...

    def create_commit_status(
        self,
        owner: str,
        repo: str,
        sha: str,
        state: str,
        context: str,
        description: str,
        target_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a commit status (check).

        Args:
            owner: Repository owner
            repo: Repository name
            sha: Commit SHA
            state: Status state (success, failure, pending, error)
            context: Status check name/context
            description: Short description
            target_url: Optional URL for details

        Returns:
            Created status data
        """
        ...

    def create_check_run(
        self,
        owner: str,
        repo: str,
        name: str,
        head_sha: str,
        details_url: Optional[str] = None
    ) -> int:
        """
        Create a check run.

        Args:
            owner: Repository owner
            repo: Repository name
            name: Check run name
            head_sha: Commit SHA
            details_url: Optional URL for details

        Returns:
            Check run ID
        """
        ...

    def update_check_run(
        self,
        owner: str,
        repo: str,
        check_run_id: int,
        conclusion: str,
        summary: str,
        details_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update a check run with results.

        Args:
            owner: Repository owner
            repo: Repository name
            check_run_id: Check run ID to update
            conclusion: Final conclusion (success, failure, etc.)
            summary: Summary text
            details_url: Optional URL for details

        Returns:
            Updated check run data
        """
        ...
