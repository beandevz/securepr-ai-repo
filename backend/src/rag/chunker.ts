/**
 * Smart text chunker with structure-aware splitting and overlap.
 *
 * Improvements over naive sentence-split:
 * 1. Structure-aware: respects markdown headers, code fences, and paragraphs
 * 2. Code-safe sentence splitting: won't break on `obj.method()`, `v1.0`, etc.
 * 3. O(n) overlap via segment index tracking (no re-splitting)
 * 4. Hard-split fallback for segments exceeding chunkSize
 */

export interface ChunkResult {
  text: string;
  index: number;
  totalChunks: number;
}

// ─── Segment splitting ──────────────────────────────────────────────────────

/** Regex: fenced code block (``` or ~~~) */
const CODE_FENCE_RE = /^(`{3,}|~{3,})/;

/**
 * Process a single line within the block-splitting loop.
 * Returns updated state flags.
 */
function processLine(
  line: string,
  current: string[],
  blocks: string[],
  inCodeFence: boolean,
  fenceMarker: string,
  flushCurrent: () => void
): { inCodeFence: boolean; fenceMarker: string } {
  const fenceMatch = CODE_FENCE_RE.exec(line);

  if (fenceMatch && !inCodeFence) {
    flushCurrent();
    current.push(line);
    return { inCodeFence: true, fenceMarker: fenceMatch[1].charAt(0) };
  }

  if (inCodeFence) {
    current.push(line);
    if (line.trimStart().startsWith(fenceMarker.repeat(3))) {
      blocks.push(current.join('\n'));
      current.length = 0;
      return { inCodeFence: false, fenceMarker: '' };
    }
    return { inCodeFence, fenceMarker };
  }

  if (/^#{1,6}\s/.test(line)) {
    flushCurrent();
    current.push(line);
    return { inCodeFence, fenceMarker };
  }

  if (line.trim() === '') {
    flushCurrent();
    return { inCodeFence, fenceMarker };
  }

  current.push(line);
  return { inCodeFence, fenceMarker };
}

/**
 * Split text into structural blocks: code fences, headers, paragraphs.
 */
function splitIntoBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  const current: string[] = [];
  let inCodeFence = false;
  let fenceMarker = '';

  const flushCurrent = () => {
    if (current.length > 0) {
      const block = current.join('\n').trim();
      if (block) blocks.push(block);
      current.length = 0;
    }
  };

  for (const line of lines) {
    const state = processLine(line, current, blocks, inCodeFence, fenceMarker, flushCurrent);
    inCodeFence = state.inCodeFence;
    fenceMarker = state.fenceMarker;
  }

  flushCurrent();
  return blocks;
}

/**
 * Expand blocks into fine-grained segments.
 * Code blocks stay intact; large text blocks are split into sentences.
 */
function blocksToSegments(blocks: string[]): string[] {
  const segments: string[] = [];
  for (const block of blocks) {
    if (block.startsWith('```') || block.startsWith('~~~')) {
      segments.push(block);
    } else if (block.length <= 300) {
      segments.push(block);
    } else {
      segments.push(...splitSentencesSafe(block));
    }
  }
  return segments;
}

/**
 * First-pass: split text into structural segments.
 * Preserves code blocks as single units, splits on markdown headers and
 * paragraph breaks, then falls back to sentence splitting within paragraphs.
 */
function splitSegments(text: string): string[] {
  return blocksToSegments(splitIntoBlocks(text));
}

/**
 * Code-safe sentence splitting.
 * Splits on sentence-ending punctuation ONLY when followed by
 * whitespace + uppercase letter (new sentence start).
 * Skips abbreviations: single-letter dots (e.g., i.e., U.S.) and
 * common multi-letter abbreviations (etc., vs., Dr., Mr., etc.).
 */
