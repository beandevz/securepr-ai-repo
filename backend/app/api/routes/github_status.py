from fastapi import APIRouter
from app.integrations.github.status_client import (
    get_commit_status,
    get_check_runs
)

router = APIRouter(prefix="/github/status", tags=["github"])

@router.get("/{owner}/{repo}/{sha}")
def get_status(owner: str, repo: str, sha: str, token: str):
    status = get_commit_status(owner, repo, sha, token)
    checks = get_check_runs(owner, repo, sha, token)

    return {
        "state": status.get("state"),
        "statuses": status.get("statuses", []),
        "check_runs": checks.get("check_runs", [])
    }