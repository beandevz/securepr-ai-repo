import { Finding } from '../domain/models.js';

/**
 * Format a finding as an inline PR comment body.
 */
export function formatInlineComment(finding: Finding): string {
  const severity = finding.severity || 'MEDIUM';
  const owasp = finding.owasp_top10_2025 || 'N/A';
  const title = finding.title || 'Security Issue';
  const risk = finding.risk || 'Unknown risk';
  const recommendation = finding.recommendation || 'Review and fix';

  return (
    `**${severity}** \`${owasp}\` ${title}\n\n` +
    `**Risk:** ${risk}\n\n` +
    `**Recommendation:** ${recommendation}`
  );
}

/**
 * Format a summary comment for PR review.
 */
export function formatSummary(
  overall: string,
  count: number,
  shouldFail: boolean,
  threshold: string
): string {
  const gateStatus = shouldFail ? 'FAIL' : 'PASS';

  return (
    '## SecurePR AI Review\n\n' +
    `Overall: **${overall}**\n` +
    `Findings: **${count}**\n` +
    `Merge gate: **${gateStatus}** ` +
    `(threshold=${threshold})\n`
  );
}
