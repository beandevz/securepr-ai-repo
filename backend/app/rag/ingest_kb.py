from pathlib import Path
from app.core.config import settings
from app.integrations.ai.azure_openai_client import embed_texts
from app.rag.store import add_chunks


def chunk_text(text: str, size: int) -> list[str]:
    text = text.strip()
    return [text[i:i+size] for i in range(0, len(text), size)] if text else []


def main():
    if not settings.azure_openai_embedding_deployment:
        raise SystemExit('AZURE_OPENAI_EMBEDDING_DEPLOYMENT not set')

    kb_dir = Path(__file__).resolve().parents[2] / 'kb'
    paths = [p for p in kb_dir.rglob('*') if p.is_file() and p.suffix.lower() in {'.md','.txt'}]
    if not paths:
        print('No kb files found in', kb_dir)
        return

    for p in paths:
        content = p.read_text(encoding='utf-8', errors='ignore')
        chunks = chunk_text(content, settings.rag_chunk_size_chars)
        if not chunks:
            continue
        embs = embed_texts(chunks)
        add_chunks(str(p.relative_to(kb_dir)), chunks, embs)
        print('Ingested', p.name, 'chunks=', len(chunks))

if __name__ == '__main__':
    main()