function splitSentencesSafe(text: string): string[] {
  const parts = text.split(
    /(?<!\b[A-Za-z]\.)(?<!\b(?:etc|vs|Dr|Mr|Mrs|Jr|Sr|St|Prof|Inc|Corp|Ltd|No|Vol)\.)(?<=[.!?])\s+(?=[A-Z])/
  );
  return parts.filter(s => s.trim().length > 0).map(s => s.trim());
}

// ─── Hard split for oversized segments ──────────────────────────────────────

/**
 * Break a single oversized segment into pieces ≤ maxLen on word boundaries.
 */
function hardSplit(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const pieces: string[] = [];
  let buf = '';

  for (const word of words) {
    const candidate = buf ? buf + ' ' + word : word;
    if (candidate.length > maxLen && buf) {
      pieces.push(buf);
      buf = word;
    } else {
      buf = candidate;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
}

// ─── Overlap builder ────────────────────────────────────────────────────────

/**
 * Take the last ~maxLen characters of text, breaking on word boundaries.
 */
function takeTrailingWords(text: string, maxLen: number): string {
  const words = text.split(/\s+/);
  let buf = '';
  for (let i = words.length - 1; i >= 0; i--) {
    const candidate = words[i] + (buf ? ' ' + buf : '');
    if (candidate.length > maxLen && buf) break;
    buf = candidate;
  }
  return buf;
}

/**
 * Build overlap parts from the tail of the current chunk parts.
 * If a single trailing part exceeds maxOverlap, truncates it on word boundaries.
 */
function buildOverlapParts(parts: string[], maxOverlap: number): string[] {
  if (parts.length === 0 || maxOverlap <= 0) return [];

  const result: string[] = [];
  let len = 0;
  for (let j = parts.length - 1; j >= 0; j--) {
    // If a single part exceeds budget and nothing collected yet, take its tail
    if (parts[j].length > maxOverlap && result.length === 0) {
      const tail = takeTrailingWords(parts[j], maxOverlap);
      if (tail) result.unshift(tail);
      break;
    }
    const addLen = parts[j].length + (result.length > 0 ? 1 : 0);
    if (len + addLen > maxOverlap && result.length > 0) break;
    result.unshift(parts[j]);
    len += addLen;
  }
  return result;
}

// ─── Flatten oversized segments ─────────────────────────────────────────────

function flattenSegments(segments: string[], chunkSize: number): string[] {
  const flat: string[] = [];
  for (const seg of segments) {
    if (seg.length > chunkSize) {
      flat.push(...hardSplit(seg, chunkSize));
    } else {
      flat.push(seg);
    }
  }
  return flat;
}

// ─── Main chunker ───────────────────────────────────────────────────────────

/**
 * Chunk text with structure awareness and configurable overlap.
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

  if (text.length <= chunkSize) {
    return [{ text, index: 0, totalChunks: 1 }];
  }

  const flatSegments = flattenSegments(splitSegments(text), chunkSize);
  if (flatSegments.length === 0) return [];

  const chunks: string[] = [];
  let currentParts: string[] = [];
  let currentLen = 0;

  for (const seg of flatSegments) {
    const addLen = currentLen > 0 ? seg.length + 1 : seg.length;

    if (currentLen + addLen > chunkSize && currentParts.length > 0) {
      chunks.push(currentParts.join('\n'));

      const overlapParts = buildOverlapParts(currentParts, overlap);
      currentParts = [...overlapParts, seg];
      currentLen = currentParts.reduce((acc, p) => acc + p.length, 0) + currentParts.length - 1;
    } else {
      currentParts.push(seg);
      currentLen += addLen;
    }
  }

  if (currentParts.length > 0) {
    chunks.push(currentParts.join('\n'));
  }

  const totalChunks = chunks.length;
  return chunks.map((text, index) => ({ text, index, totalChunks }));
}

// ─── Test-only exports ──────────────────────────────────────────────────────

export const _internals = {
  splitIntoBlocks,
  blocksToSegments,
  splitSegments,
  splitSentencesSafe,
  hardSplit,
  buildOverlapParts,
  flattenSegments,
  takeTrailingWords,
};
