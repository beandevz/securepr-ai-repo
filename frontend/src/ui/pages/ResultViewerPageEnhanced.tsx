import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { theme, calculateScore, shouldFailGate, getSeverityConfig } from '../theme';
import { loadSettings } from '../lib/storage';
import { exportAsJSON, exportAsCSV, exportAsMarkdown, exportAsHTML } from '../utils/export';

interface Finding {
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

interface PRResult {
  repo: string;
  owner: string;
  pr_number: number;
  pr_title: string;
  author: string;
  opened_at: string;
  scan_duration: string;
  findings: Finding[];
}

export const ResultViewerPageEnhanced: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [prResult, setPrResult] = useState<PRResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set([0])); // First finding expanded by default
  const [fixingAll, setFixingAll] = useState(false);
  const [fixedFindings, setFixedFindings] = useState<Set<number>>(new Set());

  const { apiBaseUrl } = loadSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;

    async function fetchJob() {
      try {
        const res = await fetch(`${apiBaseUrl}/jobs/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = await res.json();

        const start = new Date(job.created_at).getTime();
        const end = job.updated_at ? new Date(job.updated_at).getTime() : new Date().getTime();
        const durationSec = Math.max(0.1, (end - start) / 1000);

        setPrResult({
          repo: job.repo || 'unknown',
          owner: job.owner || 'unknown',
          pr_number: job.pr_number || 0,
          pr_title: `PR #${job.pr_number || 0}`,
          author: 'author', // Github API could provide this, but job record might not have it
          opened_at: new Date(job.created_at).toLocaleDateString(),
          scan_duration: `${durationSec.toFixed(1)}s`,
          findings: job.result?.findings || [],
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId, apiBaseUrl]);

  if (loading) {
    return (
      <div style={{ padding: theme.spacing['2xl'], color: theme.colors.text }}>
        Loading...
      </div>
    );
  }

  if (error || !prResult) {
    return (
      <div style={{ padding: theme.spacing['2xl'], color: theme.colors.red2 }}>
        Failed to load job: {error || 'Not found'}
      </div>
    );
  }

  const score = calculateScore(prResult.findings);
  const shouldFail = shouldFailGate(prResult.findings);

  const severityCounts = prResult.findings.reduce((acc, f) => {
    const sev = f.severity.toLowerCase();
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredFindings = activeFilter === 'all'
    ? prResult.findings
    : prResult.findings.filter(f => f.severity.toLowerCase() === activeFilter);

  const toggleFinding = (index: number) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFindings(newExpanded);
  };

  const handleFixAll = async () => {
    setFixingAll(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setFixedFindings(new Set(prResult.findings.map((_, i) => i)));
    setFixingAll(false);
  };

  const handleFixOne = async (index: number) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFixedFindings(new Set([...fixedFindings, index]));
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: theme.spacing['2xl'],
      background: theme.colors.bg,
    }}>
      {/* Result Header */}
      <div style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        padding: '20px 24px',
        marginBottom: theme.spacing.xl,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xl,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: theme.fonts.mono,
            fontSize: '14px',
            color: theme.colors.blue2,
            fontWeight: theme.fontWeights.semibold,
          }}>
            {prResult.owner} / {prResult.repo}
          </div>
          <div style={{
            fontFamily: theme.fonts.ui,
            fontSize: '16px',
            color: theme.colors.text,
            fontWeight: theme.fontWeights.bold,
            marginTop: '4px',
          }}>
            {prResult.pr_title}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: theme.radius.full,
              fontFamily: theme.fonts.mono,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              background: shouldFail ? theme.status.fail.bg : theme.status.pass.bg,
              color: shouldFail ? theme.status.fail.color : theme.status.pass.color,
              border: `1px solid ${shouldFail ? theme.status.fail.border : theme.status.pass.border}`,
            }}>
              {shouldFail ? '❌ FAILED' : '✓ PASSED'}
            </span>
            <span style={{ fontFamily: theme.fonts.ui, fontSize: '12px', color: theme.colors.text2 }}>•</span>
            <span style={{ fontFamily: theme.fonts.ui, fontSize: '12px', color: theme.colors.text2 }}>
              PR #{prResult.pr_number}
            </span>
            <span style={{ fontFamily: theme.fonts.ui, fontSize: '12px', color: theme.colors.text2 }}>•</span>
            <span style={{ fontFamily: theme.fonts.ui, fontSize: '12px', color: theme.colors.text2 }}>
              {prResult.author} opened {prResult.opened_at}
            </span>
            <span style={{ fontFamily: theme.fonts.ui, fontSize: '12px', color: theme.colors.text2 }}>•</span>
            <span style={{ fontFamily: theme.fonts.ui, fontSize: '12px', color: theme.colors.text2 }}>
              Scanned in {prResult.scan_duration}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>
            {shouldFail ? '🔴' : '✅'}
          </div>
          <div style={{
            fontFamily: theme.fonts.mono,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: shouldFail ? theme.colors.red2 : theme.colors.green2,
          }}>
            {shouldFail ? 'MERGE BLOCKED' : 'READY TO MERGE'}
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <button
              onClick={() => navigate(`/github-pr/${jobId}`)}
              style={{
                padding: '5px 12px',
                borderRadius: theme.radius.sm,
                fontFamily: theme.fonts.ui,
                fontSize: '11px',
                fontWeight: theme.fontWeights.semibold,
                cursor: 'pointer',
                border: `1px solid ${theme.colors.border2}`,
                background: theme.colors.surface,
                color: theme.colors.text2,
              }}
            >
              View on GitHub →
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  const menu = e.currentTarget.nextElementSibling as HTMLElement;
                  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: theme.radius.sm,
                  fontFamily: theme.fonts.ui,
                  fontSize: '11px',
                  fontWeight: theme.fontWeights.semibold,
                  cursor: 'pointer',
                  border: `1px solid ${theme.colors.border2}`,
                  background: theme.colors.surface,
                  color: theme.colors.text2,
                }}
              >
                ↓ Export
              </button>
              <div
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: theme.colors.surface,
                  border: `1px solid ${theme.colors.border2}`,
                  borderRadius: theme.radius.sm,
                  boxShadow: theme.shadows.sm,
                  minWidth: '150px',
                  zIndex: 10,
                }}
                onClick={() => {
                  // Hide menu after click
                  (document.activeElement as HTMLElement)?.blur();
                }}
              >
                {[
                  { label: 'JSON', handler: () => exportAsJSON({ ...prResult, verdict: shouldFail ? 'FAIL' : 'PASS', score, threshold: 15, scanned_at: new Date().toISOString() } as any) },
                  { label: 'CSV', handler: () => exportAsCSV({ ...prResult, verdict: shouldFail ? 'FAIL' : 'PASS', score, threshold: 15, scanned_at: new Date().toISOString() } as any) },
                  { label: 'Markdown', handler: () => exportAsMarkdown({ ...prResult, verdict: shouldFail ? 'FAIL' : 'PASS', score, threshold: 15, scanned_at: new Date().toISOString() } as any) },
                  { label: 'HTML', handler: () => exportAsHTML({ ...prResult, verdict: shouldFail ? 'FAIL' : 'PASS', score, threshold: 15, scanned_at: new Date().toISOString() } as any) },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.handler();
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      color: theme.colors.text2,
                      fontFamily: theme.fonts.ui,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.colors.surface2;
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = theme.colors.text2;
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Explanation */}
      {shouldFail && (
        <div style={{
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
        }}>
          <div style={{
            fontFamily: theme.fonts.ui,
            fontWeight: theme.fontWeights.bold,
            fontSize: '14px',
            color: theme.colors.text,
            marginBottom: theme.spacing.lg,
          }}>
            📊 Why This PR Failed
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.xl,
          }}>
            {/* Score Calculation */}
            <div>
              <div style={{
                fontFamily: theme.fonts.mono,
                fontSize: '11px',
                color: theme.colors.text3,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: theme.spacing.md,
              }}>
                Score Calculation
              </div>
              <div style={{
                background: theme.colors.bg2,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                padding: theme.spacing.md,
                fontFamily: theme.fonts.mono,
                fontSize: '12px',
                color: theme.colors.text2,
                lineHeight: 1.8,
              }}>
                {Object.entries(severityCounts).map(([sev, count]) => {
                  const config = getSeverityConfig(sev as any);
                  const points = count * config.weight;
                  return (
                    <div key={sev} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: config.color }}>
                        {count} {sev.charAt(0).toUpperCase() + sev.slice(1)} × {config.weight}
                      </span>
                      <span style={{ color: config.color }}>= {points} pts</span>
                    </div>
                  );
                })}
                <div style={{
                  borderTop: `1px solid ${theme.colors.border}`,
                  marginTop: theme.spacing.sm,
                  paddingTop: theme.spacing.sm,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: theme.fontWeights.bold,
                  color: theme.colors.text,
                }}>
                  <span>Total Score</span>
                  <span style={{ color: theme.colors.red2 }}>{score} pts</span>
                </div>
              </div>
            </div>

            {/* Gate Decision */}
            <div>
              <div style={{
                fontFamily: theme.fonts.mono,
                fontSize: '11px',
                color: theme.colors.text3,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: theme.spacing.md,
              }}>
                Gate Decision
              </div>
              <div style={{
                background: theme.colors.bg2,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                padding: theme.spacing.md,
                fontFamily: theme.fonts.mono,
                fontSize: '12px',
                color: theme.colors.text2,
                lineHeight: 1.8,
              }}>
                <div>
                  ✅ PASS if: score &lt; 15 AND no CRITICAL
                </div>
                <div style={{ color: theme.colors.red2, fontWeight: theme.fontWeights.bold }}>
                  ❌ FAIL if: any CRITICAL OR score ≥ 15
                </div>
                <div style={{
                  marginTop: theme.spacing.md,
                  padding: theme.spacing.sm,
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: '4px',
                  color: theme.colors.red2,
                  fontWeight: theme.fontWeights.semibold,
                }}>
                  → {severityCounts.critical > 0 ? `${severityCounts.critical} CRITICAL issues found` : `Score ${score} ≥ 15`}
                </div>
              </div>
            </div>
          </div>

          {/* Fix All Button */}
          <div style={{ marginTop: theme.spacing.lg, textAlign: 'right' }}>
            <button
              onClick={handleFixAll}
              disabled={fixingAll || fixedFindings.size === prResult.findings.length}
              style={{
                padding: '10px 20px',
                borderRadius: theme.radius.sm,
                fontFamily: theme.fonts.ui,
                fontSize: '13px',
                fontWeight: theme.fontWeights.semibold,
                cursor: fixingAll || fixedFindings.size === prResult.findings.length ? 'not-allowed' : 'pointer',
                border: 'none',
                background: fixingAll || fixedFindings.size === prResult.findings.length ? theme.colors.surface2 : theme.colors.blue,
                color: 'white',
                opacity: fixingAll || fixedFindings.size === prResult.findings.length ? 0.5 : 1,
              }}
            >
              {fixingAll ? '⏳ Fixing All...' : fixedFindings.size === prResult.findings.length ? '✓ All Fixed' : '🔧 Fix All Issues'}
            </button>
          </div>
        </div>
      )}

      {/* Finding Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: theme.spacing.lg }}>
        {[
          { key: 'all', label: `All (${prResult.findings.length})` },
          { key: 'critical', label: `🔴 Critical (${severityCounts.critical || 0})`, color: theme.severity.critical.color },
          { key: 'high', label: `🟠 High (${severityCounts.high || 0})`, color: theme.severity.high.color },
          { key: 'medium', label: `🟡 Medium (${severityCounts.medium || 0})`, color: theme.severity.medium.color },
          { key: 'low', label: `🟢 Low (${severityCounts.low || 0})`, color: theme.severity.low.color },
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              fontFamily: theme.fonts.mono,
              fontSize: '11px',
              cursor: 'pointer',
              border: `1px solid ${activeFilter === filter.key ? theme.colors.blue : theme.colors.border}`,
              background: activeFilter === filter.key ? theme.colors.blue : theme.colors.surface,
              color: activeFilter === filter.key ? 'white' : theme.colors.text2,
              fontWeight: theme.fontWeights.semibold,
              transition: 'all 0.15s',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Findings */}
      {filteredFindings.map((finding) => {
        const realIndex = prResult.findings.indexOf(finding);
        const isExpanded = expandedFindings.has(realIndex);
        const isFixed = fixedFindings.has(realIndex);
        const severityConfig = getSeverityConfig(finding.severity as any);

        return (
          <div
            key={realIndex}
            style={{
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderLeft: `3px solid ${severityConfig.color}`,
              borderRadius: theme.radius.lg,
              overflow: 'hidden',
              marginBottom: theme.spacing.md,
              transition: 'all 0.2s',
              cursor: 'pointer',
              opacity: isFixed ? 0.6 : 1,
            }}
          >
            <div
              onClick={() => toggleFinding(realIndex)}
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: theme.radius.full,
                fontFamily: theme.fonts.mono,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                background: severityConfig.bg,
                color: severityConfig.color,
                border: `1px solid ${severityConfig.border}`,
              }}>
                {finding.severity.toUpperCase()}
              </span>
              <div style={{
                flex: 1,
                fontFamily: theme.fonts.ui,
                fontSize: '14px',
                fontWeight: theme.fontWeights.bold,
                color: theme.colors.text,
              }}>
                {isFixed && '✓ '}{finding.title}
              </div>
              <div style={{
                fontFamily: theme.fonts.mono,
                fontSize: '11px',
                color: theme.colors.text3,
              }}>
                {finding.file_path} : {finding.line_start}
              </div>
              <div style={{
                fontSize: '12px',
                color: theme.colors.text3,
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                ▼
              </div>
            </div>

            {isExpanded && (
              <div style={{
                padding: '0 18px 16px',
                borderTop: `1px solid ${theme.colors.border}`,
              }}>
                {/* What's Wrong */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    color: theme.colors.text3,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: theme.spacing.sm,
                  }}>
                    What's Wrong
                  </div>
                  <div style={{
                    fontFamily: theme.fonts.ui,
                    fontSize: '13px',
                    color: theme.colors.text2,
                    lineHeight: 1.7,
                  }}>
                    {finding.description}
                  </div>
                </div>

                {/* Vulnerable Code */}
                {finding.vulnerable_code && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: '10px',
                      color: theme.colors.text3,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: theme.spacing.sm,
                    }}>
                      Vulnerable Code
                    </div>
                    <pre style={{
                      background: theme.colors.bg,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.sm,
                      padding: '12px 14px',
                      fontFamily: theme.fonts.mono,
                      fontSize: '12px',
                      lineHeight: 1.6,
                      overflowX: 'auto',
                      color: '#f87171',
                      margin: 0,
                    }}>
                      {finding.vulnerable_code}
                    </pre>
                  </div>
                )}

                {/* Safe Fix */}
                {finding.safe_fix && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: '10px',
                      color: theme.colors.text3,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: theme.spacing.sm,
                    }}>
                      ✅ Safe Fix
                    </div>
                    <pre style={{
                      background: 'rgba(16,185,129,0.06)',
                      border: `1px solid rgba(16,185,129,0.2)`,
                      borderRadius: theme.radius.sm,
                      padding: '12px 14px',
                      fontFamily: theme.fonts.mono,
                      fontSize: '12px',
                      color: theme.colors.green2,
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {finding.safe_fix}
                    </pre>
                  </div>
                )}

                {/* Fix Button */}
                <div style={{ marginTop: theme.spacing.lg }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFixOne(realIndex);
                    }}
                    disabled={isFixed}
                    style={{
                      padding: '8px 16px',
                      borderRadius: theme.radius.sm,
                      fontFamily: theme.fonts.ui,
                      fontSize: '12px',
                      fontWeight: theme.fontWeights.semibold,
                      cursor: isFixed ? 'not-allowed' : 'pointer',
                      border: 'none',
                      background: isFixed ? theme.colors.surface2 : theme.colors.green,
                      color: 'white',
                      opacity: isFixed ? 0.6 : 1,
                    }}
                  >
                    {isFixed ? '✓ Fixed' : '🔧 Fix This Issue'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
