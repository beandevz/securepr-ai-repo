from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class Job:
    job_id: str
    owner: str
    repo: str
    pr_number: int
    head_sha: str
    github_token: str
    payload: Dict[str, Any]
    check_run_id: int | None = None
    status_mode: str | None = None