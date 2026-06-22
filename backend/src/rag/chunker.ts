/**
 * Smart text chunker with sentence-boundary awareness and overlap.
 */

export interface ChunkResult {
  text: string;
  index: number;
  totalChunks: number;
}

/**
 * Split text on sentence boundaries (., !, ?, newlines).
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace, or double newlines
  const parts = text.split(/(?<=[.!?])\s+|\n{2,}/);
  return parts.filter(s => s.trim().length > 0);
}

/**
 * Chunk text with sentence-boundary awareness and configurable overlap.
 *
 * Unlike naive char-split, this:
 * 1. Splits on sentence boundaries so chunks don't cut mid-sentence
 * 2. Adds overlap between consecutive chunks so context isn't lost at boundaries
 *
 * @param text - The full text to chunk
 * @param chunkSize - Target chunk size in characters (default 1200)
 * @param overlap - Number of characters to overlap between chunks (default 200)
 * @returns Array of ChunkResult with text, index, and total count
 */
export function chunkText(
  text: string,
  chunkSize: number = 1200,
  overlap: number = 200
): ChunkResult[] {
  text = (text || '').trim();
  if (!text) return [];

  // If entire text fits in one chunk, return as-is
  if (text.length <= chunkSize) {
    return [{ text, index: 0, totalChunks: 1 }];
  }

  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let currentChunk = '';
  let overlapBuffer = ''; // trailing sentences from previous chunk

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    const candidate = currentChunk
      ? currentChunk + ' ' + sentence
      : sentence;

    if (candidate.length > chunkSize && currentChunk.length > 0) {
      // Current chunk is full — save it
      chunks.push(currentChunk.trim());

      // Build overlap: take trailing part of current chunk
      overlapBuffer = buildOverlap(currentChunk, overlap);

      // Start new chunk with overlap + current sentence
      currentChunk = overlapBuffer ? overlapBuffer + ' ' + sentence : sentence;
    } else {
      currentChunk = candidate;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const totalChunks = chunks.length;
  return chunks.map((text, index) => ({ text, index, totalChunks }));
}

/**
 * Build an overlap string from the tail of a chunk.
 * Takes the last N characters worth of complete sentences.
 */
function buildOverlap(text: string, overlapChars: number): string {
  if (overlapChars <= 0) return '';

  const sentences = splitSentences(text);
  if (sentences.length <= 1) return '';

  let overlap = '';
  // Walk backwards through sentences to build overlap
  for (let i = sentences.length - 1; i >= 0; i--) {
    const candidate = sentences[i].trim() + (overlap ? ' ' + overlap : '');
    if (candidate.length > overlapChars && overlap.length > 0) break;
    overlap = candidate;
  }

  return overlap;
}
