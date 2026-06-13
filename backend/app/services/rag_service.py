from app.core.config import settings


class RagService:
    def retrieve(self, query_text: str) -> str:
        if not settings.rag_enabled:
            return ""

        from app.integrations.ai.azure_openai_client import embed_texts
        from app.rag.store import search

        q = embed_texts([query_text])[0]
        hits = search(q, settings.rag_top_k)

        # ✅ Build safe multi-line formatted output
        return "\n\n---\n\n".join(
            [
                f"[source={s} score={sc:.3f}]\n{t}"
                for s, t, sc in hits
            ]
        )