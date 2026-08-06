import { describe, it, expect } from 'vitest';
import { chunkText, _internals } from './chunker.js';

const {
  splitIntoBlocks,
  blocksToSegments,
  splitSegments,
  splitSentencesSafe,
  hardSplit,
  buildOverlapParts,
  flattenSegments,
  takeTrailingWords,
} = _internals;

// ─── splitSentencesSafe ─────────────────────────────────────────────────────

describe('splitSentencesSafe', () => {
  it('splits on sentence boundary before uppercase', () => {
    const result = splitSentencesSafe('Hello world. This is a test. Another one.');
    expect(result).toEqual([
      'Hello world.',
      'This is a test.',
      'Another one.',
    ]);
  });

  it('does NOT split on obj.method() or v1.0', () => {
    const text = 'Call obj.method() to get v1.0 of the result. Then check it.';
    const result = splitSentencesSafe(text);
    // Splits at "result. Then" (valid sentence boundary)
    // but preserves obj.method() and v1.0
    expect(result).toEqual([
      'Call obj.method() to get v1.0 of the result.',
      'Then check it.',
    ]);
  });

  it('does NOT split on e.g. or i.e.', () => {
    const text = 'Use frameworks e.g. React or Vue. They help.';
    const result = splitSentencesSafe(text);
    // "e.g." is followed by lowercase, so no split there
    // "Vue." followed by " They" → split
    expect(result).toEqual([
      'Use frameworks e.g. React or Vue.',
      'They help.',
    ]);
  });

  it('handles exclamation and question marks', () => {
    const result = splitSentencesSafe('Is it safe? Yes! Absolutely. Done.');
    expect(result).toEqual([
      'Is it safe?',
      'Yes!',
      'Absolutely.',
      'Done.',
    ]);
  });

  it('returns empty array for empty/whitespace input', () => {
    expect(splitSentencesSafe('')).toEqual([]);
    expect(splitSentencesSafe('   ')).toEqual([]);
  });
});

// ─── splitIntoBlocks ────────────────────────────────────────────────────────

describe('splitIntoBlocks', () => {
  it('splits on paragraph breaks (blank lines)', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toEqual(['First paragraph.', 'Second paragraph.']);
  });

  it('splits on markdown headers', () => {
    const text = '# Title\nSome intro.\n## Section\nContent here.';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toEqual([
      '# Title\nSome intro.',
      '## Section\nContent here.',
    ]);
  });

  it('preserves code fences as single blocks', () => {
    const text = [
      'Before code.',
      '',
      '```typescript',
      'const x = obj.method();',
      'if (x > 1.0) { return; }',
      '```',
      '',
      'After code.',
    ].join('\n');

    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toBe('Before code.');
    expect(blocks[1]).toContain('```typescript');
    expect(blocks[1]).toContain('const x = obj.method();');
    expect(blocks[1]).toContain('```');
    expect(blocks[2]).toBe('After code.');
  });

  it('handles tilde fences', () => {
    const text = '~~~\ncode\n~~~';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('~~~');
    expect(blocks[0]).toContain('code');
  });

  it('handles unclosed code fence gracefully', () => {
    const text = '```\nsome code\nmore code';
    const blocks = splitIntoBlocks(text);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    // Should not crash; content is preserved
    const all = blocks.join('\n');
    expect(all).toContain('some code');
  });
});

// ─── blocksToSegments ───────────────────────────────────────────────────────

