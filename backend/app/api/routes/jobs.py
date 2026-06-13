from fastapi import APIRouter, HTTPException
from app.queue.job_store import job_store

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("")
def list_jobs():
    return job_store.list()

@router.get("/{job_id}")
def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "status": job.status,
        "result": job.result,
        "patch": job.patch   # ✅ ADD THIS
    }


@router.delete("/{job_id}")
def delete_job(job_id: str):
    ok = job_store.delete(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}