from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.integrations.ai.azure_openai_client import embed_texts
from app.rag.store import upsert_many

router = APIRouter(prefix="/rag", tags=["rag"])


class IngestRequest(BaseModel):
    documents: List[str]


def chunk_text(text: str, size: int = 500) -> List[str]:
    return [text[i:i+size] for i in range(0, len(text), size)]


@router.post("/ingest")
def ingest_docs(req: IngestRequest):
    chunks = []

    for doc in req.documents:
        chunks.extend(chunk_text(doc))

    embeddings = embed_texts(chunks)

    records = []
    for text, vec in zip(chunks, embeddings):
        records.append({
            "text": text,
            "embedding": vec
        })

    upsert_many(records)

    return {
        "ok": True,
        "chunks": len(chunks)
    }