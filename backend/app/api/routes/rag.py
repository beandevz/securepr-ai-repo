from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO

from app.core.config import settings
from app.integrations.ai.azure_openai_client import embed_texts
from app.rag.store import add_chunks, search

router = APIRouter(prefix="/rag", tags=["rag"])


# ---------- helpers ----------
def chunk_text(text: str, chunk_size: int) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]


def extract_text_from_pdf(data: bytes) -> str:
    # pypdf: PdfReader + page.extract_text()
    from pypdf import PdfReader  # requires pypdf>=4.0.0

    reader = PdfReader(BytesIO(data))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


# ---------- Ingest (JSON) ----------
class IngestTextRequest(BaseModel):
    # each item is one document
    documents: List[str]
    # optional list of sources; if omitted, uses "text-{i}"
    sources: Optional[List[str]] = None


@router.post("/ingest/text")
def ingest_text(req: IngestTextRequest):
    if not settings.rag_enabled:
        raise HTTPException(status_code=400, detail="RAG is disabled (RAG_ENABLED=false)")

    sources = req.sources or [f"text-{i}" for i in range(len(req.documents))]
    if len(sources) != len(req.documents):
        raise HTTPException(status_code=400, detail="sources length must match documents length")

    total_chunks = 0
    for src, doc in zip(sources, req.documents):
        chunks = chunk_text(doc, settings.rag_chunk_size_chars)
        if not chunks:
            continue
        embs = embed_texts(chunks)
        add_chunks(src, chunks, embs)
        total_chunks += len(chunks)

    return {"ok": True, "ingested_chunks": total_chunks}


# ---------- Ingest (FILES multipart) ----------
@router.post("/ingest/files")
async def ingest_files(
    files: List[UploadFile] = File(...),
    source_prefix: str = Form(default="upload"),
):
    if not settings.rag_enabled:
        raise HTTPException(status_code=400, detail="RAG is disabled (RAG_ENABLED=false)")

    total_chunks = 0

    for f in files:
        raw = await f.read()
        filename = f.filename or "unknown"
        src = f"{source_prefix}:{filename}"

        # basic type handling
        ct = (f.content_type or "").lower()
        name_lower = filename.lower()

        if ct == "application/pdf" or name_lower.endswith(".pdf"):
            text = extract_text_from_pdf(raw)
        else:
            # treat as text-based file
            try:
                text = raw.decode("utf-8", errors="ignore")
            except Exception:
                text = ""

        chunks = chunk_text(text, settings.rag_chunk_size_chars)
        if not chunks:
            continue

        embs = embed_texts(chunks)
        add_chunks(src, chunks, embs)
        total_chunks += len(chunks)

    return {"ok": True, "ingested_chunks": total_chunks}


# ---------- Search ----------
class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None


@router.post("/search")
def rag_search(req: SearchRequest):
    if not settings.rag_enabled:
        raise HTTPException(status_code=400, detail="RAG is disabled (RAG_ENABLED=false)")

    q_emb = embed_texts([req.query])[0]
    hits = search(q_emb, req.top_k or settings.rag_top_k)

    # hits: (source, chunk_text, score)
    return {
        "ok": True,
        "query": req.query,
        "top_k": req.top_k or settings.rag_top_k,
        "hits": [
            {"source": s, "score": float(sc), "text": t}
            for (s, t, sc) in hits
        ]
    }