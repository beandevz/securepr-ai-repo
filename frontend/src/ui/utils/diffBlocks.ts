/**
 * Utilities for building collapsible diff blocks.
 */
import { DiffRow } from '../types/diffrows';
import { DiffBlock } from '../types/diffblock';

/**
 * Build blocks with collapsed unchanged sections.
 *
 * @param rows - All diff rows
 * @param contextRadius - Lines of context to show around changes
 * @param minCollapseSize - Minimum consecutive unchanged lines to collapse
 */
export function buildBlocks(
  rows: DiffRow[],
  contextRadius: number = 3,
  minCollapseSize: number = 6
): DiffBlock[] {
  const changedIndexes = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.type !== 'context')
    .map(({ i }) => i);

  // No changed lines -> show everything
  if (changedIndexes.length === 0) {
    return [{ kind: 'rows', rows }];
  }

  const visible = new Set<number>();

  for (const idx of changedIndexes) {
    const start = Math.max(0, idx - contextRadius);
    const end = Math.min(rows.length - 1, idx + contextRadius);
    for (let i = start; i <= end; i++) {
      visible.add(i);
    }
  }

  const blocks: DiffBlock[] = [];
  let i = 0;
  let collapsedId = 1;

  while (i < rows.length) {
    if (visible.has(i)) {
      const chunk: DiffRow[] = [];
      while (i < rows.length && visible.has(i)) {
        chunk.push(rows[i]);
        i++;
      }
      blocks.push({ kind: 'rows', rows: chunk });
    } else {
      const chunk: DiffRow[] = [];
      while (i < rows.length && !visible.has(i)) {
        chunk.push(rows[i]);
        i++;
      }

      if (chunk.length >= minCollapseSize) {
        blocks.push({
          kind: 'collapsed',
          id: `collapsed-${collapsedId++}`,
          count: chunk.length,
          rows: chunk,
        });
      } else {
        blocks.push({ kind: 'rows', rows: chunk });
      }
    }
  }

  return blocks;
}

/**
 * Build blocks showing only lines with issues (findings).
 *
 * @param rows - All diff rows
 * @param issueLines - Set of line numbers with findings
 * @param contextRadius - Lines of context around issues
 */
export function buildIssueBlocks(
  rows: DiffRow[],
  issueLines: Set<number>,
  contextRadius: number = 1
): DiffBlock[] {
  const visible = new Set<number>();

  rows.forEach((row, idx) => {
    if (typeof row.newLine === 'number' && issueLines.has(row.newLine)) {
      const start = Math.max(0, idx - contextRadius);
      const end = Math.min(rows.length - 1, idx + contextRadius);

      for (let i = start; i <= end; i++) {
        visible.add(i);
      }
    }
  });

  const blocks: DiffBlock[] = [];
  let i = 0;

  while (i < rows.length) {
    if (visible.has(i)) {
      const chunk: DiffRow[] = [];
      while (i < rows.length && visible.has(i)) {
        chunk.push(rows[i]);
        i++;
      }
      blocks.push({ kind: 'rows', rows: chunk });
    } else {
      i++;
    }
  }

  return blocks;
}
