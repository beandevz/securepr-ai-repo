# RAG setup

1) Put docs into `backend/kb/` (.md/.txt)
2) Configure Azure OpenAI embedding deployment in `backend/.env`:
   - AZURE_OPENAI_ENDPOINT
   - AZURE_OPENAI_KEY
   - AZURE_OPENAI_EMBEDDING_DEPLOYMENT
   - RAG_ENABLED=true
3) Run ingestion:
   python -m app.rag.ingest_kb
