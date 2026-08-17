import { Finding } from '../domain/models.js';

/** Severity ordering (higher number = more severe) */
const SEV_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Get the maximum severity from a list of findings.
 */
export function getMaxSeverity(findings: Finding[]): string {
  let best = 'LOW';
  for (const f of findings) {
    const severity = f.severity || 'LOW';
    if ((SEV_ORDER[severity] ?? 0) > (SEV_ORDER[best] ?? 0)) {
      best = severity;
    }
  }
  return best;
}

/**
 * Determine if merge gate should fail based on severity threshold.
 */
export function shouldFailGate(overallSeverity: string, thresholdSeverity: string): boolean {
  return (SEV_ORDER[overallSeverity] ?? 0) >= (SEV_ORDER[thresholdSeverity] ?? 0);
}
