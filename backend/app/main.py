from fastapi import FastAPI

from app.api.routes import health, ingest, jobs, github_status, rag, rag_ingest
from app.core.config import settings
from app.queue.inproc_queue import start_inproc_consumer

app = FastAPI(title='SecurePR AI', version='0.6.0')
app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(jobs.router)
app.include_router(github_status.router)
app.include_router(rag.router)
app.include_router(rag_ingest.router)

@app.on_event('startup')
async def startup():
    if settings.queue_provider.lower() == 'inproc':
        await start_inproc_consumer()
