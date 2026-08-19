import { Router, Request, Response } from 'express';
import { getRagHealth } from '../../services/rag-service.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  // Surfaces whether RAG can actually retrieve, so a silently degraded
  // knowledge base (no embedding model, empty store) is visible to operators.
  let rag: Record<string, unknown>;
  try {
    rag = { ...(await getRagHealth()) };
  } catch (err) {
    rag = { enabled: true, embedding: 'unavailable', error: (err as Error).message };
  }

  res.json({ status: 'ok', rag });
});

export default router;
