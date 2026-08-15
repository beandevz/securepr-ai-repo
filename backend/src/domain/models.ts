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

/**
 * An internal policy/reference document a finding was grounded in.
 * Built server-side from the retrieved chunk, never from model output, so a
 * citation always points at a document that was actually retrieved.
 */
export interface PolicySource {
  source: string;
  /** 0-based index of the chunk within its document. */
  chunk_index: number;
  total_chunks: number;
  score: number;
  excerpt: string;
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
  /** Internal policy documents backing this finding (empty when none matched). */
  policy_sources?: PolicySource[];
}
