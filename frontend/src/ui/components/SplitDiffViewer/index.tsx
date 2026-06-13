/**
 * Split diff viewer with GitHub-style side-by-side comparison.
 *
 * Refactored from 563-line monolith into modular components.
 */
import React, { useMemo, useState } from 'react';
import { Finding } from '../../types/finding';
import { SeverityFilter } from '../../types/severityfilter';
import { parseUnifiedPatchToRows } from '../../utils/diffParser';
import { buildBlocks, buildIssueBlocks } from '../../utils/diffBlocks';
import DiffRow from './DiffRow';
import DiffToolbar from './DiffToolbar';
import CollapsedSection from './CollapsedSection';

interface SplitDiffViewerProps {
  patch: string;
  findings: Finding[];
  activeFindingIndex?: number;
}

/**
 * Check if finding matches severity filter.
 */
function matchesSeverity(f: Finding, filter: SeverityFilter): boolean {
  if (filter === 'ALL') return true;
  return (f.severity || '').toUpperCase() === filter;
}

export default function SplitDiffViewer({
  patch,
  findings,
  activeFindingIndex,
}: SplitDiffViewerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');

  // Parse diff into rows
  const rows = useMemo(() => parseUnifiedPatchToRows(patch), [patch]);

  // Filter findings by severity
  const filteredFindings = useMemo(
    () => findings.filter((f) => matchesSeverity(f, severityFilter)),
    [findings, severityFilter]
  );

  // Extract issue line numbers
  const issueLines = useMemo(() => {
    const set = new Set<number>();
    for (const f of filteredFindings) {
      if (typeof f.line === 'number') {
        set.add(f.line);
      }
    }
    return set;
  }, [filteredFindings]);

  // Build blocks (collapsed or issue-only)
  const blocks = useMemo(() => {
    if (showOnlyIssues) {
      return buildIssueBlocks(rows, issueLines, 1);
    }
    return buildBlocks(rows, 3, 6);
  }, [rows, showOnlyIssues, issueLines]);

  // Map findings by line number
  const byNewLine = useMemo(() => {
    const map = new Map<number, Finding[]>();
    for (const f of filteredFindings) {
      if (typeof f.line === 'number') {
        const arr = map.get(f.line) || [];
        arr.push(f);
        map.set(f.line, arr);
      }
    }
    return map;
  }, [filteredFindings]);

  return (
    <div className="split-diff-wrapper">
      <DiffToolbar
        showOnlyIssues={showOnlyIssues}
        onShowOnlyIssuesChange={setShowOnlyIssues}
        severityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        findingsCount={filteredFindings.length}
      />

      <div className="split-diff">
        {showOnlyIssues && findings.length === 0 && (
          <div className="split-diff__empty">
            No findings available to filter.
          </div>
        )}

        <div className="split-diff__header">
          <div className="split-diff__col split-diff__col--left">Before</div>
          <div className="split-diff__col split-diff__col--right">After</div>
        </div>

        {blocks.map((block, blockIndex) => {
          if (block.kind === 'rows') {
            return (
              <React.Fragment key={`rows-${blockIndex}`}>
                {block.rows.map((row, idx) => {
                  const annotations =
                    typeof row.newLine === 'number'
                      ? byNewLine.get(row.newLine)
                      : undefined;

                  return (
                    <DiffRow
                      key={`row-${blockIndex}-${idx}`}
                      row={row}
                      annotations={annotations}
                      findings={findings}
                      activeFindingIndex={activeFindingIndex}
                    />
                  );
                })}
              </React.Fragment>
            );
          }

          return (
            <CollapsedSection
              key={block.id}
              block={block}
              isExpanded={!!expanded[block.id]}
              onToggle={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [block.id]: !prev[block.id],
                }))
              }
              byNewLine={byNewLine}
              findings={findings}
              activeFindingIndex={activeFindingIndex}
            />
          );
        })}
      </div>
    </div>
  );
}
