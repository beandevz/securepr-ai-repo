import { Router, Request, Response } from 'express';
import multer from 'multer';
import { settings } from '../../core/settings.js';
import { addChunks, search, listSources, deleteBySource, getStats } from '../../rag/store.js';
import { chunkText } from '../../rag/chunker.js';
import { askWithRag } from '../../rag/rag-llm.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Lazy-load embedTexts to avoid crashing at import time if Azure isn't configured
async function getEmbedTexts() {
  const { embedTexts } = await import('../../integrations/ai/azure-openai-client.js');
  return embedTexts;
}

// Helper: extract text from PDF
async function extractTextFromPdf(data: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(data);
  return result.text.trim();
}

// ─── Middleware: check RAG enabled ───────────────────────────────────────────

function requireRag(_req: Request, res: Response): boolean {
  if (!settings.ragEnabled) {
    res.status(400).json({ detail: 'RAG is disabled (RAG_ENABLED=false)' });
    return false;
  }
  return true;
}

// ─── POST /rag/ingest/text ──────────────────────────────────────────────────

router.post('/rag/ingest/text', async (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;

    const { documents, sources } = req.body as {
      documents: string[];
      sources?: string[];
    };

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      res.status(400).json({ detail: 'documents must be a non-empty array of strings' });
      return;
    }

    const srcList = sources || documents.map((_: string, i: number) => `text-${i}`);
    if (srcList.length !== documents.length) {
      res.status(400).json({ detail: 'sources length must match documents length' });
      return;
    }

    const embedTexts = await getEmbedTexts();
    let totalChunks = 0;

    for (let i = 0; i < documents.length; i++) {
      const chunks = chunkText(
        documents[i],
        settings.ragChunkSizeChars,
        settings.ragChunkOverlapChars
      );
      if (chunks.length === 0) continue;

      const texts = chunks.map(c => c.text);
      const embs = await embedTexts(texts);
      const meta = chunks.map(c => ({ index: c.index, totalChunks: c.totalChunks }));
      addChunks(srcList[i], texts, embs, meta);
      totalChunks += chunks.length;
    }

    res.json({ ok: true, ingested_chunks: totalChunks });
  } catch (err) {
    console.error('RAG ingest text error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

// ─── POST /rag/ingest/files ─────────────────────────────────────────────────

router.post('/rag/ingest/files', upload.array('files'), async (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ detail: 'No files provided' });
      return;
    }

    const sourcePrefix = (req.body.source_prefix as string) || 'upload';
    const embedTexts = await getEmbedTexts();
    let totalChunks = 0;
    const fileResults: Array<{ filename: string; chunks: number }> = [];

    for (const file of files) {
      const filename = file.originalname || 'unknown';
      const src = `${sourcePrefix}:${filename}`;

      let text: string;
      const ct = (file.mimetype || '').toLowerCase();
      const nameLower = filename.toLowerCase();

      if (ct === 'application/pdf' || nameLower.endsWith('.pdf')) {
        text = await extractTextFromPdf(file.buffer);
      } else {
        text = file.buffer.toString('utf-8');
      }

      const chunks = chunkText(
        text,
        settings.ragChunkSizeChars,
        settings.ragChunkOverlapChars
      );
      if (chunks.length === 0) {
        fileResults.push({ filename, chunks: 0 });
        continue;
      }

      const texts = chunks.map(c => c.text);
      const embs = await embedTexts(texts);
      const meta = chunks.map(c => ({ index: c.index, totalChunks: c.totalChunks }));
      addChunks(src, texts, embs, meta);
      totalChunks += chunks.length;
      fileResults.push({ filename, chunks: chunks.length });
    }

    res.json({ ok: true, ingested_chunks: totalChunks, files: fileResults });
  } catch (err) {
    console.error('RAG ingest files error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

// ─── POST /rag/search ───────────────────────────────────────────────────────

router.post('/rag/search', async (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;

    const { query, top_k } = req.body as { query: string; top_k?: number };
    if (!query) {
      res.status(400).json({ detail: 'query is required' });
      return;
    }

    const topK = top_k || settings.ragTopK;
    const embedTexts = await getEmbedTexts();
    const [queryEmb] = await embedTexts([query]);
    const hits = search(queryEmb, topK);

    res.json({
      ok: true,
      query,
      top_k: topK,
      hits: hits.map(([s, t, sc]) => ({
        source: s,
        score: sc,
        text: t,
      })),
    });
  } catch (err) {
    console.error('RAG search error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

// ─── POST /rag/ask (Full RAG + LLM Answer) ─────────────────────────────────

router.post('/rag/ask', async (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;

    const { question, top_k } = req.body as { question: string; top_k?: number };
    if (!question) {
      res.status(400).json({ detail: 'question is required' });
      return;
    }

    const result = await askWithRag(question, top_k);

    res.json({
      ok: true,
      question,
      answer: result.answer,
      sources: result.sources,
      llm_used: result.llm_used,
    });
  } catch (err) {
    console.error('RAG ask error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

// ─── GET /rag/sources ───────────────────────────────────────────────────────

router.get('/rag/sources', (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;
    const sources = listSources();
    res.json({ ok: true, sources });
  } catch (err) {
    console.error('RAG list sources error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

// ─── DELETE /rag/sources/:source ────────────────────────────────────────────

router.delete('/rag/sources/:source', (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;
    const source = decodeURIComponent(req.params.source);
    const deleted = deleteBySource(source);
    res.json({ ok: true, source, deleted_chunks: deleted });
  } catch (err) {
    console.error('RAG delete source error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

// ─── GET /rag/stats ─────────────────────────────────────────────────────────

router.get('/rag/stats', (req: Request, res: Response) => {
  try {
    if (!requireRag(req, res)) return;
    const stats = getStats();
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error('RAG stats error:', err);
    res.status(500).json({ detail: `Internal server error: ${(err as Error).message}` });
  }
});

export default router;
