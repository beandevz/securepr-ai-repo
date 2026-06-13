/**
 * Unified diff parsing utilities.
 */
import { DiffRow } from '../types/diffrows';

export interface HunkHeader {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

/**
 * Parse hunk header line (e.g., "@@ -10,5 +10,7 @@").
 */
export function parseHunkHeader(line: string): HunkHeader | null {
  const m = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(line);
  if (!m) return null;

  return {
    oldStart: parseInt(m[1], 10),
    oldCount: m[2] ? parseInt(m[2], 10) : 1,
    newStart: parseInt(m[3], 10),
    newCount: m[4] ? parseInt(m[4], 10) : 1,
  };
}

/**
 * Parse unified diff patch into rows with old/new line numbers.
 */
export function parseUnifiedPatchToRows(patch: string): DiffRow[] {
  const rows: DiffRow[] = [];
  const lines = (patch || '').split('\n');

  let oldLine = 0;
  let newLine = 0;

  let pendingDels: Array<{ line: number; text: string }> = [];
  let pendingAdds: Array<{ line: number; text: string }> = [];

  function flushZip() {
    const pairs = Math.max(pendingDels.length, pendingAdds.length);
    for (let i = 0; i < pairs; i++) {
      const d = pendingDels[i];
      const a = pendingAdds[i];

      if (d && a) {
        rows.push({
          type: 'modify',
          oldLine: d.line,
          newLine: a.line,
          oldText: d.text,
          newText: a.text,
        });
      } else if (d) {
        rows.push({
          type: 'del',
          oldLine: d.line,
          oldText: d.text,
        });
      } else if (a) {
        rows.push({
          type: 'add',
          newLine: a.line,
          newText: a.text,
        });
      }
    }
    pendingDels = [];
    pendingAdds = [];
  }

  for (const raw of lines) {
    // Hunk header as context line
    if (raw.startsWith('@@')) {
      rows.push({
        type: 'context',
        oldText: raw,
        newText: raw,
      });
    }

    // Skip diff metadata
    if (
      raw.startsWith('diff --git') ||
      raw.startsWith('index ') ||
      raw.startsWith('--- ') ||
      raw.startsWith('+++ ')
    ) {
      continue;
    }

    const hunk = raw.startsWith('@@') ? parseHunkHeader(raw) : null;
    if (hunk) {
      flushZip();
      oldLine = hunk.oldStart;
      newLine = hunk.newStart;
      continue;
    }

    if (oldLine === 0 && newLine === 0) continue;

    if (raw.startsWith('-')) {
      pendingDels.push({ line: oldLine, text: raw.slice(1) });
      oldLine++;
      continue;
    }

    if (raw.startsWith('+')) {
      pendingAdds.push({ line: newLine, text: raw.slice(1) });
      newLine++;
      continue;
    }

    flushZip();

    const text = raw.startsWith(' ') ? raw.slice(1) : raw;
    rows.push({
      type: 'context',
      oldLine,
      newLine,
      oldText: text,
      newText: text,
    });
    oldLine++;
    newLine++;
  }

  flushZip();
  return rows;
}
