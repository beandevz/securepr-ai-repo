"""Ingest service - Business logic for webhook processing."""
from typing import Dict, Any, Tuple
from app.core.config import settings
from app.exceptions import WebhookError, ValidationError
from app.queue.models import Job


class IngestService:
    """Service for handling webhook ingestion and job creation."""

    @staticmethod
    def validate_github_payload(payload: Dict[str, Any]) -> Tuple[str, str, int, str]:
        """
        Validate and extract GitHub webhook payload.

        Args:
            payload: GitHub webhook payload

        Returns:
            Tuple of (owner, repo, pr_number, head_sha)

        Raises:
            ValidationError: If payload is invalid
        """
        pr = payload.get('pull_request') or {}
        repo = payload.get('repository') or {}
        full_name = repo.get('full_name') or ''

        if '/' not in full_name:
            raise ValidationError('Missing repository.full_name', {'payload': payload})

        owner, repo_name = full_name.split('/', 1)

        pr_number = int(pr.get('number') or payload.get('number') or 0)
        if pr_number <= 0:
            raise ValidationError('Missing PR number', {'payload': payload})

        head_sha = ((pr.get('head') or {}).get('sha')) or ''
        if not head_sha:
            raise ValidationError('Missing pull_request.head.sha', {'payload': payload})

        return owner, repo_name, pr_number, head_sha

    @staticmethod
    def create_check_run_if_enabled(
        token: str,
        owner: str,
        repo: str,
        head_sha: str,
        mode: str
    ) -> int | None:
        """
        Create GitHub check run or commit status if enabled.

        Args:
            token: GitHub token
            owner: Repository owner
            repo: Repository name
            head_sha: Commit SHA
            mode: Status mode (check_run or commit_status)

        Returns:
            Check run ID or None
        """
        if not settings.status_reporting_enabled:
            return None

        from app.integrations.github.checks_publisher import ChecksPublisher

        checks = ChecksPublisher(token)

        try:
            if mode == 'check_run':
                return checks.create_check_run(
                    owner,
                    repo,
                    name=settings.status_check_name,
                    head_sha=head_sha,
                    details_url=settings.status_details_url,
                )
            else:
                checks.create_commit_status(
                    owner,
                    repo,
                    head_sha,
                    state='pending',
                    context=settings.status_check_name,
                    description='SecurePR AI is running',
                    target_url=settings.status_details_url,
                )
                return None
        except Exception:
            return None

    @staticmethod
    def create_job(
        owner: str,
        repo: str,
        pr_number: int,
        head_sha: str,
        token: str,
        payload: Dict[str, Any],
        check_run_id: int | None,
        status_mode: str
    ) -> Job:
        """
        Create a security review job.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: PR number
            head_sha: Commit SHA
            token: GitHub token
            payload: Original webhook payload
            check_run_id: Optional check run ID
            status_mode: Status reporting mode

        Returns:
            Job object
        """
        import uuid
        from app.queue.job_store import job_store

        job_id = "job_" + uuid.uuid4().hex

        # Create job record for UI monitoring
        job_store.create(
            job_id=job_id,
            owner=owner,
            repo=repo,
            pr_number=pr_number,
            head_sha=head_sha,
        )

        return Job(
            job_id=job_id,
            owner=owner,
            repo=repo,
            pr_number=pr_number,
            head_sha=head_sha,
            github_token=token,
            payload=payload,
            check_run_id=check_run_id,
            status_mode=status_mode,
        )

    @staticmethod
    async def enqueue_job(job: Job) -> None:
        """
        Enqueue job for processing.

        Args:
            job: Job to enqueue
        """
        if settings.queue_provider.lower() == 'azure_servicebus':
            from app.queue.servicebus_queue import enqueue
            enqueue(job)
        else:
            from app.queue.inproc_queue import enqueue
            await enqueue(job)
