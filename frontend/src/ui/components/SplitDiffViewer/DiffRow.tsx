/**
 * Single diff row component with word-level highlighting.
 */
import React from 'react';
import { DiffRow as DiffRowType } from '../../types/diffrows';
import { Finding } from '../../types/finding';
import { diffWords } from '../../utils/wordDiff';

interface DiffRowProps {
  row: DiffRowType;
  annotations?: Finding[];
  findings: Finding[];
  activeFindingIndex?: number;
}

function sevClass(sev: string) {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  return 'low';
}

export default function DiffRow({ row, annotations, findings, activeFindingIndex }: DiffRowProps) {
  const wordDiff =
    row.type === 'modify'
      ? diffWords(row.oldText ?? '', row.newText ?? '')
      : null;

  return (
    <div
      className={`split-diff__row split-diff__row--${row.type} ${
        annotations && annotations.length > 0 ? 'has-issue' : ''
      }`}
    >
      {/* LEFT */}
      <div className="split-diff__cell split-diff__cell--left">
        <span className="split-diff__ln">{row.oldLine ?? ''}</span>
        <span className={`split-diff__code ${row.type === 'add' ? 'is-empty' : ''}`}>
          {row.type === 'modify' && wordDiff
            ? wordDiff.left.map((part, idx) => (
                <span
                  key={idx}
                  className={part.changed ? 'word word--removed' : 'word'}
                >
                  {part.text}
                </span>
              ))
            : row.oldText ?? ''}
        </span>
      </div>

      {/* RIGHT */}
      <div className="split-diff__cell split-diff__cell--right">
        <span className="split-diff__ln">{row.newLine ?? ''}</span>
        <span className={`split-diff__code ${row.type === 'del' ? 'is-empty' : ''}`}>
          {row.type === 'modify' && wordDiff
            ? wordDiff.right.map((part, idx) => (
                <span
                  key={idx}
                  className={part.changed ? 'word word--added' : 'word'}
                >
                  {part.text}
                </span>
              ))
            : row.newText ?? ''}
        </span>
      </div>

      {/* Annotations on RIGHT side */}
      {annotations && annotations.length > 0 && (
        <div className="split-diff__annotations">
          {annotations.map((f, idx) => {
            const globalIndex = findings.findIndex(
              (x) =>
                x.line === f.line &&
                x.title === f.title &&
                x.severity === f.severity
            );

            const isActive = globalIndex === activeFindingIndex;

            return (
              <div
                key={idx}
                id={globalIndex >= 0 ? `finding-${globalIndex}` : undefined}
                className={`annotation ${sevClass(f.severity)} ${
                  isActive ? 'annotation--active' : ''
                }`}
              >
                <div>
                  <b>{f.severity}</b> — {f.title}
                </div>

                {f.recommendation && (
                  <div className="annotation__meta">
                    <b>Fix:</b> {f.recommendation}
                  </div>
                )}

                {f.rag_source && (
                  <div className="annotation__meta">
                    KB: {f.rag_source}
                    {typeof f.rag_score === 'number'
                      ? ` (${f.rag_score.toFixed(2)})`
                      : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
