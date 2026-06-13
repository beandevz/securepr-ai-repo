/**
 * Toolbar for diff filtering and view controls.
 */
import React from 'react';
import { SeverityFilter } from '../../types/severityfilter';

interface DiffToolbarProps {
  showOnlyIssues: boolean;
  onShowOnlyIssuesChange: (value: boolean) => void;
  severityFilter: SeverityFilter;
  onSeverityFilterChange: (filter: SeverityFilter) => void;
  findingsCount: number;
}

export default function DiffToolbar({
  showOnlyIssues,
  onShowOnlyIssuesChange,
  severityFilter,
  onSeverityFilterChange,
  findingsCount,
}: DiffToolbarProps) {
  return (
    <div className="split-diff-toolbar">
      <button
        className={`btn ${showOnlyIssues ? 'btn--active' : ''}`}
        onClick={() => onShowOnlyIssuesChange(true)}
      >
        Show only lines with issues
      </button>

      <button
        className={`btn ${!showOnlyIssues ? 'btn--active' : ''}`}
        onClick={() => onShowOnlyIssuesChange(false)}
      >
        Show full diff
      </button>

      <button
        className={`btn btn--ALL ${severityFilter === 'ALL' ? 'btn--active' : ''}`}
        onClick={() => onSeverityFilterChange('ALL')}
      >
        ALL
      </button>

      <button
        className={`btn btn--CRITICAL ${severityFilter === 'CRITICAL' ? 'btn--active' : ''}`}
        onClick={() => onSeverityFilterChange('CRITICAL')}
      >
        CRITICAL
      </button>

      <button
        className={`btn btn--HIGH ${severityFilter === 'HIGH' ? 'btn--active' : ''}`}
        onClick={() => onSeverityFilterChange('HIGH')}
      >
        HIGH
      </button>

      <button
        className={`btn btn--MEDIUM ${severityFilter === 'MEDIUM' ? 'btn--active' : ''}`}
        onClick={() => onSeverityFilterChange('MEDIUM')}
      >
        MEDIUM
      </button>

      <button
        className={`btn btn--LOW ${severityFilter === 'LOW' ? 'btn--active' : ''}`}
        onClick={() => onSeverityFilterChange('LOW')}
      >
        LOW
      </button>

      {showOnlyIssues && (
        <span className="pill warn">
          Filtered to issue lines
        </span>
      )}
    </div>
  );
}
