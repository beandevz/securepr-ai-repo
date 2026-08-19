# RAG setup

Retrieval grounds each finding in a policy document, so the LLM cites the rule
it applied instead of inventing one. Chunks are stored in a `sql.js` (SQLite via
WASM) vector store at `RAG_DB_PATH`.

## 1) Configure

In `backend/.env`:

```bash
RAG_ENABLED=true
RAG_DB_PATH=rag.db

# Embeddings: any OpenAI-compatible endpoint.
OPENAI_API_KEY=your-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/v1

# Retrieval tuning
RAG_TOP_K=4
RAG_MIN_SCORE=0.30          # cosine floor; below this a chunk is dropped
RAG_QUERY_MAX_CHARS=4000    # larger patches are queried per hunk
RAG_CHUNK_SIZE_CHARS=1200
RAG_CHUNK_OVERLAP_CHARS=200
```

> Without `OPENAI_EMBEDDING_MODEL`, embeddings fall back to SHA-256 hashes.
> Those are deterministic but not semantic, so retrieval is **skipped** unless
> you explicitly set `RAG_ALLOW_LOCAL_EMBEDDINGS=true`. Use that for local
> testing only — never to produce real findings.

## 2) Ingest policy documents

There is no CLI ingestion script. Documents go in over the HTTP API, or through
the **RAG Manager** page in the UI (`/rag`), which wraps the same endpoints.

```bash
# Raw text — documents[] and sources[] must be the same length.
curl -X POST localhost:8000/rag/ingest/text \
  -H 'Content-Type: application/json' \
  -d '{"documents":["Always use parameterized queries..."],"sources":["owasp-a03"]}'

# PDF upload (multipart, field name "files")
curl -X POST localhost:8000/rag/ingest/files -F 'files=@secure-coding-policy.pdf'
```

## 3) Verify

```bash
# Search is POST, not GET.
curl -X POST localhost:8000/rag/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"sql injection","top_k":4}'

curl localhost:8000/rag/sources   # what has been ingested
curl localhost:8000/rag/stats     # chunk/source counts, db size
curl localhost:8000/health        # { status, rag: { enabled, embedding, ... } }
```

Remove a source with `DELETE /rag/sources/:source`.

If `/health` reports RAG as unavailable, check that `RAG_ENABLED=true` and that
an embedding model is reachable — those are the two conditions the retrieval
stage requires before it will run.
