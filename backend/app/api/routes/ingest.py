from fastapi import APIRouter, Request, Header, HTTPException

from app.core.config import settings
from app.core.security import verify_hmac_sha256
from app.services.ingest_service import IngestService
from app.exceptions import ValidationError, WebhookError

router = APIRouter(prefix='/ingest', tags=['ingest'])


@router.post('/github-actions')
async def ingest_github_actions(
    req: Request,
    x_securepr_signature: str | None = Header(default=None),
    x_securepr_github_token: str | None = Header(default=None)
):
    """
    Ingest GitHub webhook for PR security analysis.

    Validates signature, extracts PR details, creates job, and enqueues for processing.
    """
    # Verify webhook signature
    raw = await req.body()
    if not verify_hmac_sha256(settings.securepr_ingest_secret, raw, x_securepr_signature):
        raise HTTPException(status_code=401, detail='Invalid signature')

    # Parse payload
    payload = await req.json()

    # Validate and extract PR details
    try:
        owner, repo_name, pr_number, head_sha = IngestService.validate_github_payload(payload)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)

    # Get GitHub token
    token = x_securepr_github_token or settings.github_token
    if not token:
        raise HTTPException(status_code=400, detail='Missing GitHub token')

    # Create check run or commit status
    mode = settings.status_reporting_mode.lower()
    check_run_id = IngestService.create_check_run_if_enabled(
        token, owner, repo_name, head_sha, mode
    )

    # Create job
    job = IngestService.create_job(
        owner, repo_name, pr_number, head_sha, token, payload, check_run_id, mode
    )

    # Enqueue for processing
    await IngestService.enqueue_job(job)

    return {
        'ok': True,
        'queued': True,
        'job_id': job.job_id,
        'check_run_id': check_run_id,
        'mode': mode
    }
