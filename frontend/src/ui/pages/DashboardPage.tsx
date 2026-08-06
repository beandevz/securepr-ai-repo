import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { loadSettings } from '../lib/storage';

interface ScanResult {
  id: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  status: 'pass' | 'fail' | 'running' | 'queued';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  count?: number;
  duration: string;
  timeAgo: string;
  author?: string;
}

interface Activity {
  id: string;
  type: 'critical' | 'pass' | 'queued';
  message: string;
  timeAgo: string;
}

interface JobRecord {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner: string;
  repo: string;
  pr_number: number;
  head_sha: string;
  result?: {
    overall: string;
    count: number;
    should_fail: boolean;
  };
  error?: string;
}

function timeSince(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { apiBaseUrl } = loadSettings();
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [stats, setStats] = useState({
    prsScanned: 0,
    issuesDetected: 0,
    fixedToday: 0,
    passRate: 100,
  });

  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function fetchJobs() {
      try {
        const res = await fetch(`${apiBaseUrl}/jobs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const jobs: JobRecord[] = await res.json() || [];

        if (!mounted) return;

        let issues = 0;
        let passCount = 0;

        const mappedScans: ScanResult[] = jobs.slice(0, 10).map(job => {
          let scanStatus: 'pass' | 'fail' | 'running' | 'queued' = 'queued';
          if (job.status === 'done') {
             scanStatus = job.result?.should_fail ? 'fail' : 'pass';
          } else if (job.status === 'running') {
             scanStatus = 'running';
          } else if (job.status === 'failed') {
             scanStatus = 'fail';
          }

          let severity: any = undefined;
          if (scanStatus === 'fail') severity = 'critical';
          if (job.result?.count) issues += job.result.count;
          if (scanStatus === 'pass') passCount++;

          const start = new Date(job.created_at).getTime();
          const end = job.updated_at ? new Date(job.updated_at).getTime() : new Date().getTime();
          const durationSec = Math.max(0.1, (end - start) / 1000);

          return {
            id: job.id,
            repo: job.repo || 'unknown',
            prNumber: job.pr_number || 0,
            prTitle: `PR #${job.pr_number || 0}`,
            status: scanStatus,
            severity,
            count: job.result?.count || 0,
            duration: `${durationSec.toFixed(1)}s`,
            timeAgo: timeSince(job.created_at)
          };
        });

        const passRate = jobs.length > 0 ? Math.round((passCount / jobs.length) * 100) : 100;
        
        setStats({
          prsScanned: jobs.length,
          issuesDetected: issues,
          fixedToday: 0, 
          passRate
        });

        setRecentScans(mappedScans);

        // Map to activities
        const mappedActs: Activity[] = mappedScans.slice(0, 5).map((scan, i) => {
          let type: 'critical' | 'pass' | 'queued' = 'queued';
          let message = `New scan queued for ${scan.repo} #${scan.prNumber}`;
          
          if (scan.status === 'pass') {
            type = 'pass';
            message = `${scan.repo} #${scan.prNumber} passed all checks`;
          } else if (scan.status === 'fail') {
            type = 'critical';
            message = `Issues found in ${scan.repo} #${scan.prNumber} (${scan.count} findings)`;
          }

          return {
            id: `${scan.id}-${i}`,
            type,
            message,
            timeAgo: scan.timeAgo
          };
        });
        setActivities(mappedActs);
        setError('');
      } catch (err: any) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => { 
      mounted = false;
      clearInterval(interval); 
    };
  }, [apiBaseUrl]);

  const getSeverityTag = (scan: ScanResult) => {
    if (scan.status === 'pass') {
      return (
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
          background: theme.status.pass.bg,
          color: theme.status.pass.color,
          border: `1px solid ${theme.status.pass.border}`,
        }}>
          ✓ PASSED
        </span>
      );
    }
    if (scan.status === 'running' || scan.status === 'queued') {
      return (
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
          background: theme.colors.surface2,
          color: theme.colors.text2,
          border: `1px solid ${theme.colors.border2}`,
        }}>
          {scan.status.toUpperCase()}
        </span>
      );
    }

    const severityConfig = scan.severity ? theme.severity[scan.severity] : theme.severity.medium;
    return (
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
        ● {scan.count} {scan.severity?.toUpperCase() || 'FAIL'}
      </span>
    );
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: theme.spacing['2xl'],
      background: theme.colors.bg,
    }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing['2xl'],
      }}>
        <div>
          <h1 style={{
            fontFamily: theme.fonts.ui,
            fontWeight: theme.fontWeights.extrabold,
            fontSize: '22px',
            color: theme.colors.text,
            letterSpacing: '-0.5px',
            margin: 0,
          }}>
            Security Dashboard
          </h1>
          <p style={{
            fontFamily: theme.fonts.ui,
            fontSize: '13px',
            color: theme.colors.text2,
            marginTop: '3px',
            margin: 0,
          }}>
            Today · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
              style={{
                padding: '8px 18px',
                borderRadius: theme.radius.sm,
                fontFamily: theme.fonts.ui,
                fontSize: '13px',
                fontWeight: theme.fontWeights.semibold,
                cursor: 'pointer',
                border: `1px solid ${theme.colors.border2}`,
                background: theme.colors.surface,
                color: theme.colors.text2,
                transition: 'all 0.15s',
              }}
            >
              ↓ Export All Scans
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border2}`,
                borderRadius: theme.radius.sm,
                boxShadow: theme.shadows.sm,
                minWidth: '180px',
                zIndex: 10,
              }}>
                {[
                  {
                    label: 'Export as JSON',
                    handler: () => {
                      const allScansExport = {
                        exported_at: new Date().toISOString(),
                        summary: stats,
                        scans: recentScans.map(scan => ({
                          repo: scan.repo,
                          pr_number: scan.prNumber,
                          pr_title: scan.prTitle,
                          status: scan.status,
                          severity: scan.severity,
                          count: scan.count,
                          duration: scan.duration,
                          scanned_at: scan.timeAgo,
                        })),
                        activities: activities,
                      };
                      const json = JSON.stringify(allScansExport, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `securepr-dashboard-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.preventDefault();
                      item.handler();
                      setShowExportMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      color: theme.colors.text2,
                      fontFamily: theme.fonts.ui,
                      fontSize: '13px',
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
            )}
          </div>

          <button
            onClick={() => navigate('/connect')}
            style={{
              padding: '8px 18px',
              borderRadius: theme.radius.sm,
              fontFamily: theme.fonts.ui,
              fontSize: '13px',
              fontWeight: theme.fontWeights.semibold,
              cursor: 'pointer',
              border: 'none',
              background: theme.colors.blue,
              color: 'white',
              transition: 'all 0.15s',
            }}
          >
            + Connect Repository
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Failed to load dashboard: {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: theme.spacing.lg,
        marginBottom: theme.spacing['2xl'],
      }}>
        {[
          { icon: '🔍', num: stats.prsScanned, label: 'PRs Scanned Today', color: theme.colors.blue },
          { icon: '⚠️', num: stats.issuesDetected, label: 'Issues Detected', color: theme.colors.red },
          { icon: '✅', num: stats.fixedToday, label: 'Fixed Today', color: theme.colors.green },
          { icon: '📈', num: `${stats.passRate}%`, label: 'Pass Rate', color: theme.colors.cyan },
        ].map((stat, i) => (
          <div key={i} style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: stat.color,
            }} />
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              marginBottom: theme.spacing.md,
              background: stat.color.replace(')', ', 0.12)').replace('#', 'rgba(') + ', 0.12)',
            }}>
              {stat.icon}
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.extrabold,
              fontSize: '32px',
              color: theme.colors.text,
              letterSpacing: '-1px',
              lineHeight: 1,
            }}>
              {loading ? '-' : stat.num}
            </div>
            <div style={{
              fontFamily: theme.fonts.mono,
              fontSize: '10px',
              color: theme.colors.text2,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: '6px',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: theme.spacing.lg,
      }}>
        {/* Recent Scans Table */}
        <div style={{
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.bold,
              fontSize: '14px',
              color: theme.colors.text,
            }}>
              Recent Scans
            </div>
            <button
              onClick={() => navigate('/queue')}
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
              View Queue →
            </button>
          </div>
          
          {recentScans.length === 0 && !loading ? (
             <div style={{ padding: '20px', textAlign: 'center', color: theme.colors.text3 }}>No recent scans found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    color: theme.colors.text3,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>Repository</th>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    color: theme.colors.text3,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>PR</th>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    color: theme.colors.text3,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>Result</th>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    color: theme.colors.text3,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>Duration</th>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    color: theme.colors.text3,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan, idx) => (
                  <tr
                    key={scan.id}
                    onClick={() => navigate(`/results/${scan.id}`)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.surface2; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: theme.fonts.mono,
                      fontSize: '12px',
                      color: theme.colors.blue2,
                      borderBottom: idx === recentScans.length - 1 ? 'none' : `1px solid ${theme.colors.border}`,
                    }}>
                      {scan.repo}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: theme.fonts.mono,
                      fontSize: '11px',
                      color: theme.colors.text3,
                      borderBottom: idx === recentScans.length - 1 ? 'none' : `1px solid ${theme.colors.border}`,
                    }}>
                      #{scan.prNumber}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: idx === recentScans.length - 1 ? 'none' : `1px solid ${theme.colors.border}`,
                    }}>
                      {getSeverityTag(scan)}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: theme.fonts.mono,
                      fontSize: '11px',
                      color: theme.colors.text2,
                      borderBottom: idx === recentScans.length - 1 ? 'none' : `1px solid ${theme.colors.border}`,
                    }}>
                      {scan.duration}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: theme.fonts.mono,
                      fontSize: '11px',
                      color: theme.colors.text3,
                      borderBottom: idx === recentScans.length - 1 ? 'none' : `1px solid ${theme.colors.border}`,
                    }}>
                      {scan.timeAgo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
          {/* Live Activity */}
          <div style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
          }}>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.bold,
              fontSize: '13px',
              color: theme.colors.text,
              marginBottom: theme.spacing.md,
            }}>
              Live Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activities.length === 0 && !loading && (
                 <div style={{ color: theme.colors.text3, fontSize: '12px' }}>No recent activity.</div>
              )}
              {activities.map(activity => {
                const iconBg = activity.type === 'critical' ? 'rgba(239,68,68,0.12)' :
                               activity.type === 'pass' ? 'rgba(16,185,129,0.12)' :
                               'rgba(59,130,246,0.12)';
                const icon = activity.type === 'critical' ? '🔴' :
                            activity.type === 'pass' ? '✅' : '🔍';

                return (
                  <div key={activity.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    background: theme.colors.bg2,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                    fontFamily: theme.fonts.ui,
                    fontSize: '12px',
                    color: theme.colors.text2,
                    lineHeight: 1.5,
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      flexShrink: 0,
                      background: iconBg,
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div>{activity.message}</div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '10px',
                        color: theme.colors.text3,
                        marginTop: '3px',
                      }}>
                        {activity.timeAgo}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
