/**
 * Export utilities for SecurePR AI scan results
 * Supports JSON, CSV, Markdown, and PDF formats
 */

export interface ScanResult {
  scan_id?: string;
  repo: string;
  owner: string;
  pr_number: number;
  pr_title: string;
  author: string;
  scanned_at?: string;
  verdict: 'PASS' | 'FAIL';
  score: number;
  threshold: number;
  findings: Finding[];
}

export interface Finding {
  severity: string;
  title: string;
  file_path: string;
  line_start?: number;
  line_end?: number;
  description: string;
  risk: string;
  recommendation: string;
  vulnerable_code?: string;
  safe_fix?: string;
  owasp_category?: string;
  confidence?: number;
}

/**
 * Helper to trigger file download
 */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
function generateFilename(result: ScanResult, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const repo = result.repo.replace(/\//g, '-'); // myorg-api-service
  return `securepr-${repo}-pr${result.pr_number}-${timestamp}.${extension}`;
}

/**
 * Export scan results as JSON
 */
export function exportAsJSON(result: ScanResult) {
  const json = JSON.stringify(result, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFile(blob, generateFilename(result, 'json'));
}

/**
 * Export findings as CSV
 */
export function exportAsCSV(result: ScanResult) {
  const headers = [
    'Severity',
    'File',
    'Line',
    'Title',
    'OWASP Category',
    'Description',
    'Recommendation',
    'Confidence'
  ];

  const rows = result.findings.map(f => [
    f.severity,
    f.file_path,
    f.line_start?.toString() || '',
    f.title,
    f.owasp_category || '',
    f.description,
    f.recommendation,
    f.confidence ? `${f.confidence}%` : ''
  ]);

  const escapeCsvCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  downloadFile(blob, generateFilename(result, 'csv'));
}

/**
 * Export scan report as Markdown
 */
export function exportAsMarkdown(result: ScanResult) {
  const severityCounts = result.findings.reduce((acc, f) => {
    const sev = f.severity.toLowerCase();
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const md = `# SecurePR AI Security Report

**Repository:** ${result.owner}/${result.repo}
**Pull Request:** #${result.pr_number} - ${result.pr_title}
**Author:** ${result.author}
**Scanned:** ${result.scanned_at || new Date().toISOString()}
**Verdict:** ${result.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'}
**Score:** ${result.score} / ${result.threshold}

---

## Executive Summary

This pull request was scanned by SecurePR AI for security vulnerabilities and coding issues.

- **Total Findings:** ${result.findings.length}
- **Critical:** ${severityCounts.critical || 0}
- **High:** ${severityCounts.high || 0}
- **Medium:** ${severityCounts.medium || 0}
- **Low:** ${severityCounts.low || 0}

${result.verdict === 'FAIL'
  ? '**⚠️ Merge Status:** BLOCKED - Critical issues must be resolved before merging.'
  : '**✅ Merge Status:** READY - No blocking issues found.'}

---

## Scoring Breakdown

Each severity level has a weight:
- Critical: 10 points
- High: 5 points
- Medium: 2 points
- Low: 1 point

**Calculation:**
${Object.entries(severityCounts).map(([sev, count]) => {
  const weight = sev === 'critical' ? 10 : sev === 'high' ? 5 : sev === 'medium' ? 2 : 1;
  return `- ${count} ${sev.charAt(0).toUpperCase() + sev.slice(1)} × ${weight} = ${count * weight} pts`;
}).join('\n')}

**Total Score:** ${result.score} points

**Gate Decision:**
- ✅ PASS if: score < ${result.threshold} AND no CRITICAL issues
- ❌ FAIL if: any CRITICAL exists OR score ≥ ${result.threshold}

${result.verdict === 'FAIL'
  ? `**Result:** FAIL (${severityCounts.critical > 0 ? 'Critical issues found' : `Score ${result.score} ≥ ${result.threshold}`})`
  : '**Result:** PASS'}

---

## Detailed Findings

${result.findings.length === 0
  ? '**No security issues found!** 🎉'
  : result.findings.map((f, i) => `
### ${i + 1}. ${f.title}

**Severity:** \`${f.severity.toUpperCase()}\`
**File:** \`${f.file_path}\`${f.line_start ? ` (line ${f.line_start})` : ''}
${f.owasp_category ? `**OWASP Category:** ${f.owasp_category}  ` : ''}
${f.confidence ? `**Confidence:** ${f.confidence}%  ` : ''}

**Description:**
${f.description}

**Risk:**
${f.risk}

**Recommendation:**
${f.recommendation}

${f.vulnerable_code ? `
**Vulnerable Code:**
\`\`\`python
${f.vulnerable_code}
\`\`\`
` : ''}

${f.safe_fix ? `
**Safe Fix:**
\`\`\`python
${f.safe_fix}
\`\`\`
` : ''}

---
`).join('\n')}

---

## Next Steps

${result.verdict === 'FAIL' ? `
1. Review each finding above
2. Apply recommended fixes
3. Re-run SecurePR AI scan
4. Merge when all critical issues are resolved
` : `
1. Review findings (if any) for best practices
2. Consider applying recommendations
3. Merge when ready
`}

---

**Generated by [SecurePR AI](https://github.com/your-org/securepr-ai)** on ${new Date().toLocaleString()}
`;

  const blob = new Blob([md], { type: 'text/markdown' });
  downloadFile(blob, generateFilename(result, 'md'));
}

/**
 * Export scan report as HTML (for email/viewing)
 */
export function exportAsHTML(result: ScanResult) {
  const severityCounts = result.findings.reduce((acc, f) => {
    const sev = f.severity.toLowerCase();
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#fb923c';
      case 'medium': return '#fbbf24';
      case 'low': return '#34d399';
      default: return '#94a3b8';
    }
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecurePR AI Report - PR #${result.pr_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; padding: 40px; border-radius: 12px 12px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .content { padding: 40px; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .meta-item { padding: 15px; background: #f1f5f9; border-radius: 8px; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 5px; }
    .meta-value { font-size: 16px; font-weight: 600; }
    .verdict { text-align: center; padding: 20px; margin: 30px 0; border-radius: 8px; font-size: 18px; font-weight: 700; }
    .verdict.pass { background: #dcfce7; color: #166534; }
    .verdict.fail { background: #fee2e2; color: #991b1b; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat { text-align: center; padding: 20px; border-radius: 8px; border: 2px solid #e2e8f0; }
    .stat-num { font-size: 32px; font-weight: 800; margin-bottom: 5px; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .finding { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
    .finding-header { padding: 15px 20px; background: #f8fafc; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #e2e8f0; }
    .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .finding-title { flex: 1; font-weight: 600; font-size: 15px; }
    .finding-body { padding: 20px; }
    .finding-section { margin-bottom: 20px; }
    .finding-section-label { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
    .code-block { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; line-height: 1.6; }
    .safe-fix { background: #dcfce7; color: #166534; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; line-height: 1.6; }
    .footer { padding: 30px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 SecurePR AI Security Report</h1>
      <p>Pull Request Security Analysis</p>
    </div>

    <div class="content">
      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Repository</div>
          <div class="meta-value">${result.owner}/${result.repo}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Pull Request</div>
          <div class="meta-value">#${result.pr_number} - ${result.pr_title}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Author</div>
          <div class="meta-value">${result.author}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Scanned</div>
          <div class="meta-value">${new Date(result.scanned_at || Date.now()).toLocaleString()}</div>
        </div>
      </div>

      <div class="verdict ${result.verdict === 'PASS' ? 'pass' : 'fail'}">
        ${result.verdict === 'PASS' ? '✅ PASSED' : '❌ FAILED'} - Score: ${result.score}/${result.threshold}
      </div>

      <h2 style="margin-bottom: 20px;">Summary</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-num" style="color: #ef4444;">${severityCounts.critical || 0}</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color: #fb923c;">${severityCounts.high || 0}</div>
          <div class="stat-label">High</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color: #fbbf24;">${severityCounts.medium || 0}</div>
          <div class="stat-label">Medium</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color: #34d399;">${severityCounts.low || 0}</div>
          <div class="stat-label">Low</div>
        </div>
      </div>

      <h2 style="margin-bottom: 20px;">Detailed Findings</h2>
      ${result.findings.length === 0
        ? '<p style="text-align: center; padding: 40px; color: #64748b;">No security issues found! 🎉</p>'
        : result.findings.map((f, i) => `
          <div class="finding">
            <div class="finding-header">
              <span class="severity-badge" style="background: ${getSeverityColor(f.severity)}20; color: ${getSeverityColor(f.severity)}; border: 1px solid ${getSeverityColor(f.severity)}40;">
                ${f.severity.toUpperCase()}
              </span>
              <div class="finding-title">${i + 1}. ${f.title}</div>
              <span style="font-family: monospace; font-size: 12px; color: #64748b;">${f.file_path}:${f.line_start || '?'}</span>
            </div>
            <div class="finding-body">
              <div class="finding-section">
                <div class="finding-section-label">Description</div>
                <p>${f.description}</p>
              </div>
              ${f.owasp_category ? `
                <div class="finding-section">
                  <div class="finding-section-label">OWASP Category</div>
                  <p>${f.owasp_category}</p>
                </div>
              ` : ''}
              <div class="finding-section">
                <div class="finding-section-label">Risk</div>
                <p>${f.risk}</p>
              </div>
              <div class="finding-section">
                <div class="finding-section-label">Recommendation</div>
                <p>${f.recommendation}</p>
              </div>
              ${f.vulnerable_code ? `
                <div class="finding-section">
                  <div class="finding-section-label">Vulnerable Code</div>
                  <pre class="code-block">${f.vulnerable_code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
              ` : ''}
              ${f.safe_fix ? `
                <div class="finding-section">
                  <div class="finding-section-label">✅ Safe Fix</div>
                  <pre class="safe-fix">${f.safe_fix.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
    </div>

    <div class="footer">
      <p><strong>SecurePR AI</strong> - Shift Left Security. Detect Early. Ship Secure.</p>
      <p style="margin-top: 10px; font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  downloadFile(blob, generateFilename(result, 'html'));
}
