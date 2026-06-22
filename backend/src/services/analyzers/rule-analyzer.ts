import { Finding, Severity, Confidence, OwaspCategory } from '../../domain/models.js';
import { SecurityAnalyzer } from './base.js';

/**
 * Deterministic rule-based security analyzer.
 */
export class RuleBasedAnalyzer implements SecurityAnalyzer {
  private readonly SECRET_PATTERNS: RegExp[] = [
    /(?:api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{12,}['"]/i,
    /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/i,
  ];

  analyze(filePath: string, content: string): Finding[] {
    const findings: Finding[] = [];

    for (const pattern of this.SECRET_PATTERNS) {
      const match = pattern.exec(content);
      if (match) {
        findings.push({
          title: 'Possible hardcoded secret',
          severity: 'HIGH' as Severity,
          owasp_top10_2025: 'A02' as OwaspCategory,
          confidence: 'MEDIUM' as Confidence,
          file_path: filePath,
          location: { start_line: 1, end_line: 1 },
          evidence: [{ line: 1, code: match[0].substring(0, 200) }],
          risk: 'Hardcoded secrets can lead to unauthorized access if leaked.',
          recommendation: 'Remove secret from code; use secret manager/env vars and rotate keys.',
          references: ['OWASP Top 10:2025'],
        });
      }
    }

    return findings;
  }

  getName(): string {
    return 'RuleBasedAnalyzer';
  }
}
