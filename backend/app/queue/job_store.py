
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import threading

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

@dataclass
class JobRecord:
    id: str
    status: str                    # queued | running | done | failed
    created_at: str
    updated_at: str
    owner: str
    repo: str
    pr_number: int
    head_sha: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class JobStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: Dict[str, JobRecord] = {}

    def create(self, *, job_id: str, owner: str, repo: str, pr_number: int, head_sha: str) -> JobRecord:
        rec = JobRecord(
            id=job_id,
            status="queued",
            created_at=now_iso(),
            updated_at=now_iso(),
            owner=owner,
            repo=repo,
            pr_number=pr_number,
            head_sha=head_sha,
        )
        with self._lock:
            self._jobs[job_id] = rec
        return rec

    def set_status(self, job_id: str, status: str) -> None:
        with self._lock:
            rec = self._jobs.get(job_id)
            if not rec:
                return
            rec.status = status
            rec.updated_at = now_iso()

    def set_result(self, job_id: str, result: Dict[str, Any]) -> None:
        with self._lock:
            rec = self._jobs.get(job_id)
            if not rec:
                return
            rec.result = result
            rec.status = "done"
            rec.updated_at = now_iso()

    def set_error(self, job_id: str, error: str) -> None:
        with self._lock:
            rec = self._jobs.get(job_id)
            if not rec:
                return
            rec.error = error
            rec.status = "failed"
            rec.updated_at = now_iso()

    def list(self) -> List[Dict[str, Any]]:
        with self._lock:
            # newest first
            items = sorted(self._jobs.values(), key=lambda r: r.created_at, reverse=True)
            return [asdict(x) for x in items]

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            rec = self._jobs.get(job_id)
            return asdict(rec) if rec else None

    def delete(self, job_id: str) -> bool:
        with self._lock:
            return self._jobs.pop(job_id, None) is not None

# singleton store
job_store = JobStore()
