/**
 * Severity utility functions for finding classification and styling.
 */

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Get CSS class for severity level.
 * Maps severity to pill color classes.
 */
export function severityClass(sev: string): string {
  const upper = (sev || '').toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH') return 'bad';
  if (upper === 'MEDIUM') return 'warn';
  return 'ok';
}

/**
 * Get numeric weight for severity (for sorting/comparison).
 */
export function severityWeight(sev: string): number {
  const upper = (sev || '').toUpperCase();
  if (upper === 'CRITICAL') return 4;
  if (upper === 'HIGH') return 3;
  if (upper === 'MEDIUM') return 2;
  if (upper === 'LOW') return 1;
  return 0;
}

/**
 * Sort findings by severity (highest first).
 */
export function sortBySeverity<T extends { severity: string }>(findings: T[]): T[] {
  return [...findings].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
}
