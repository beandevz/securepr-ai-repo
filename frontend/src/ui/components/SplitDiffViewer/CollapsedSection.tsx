/**
 * Collapsible section for unchanged diff lines.
 */
import React from 'react';
import { DiffBlock } from '../../types/diffblock';
import DiffRow from './DiffRow';
import { Finding } from '../../types/finding';

interface CollapsedSectionProps {
  block: DiffBlock;
  isExpanded: boolean;
  onToggle: () => void;
  byNewLine: Map<number, Finding[]>;
  findings: Finding[];
  activeFindingIndex?: number;
}

export default function CollapsedSection({
  block,
  isExpanded,
  onToggle,
  byNewLine,
  findings,
  activeFindingIndex,
}: CollapsedSectionProps) {
  if (block.kind !== 'collapsed') {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="split-diff__collapsed">
        <button className="split-diff__collapsed-btn" onClick={onToggle}>
          Show {block.count} unchanged lines
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="split-diff__collapsed split-diff__collapsed--open">
        <button className="split-diff__collapsed-btn" onClick={onToggle}>
          Hide unchanged lines
        </button>
      </div>

      {block.rows.map((row, idx) => {
        const annotations =
          typeof row.newLine === 'number'
            ? byNewLine.get(row.newLine)
            : undefined;

        return (
          <DiffRow
            key={`collapsed-row-${idx}`}
            row={row}
            annotations={annotations}
            findings={findings}
            activeFindingIndex={activeFindingIndex}
          />
        );
      })}
    </>
  );
}
