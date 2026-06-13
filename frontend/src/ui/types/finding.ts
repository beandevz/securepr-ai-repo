export type Finding = {
  line?: number;
  line_start?: number;
  line_end?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title?: string;
  category?: string;
  file?: string;

  rag_source?: string;
  rag_score?: number;

  recommendation?: string;
  risk: string;
  owasp?: string;
  owasp_top10_2025?: string;
  file_path?: string;
  confidence?: number;
};  