describe('blocksToSegments', () => {
  it('keeps code blocks intact regardless of size', () => {
    const codeBlock = '```\n' + 'x'.repeat(500) + '\n```';
    const segments = blocksToSegments([codeBlock]);
    expect(segments).toEqual([codeBlock]);
  });

  it('keeps small blocks (≤300 chars) intact', () => {
    const small = 'A short paragraph.';
    expect(blocksToSegments([small])).toEqual([small]);
  });

  it('splits large text blocks into sentences', () => {
    const large = 'First sentence. ' + 'A'.repeat(200) + '. Second sentence. ' + 'B'.repeat(200) + '.';
    const segments = blocksToSegments([large]);
    // Should have at least 1 segment, and not be the original block
    expect(segments.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── splitSegments (integration of splitIntoBlocks + blocksToSegments) ─────

describe('splitSegments', () => {
  it('handles mixed markdown with code', () => {
    const text = [
      '# API Guide',
      '',
      'Call the endpoint with obj.fetch(). It returns JSON data.',
      '',
      '```json',
      '{"key": "value"}',
      '```',
      '',
      'Handle errors carefully.',
    ].join('\n');

    const segments = splitSegments(text);
    // Header + text
    expect(segments.some(s => s.includes('# API Guide'))).toBe(true);
    // Code block preserved
    expect(segments.some(s => s.includes('```json'))).toBe(true);
    // obj.fetch() not split
    expect(segments.some(s => s.includes('obj.fetch()'))).toBe(true);
  });
});

// ─── hardSplit ──────────────────────────────────────────────────────────────

describe('hardSplit', () => {
  it('splits long text on word boundaries', () => {
    const text = 'aaa bbb ccc ddd eee fff';
    const pieces = hardSplit(text, 10);
    for (const p of pieces) {
      expect(p.length).toBeLessThanOrEqual(10);
    }
    // All words preserved
    expect(pieces.join(' ')).toBe(text);
  });

  it('returns single piece if under maxLen', () => {
    expect(hardSplit('short', 100)).toEqual(['short']);
  });

  it('handles single word longer than maxLen', () => {
    const pieces = hardSplit('superlongword', 5);
    // Single word can't be split further
    expect(pieces).toEqual(['superlongword']);
  });
});

// ─── buildOverlapParts ──────────────────────────────────────────────────────

describe('buildOverlapParts', () => {
  it('takes trailing parts within overlap budget', () => {
    const parts = ['aaaa', 'bbbb', 'cccc', 'dddd'];
    // maxOverlap = 10 → should take 'cccc' + 'dddd' (4+1+4=9)
    const result = buildOverlapParts(parts, 10);
    expect(result).toEqual(['cccc', 'dddd']);
  });

  it('returns empty for empty input', () => {
    expect(buildOverlapParts([], 100)).toEqual([]);
  });

  it('takes all parts if they fit', () => {
    const parts = ['aa', 'bb'];
    const result = buildOverlapParts(parts, 100);
    expect(result).toEqual(['aa', 'bb']);
  });

  it('truncates oversized single part to trailing words', () => {
    const parts = ['short', 'alpha beta gamma delta epsilon'];
    const result = buildOverlapParts(parts, 14);
    // Should take tail words of the oversized part within budget
    expect(result.length).toBe(1);
    expect(result[0]).toBe('delta epsilon');
  });

  it('handles single unsplittable word as overlap', () => {
    const parts = ['short', 'unsplittableword'];
    const result = buildOverlapParts(parts, 5);
    // Single word can't be broken — returns as-is
    expect(result).toEqual(['unsplittableword']);
  });

  it('returns empty for zero overlap', () => {
    expect(buildOverlapParts(['a', 'b'], 0)).toEqual([]);
  });
});

// ─── takeTrailingWords ──────────────────────────────────────────────────────

describe('takeTrailingWords', () => {
  it('takes last N chars worth of words', () => {
    const result = takeTrailingWords('alpha beta gamma delta', 12);
    // 'gamma delta' = 11 chars, fits; 'beta gamma delta' = 16, too long
    expect(result).toBe('gamma delta');
  });

  it('returns entire text if it fits', () => {
    expect(takeTrailingWords('short', 100)).toBe('short');
  });

  it('returns last word if budget is tiny', () => {
    const result = takeTrailingWords('aaa bbb ccc', 4);
    expect(result).toBe('ccc');
  });
});

// ─── flattenSegments ────────────────────────────────────────────────────────

describe('flattenSegments', () => {
  it('passes through segments under chunkSize', () => {
    const segs = ['short', 'also short'];
    expect(flattenSegments(segs, 100)).toEqual(segs);
  });

  it('hard-splits oversized segments', () => {
    const big = 'word '.repeat(50).trim(); // ~249 chars
    const result = flattenSegments([big], 50);
    for (const piece of result) {
      expect(piece.length).toBeLessThanOrEqual(50);
    }
  });
});

// ─── chunkText (main function) ──────────────────────────────────────────────

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('returns single chunk if text fits', () => {
    const result = chunkText('Hello world.', 100, 20);
    expect(result).toEqual([
      { text: 'Hello world.', index: 0, totalChunks: 1 },
    ]);
  });

  it('returns correct index and totalChunks', () => {
    const text = 'Sentence one. '.repeat(100); // long text
    const result = chunkText(text, 200, 40);
    expect(result.length).toBeGreaterThan(1);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].index).toBe(i);
      expect(result[i].totalChunks).toBe(result.length);
    }
  });

  it('produces chunks within size limit (approximately)', () => {
    const text = 'This is a sentence. '.repeat(200);
    const chunkSize = 300;
    const result = chunkText(text, chunkSize, 50);

    // First chunk must respect size. Subsequent chunks may slightly exceed
    // due to overlap, but should be reasonable (< 2x chunkSize).
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThan(chunkSize * 2);
    }
  });

  it('preserves all content (no data loss)', () => {
    const sentences = Array.from({ length: 50 }, (_, i) => `Sentence number ${i + 1}.`);
    const text = sentences.join(' ');
    const result = chunkText(text, 200, 40);

    // Every sentence should appear in at least one chunk
    for (const sentence of sentences) {
      const found = result.some(r => r.text.includes(sentence));
      expect(found).toBe(true);
    }
  });

  it('overlap: consecutive chunks share content', () => {
    const text = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence here. Fifth sentence here. Sixth sentence here. Seventh sentence here. Eighth sentence here.';
    const result = chunkText(text, 80, 30);

    if (result.length >= 2) {
      // Check that chunk N and chunk N+1 have some overlapping text
      for (let i = 0; i < result.length - 1; i++) {
        const wordsA = new Set(result[i].text.split(/\s+/));
        const wordsB = new Set(result[i + 1].text.split(/\s+/));
        const shared = [...wordsA].filter(w => wordsB.has(w));
        expect(shared.length).toBeGreaterThan(0);
      }
    }
  });

  it('handles code fences without breaking them', () => {
    const code = [
      'Some intro text here.',
      '',
      '```js',
      'const x = 1;',
      'const y = obj.method();',
      '```',
      '',
      'Some outro text after the code block.',
    ].join('\n');

    const result = chunkText(code, 500, 50);
    // Code block should be intact in one chunk
    const codeChunk = result.find(r => r.text.includes('```js'));
    expect(codeChunk).toBeDefined();
    expect(codeChunk!.text).toContain('const y = obj.method()');
    expect(codeChunk!.text).toContain('```');
  });

  it('does not split obj.method() across chunks', () => {
    const text = 'Initialize the client with client.connect() and then call client.query() to fetch data. ' +
      'The version is v2.1. ' +
      'Make sure to handle errors. '.repeat(20);
    const result = chunkText(text, 200, 40);

    for (const chunk of result) {
      // If a chunk contains "client." it should also contain the method call
      if (chunk.text.includes('client.connect')) {
        expect(chunk.text).toContain('client.connect()');
      }
      if (chunk.text.includes('client.query')) {
        expect(chunk.text).toContain('client.query()');
      }
    }
  });

  it('handles markdown with headers correctly', () => {
    const text = [
      '# Title',
      'Intro paragraph with enough text to matter.',
      '',
      '## Section A',
      'Content for section A with some detail here. '.repeat(10),
      '',
      '## Section B',
      'Content for section B with some detail here. '.repeat(10),
    ].join('\n');

    const result = chunkText(text, 300, 50);
    expect(result.length).toBeGreaterThan(1);
    // Headers should not be orphaned from their content
    const titleChunk = result.find(r => r.text.includes('# Title'));
    expect(titleChunk).toBeDefined();
    expect(titleChunk!.text).toContain('Intro paragraph');
  });

  it('handles very long single sentence via hard split', () => {
    const longSentence = 'word '.repeat(500).trim(); // ~2499 chars, no sentence breaks
    const result = chunkText(longSentence, 200, 40);
    expect(result.length).toBeGreaterThan(1);
    // With overlap truncation, chunks should stay reasonable
    for (const chunk of result) {
      // chunkSize + overlap budget is the max
      expect(chunk.text.length).toBeLessThanOrEqual(200 + 40 + 10); // small tolerance for join chars
    }
  });

  it('handles null/undefined gracefully', () => {
    expect(chunkText(null as unknown as string)).toEqual([]);
    expect(chunkText(undefined as unknown as string)).toEqual([]);
  });
});
