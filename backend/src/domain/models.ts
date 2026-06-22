/**
 * Domain models and types for SecurePR AI.
 */

/** Severity ordering (higher number = more severe) */
export const SEV_ORDER: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type OwaspCategory = 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A08' | 'A09' | 'A10';

export interface Evidence {
  line: number;
  code: string;
}

export interface Location {
  start_line: number;
  end_line: number;
}

export interface Finding {
  title: string;
  severity: Severity;
  owasp_top10_2025: OwaspCategory;
  confidence: Confidence;
  file_path: string;
  location: Location;
  evidence: Evidence[];
  risk: string;
  recommendation: string;
  safe_fix_example?: string;
  references?: string[];
}
