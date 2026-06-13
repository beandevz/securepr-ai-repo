import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { exportAsJSON, exportAsCSV, exportAsMarkdown, exportAsHTML } from '../utils/export';

interface ScanResult {
  id: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  status: 'pass' | 'fail';
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

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [stats, setStats] = useState({
    prsScanned: 24,
    issuesDetected: 87,
    fixedToday: 12,
    passRate: 98,
  });

  const [recentScans, setRecentScans] = useState<ScanResult[]>([
    {
      id: '1',
      repo: 'api-service',
      prNumber: 456,
      prTitle: 'Add login endpoint',
      status: 'fail',
      severity: 'critical',
      count: 3,
      duration: '11.2s',
      timeAgo: '2m ago',
    },
    {
      id: '2',
      repo: 'frontend-app',
      prNumber: 231,
      prTitle: 'Update auth form',
      status: 'pass',
      duration: '8.4s',
      timeAgo: '12m ago',
    },
    {
      id: '3',
      repo: 'user-service',
      prNumber: 789,
      prTitle: 'Profile endpoint',
      status: 'fail',
      severity: 'medium',
      count: 1,
      duration: '9.1s',
      timeAgo: '18m ago',
    },
    {
      id: '4',
      repo: 'payments',
      prNumber: 102,
      prTitle: 'Checkout flow',
      status: 'pass',
      duration: '7.6s',
      timeAgo: '34m ago',
    },
    {
      id: '5',
      repo: 'api-service',
      prNumber: 455,
      prTitle: 'Rate limiting',
      status: 'fail',
      severity: 'low',
      count: 2,
      duration: '6.9s',
      timeAgo: '1h ago',
    },
  ]);

  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      type: 'critical',
      message: 'Critical SQL injection found in api-service #456',
      timeAgo: '2 min ago',
    },
    {
      id: '2',
      type: 'pass',
      message: 'frontend-app #231 passed all checks',
      timeAgo: '12 min ago',
    },
    {
      id: '3',
      type: 'queued',
      message: 'New scan queued for payments #103',
      timeAgo: 'Just now',
    },
  ]);

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
        ● {scan.count} {scan.severity?.toUpperCase()}
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
            Today · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Last updated 2 min ago
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
                  {
                    label: 'Export as CSV',
                    handler: () => {
                      const headers = ['Repository', 'PR Number', 'Title', 'Status', 'Severity', 'Count', 'Duration', 'Time'];
                      const rows = recentScans.map(s => [
                        s.repo,
                        s.prNumber.toString(),
                        s.prTitle,
                        s.status,
                        s.severity || 'N/A',
                        s.count?.toString() || '0',
                        s.duration,
                        s.timeAgo
                      ]);
                      const escapeCsv = (cell: string) => cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell;
                      const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `securepr-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  },
                  {
                    label: 'Export as Markdown',
                    handler: () => {
                      const md = `# SecurePR AI Dashboard Export

**Exported:** ${new Date().toLocaleString()}

## Summary Statistics

- **PRs Scanned Today:** ${stats.prsScanned}
- **Issues Detected:** ${stats.issuesDetected}
- **Fixed Today:** ${stats.fixedToday}
- **Pass Rate:** ${stats.passRate}%

## Recent Scans (${recentScans.length})

| Repository | PR | Title | Status | Severity | Duration | Time |
|------------|----|----|--------|----------|----------|------|
${recentScans.map(s => `| ${s.repo} | #${s.prNumber} | ${s.prTitle} | ${s.status} | ${s.severity || 'N/A'} | ${s.duration} | ${s.timeAgo} |`).join('\n')}

## Recent Activity

${activities.map((a, i) => `${i + 1}. **${a.type.toUpperCase()}:** ${a.message} *(${a.timeAgo})*`).join('\n')}

---
*Generated by SecurePR AI*
`;
                      const blob = new Blob([md], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `securepr-dashboard-${new Date().toISOString().split('T')[0]}.md`;
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

          {/* Webhook Button */}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.colors.blue;
            }}
          >
            + Connect Repository
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: theme.spacing.lg,
        marginBottom: theme.spacing['2xl'],
      }}>
        {[
          { icon: '🔍', num: stats.prsScanned, label: 'PRs Scanned Today', color: theme.colors.blue, delta: '↑ 12%', deltaColor: theme.colors.green2 },
          { icon: '⚠️', num: stats.issuesDetected, label: 'Issues Detected', color: theme.colors.red, delta: '↓ 8%', deltaColor: theme.colors.red2 },
          { icon: '✅', num: stats.fixedToday, label: 'Fixed Today', color: theme.colors.green, delta: '↑ 4%', deltaColor: theme.colors.green2 },
          { icon: '📈', num: `${stats.passRate}%`, label: 'Pass Rate', color: theme.colors.cyan, delta: '+1.2%', deltaColor: theme.colors.cyan2 },
        ].map((stat, i) => (
          <div key={i} style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.2s',
            cursor: 'default',
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
              position: 'absolute',
              top: theme.spacing.lg,
              right: theme.spacing.lg,
              fontFamily: theme.fonts.mono,
              fontSize: '11px',
              color: stat.deltaColor,
            }}>
              {stat.delta}
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.extrabold,
              fontSize: '32px',
              color: theme.colors.text,
              letterSpacing: '-1px',
              lineHeight: 1,
            }}>
              {stat.num}
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
                transition: 'all 0.15s',
              }}
            >
              View Queue →
            </button>
          </div>
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
                  letterSpacing: '1px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>Repository</th>
                <th style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  color: theme.colors.text3,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>PR</th>
                <th style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  color: theme.colors.text3,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>Result</th>
                <th style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  color: theme.colors.text3,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>Duration</th>
                <th style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  color: theme.colors.text3,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.colors.surface2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
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
                    #{scan.prNumber} — {scan.prTitle}
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
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
          {/* Issues This Week Chart */}
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
              Issues This Week
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              height: '60px',
              padding: '0 4px',
            }}>
              {[40, 65, 30, 80, 55, 45, 100].map((height, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${height}%`,
                    borderRadius: '4px 4px 0 0',
                    background: i < 4 ? 'rgba(239,68,68,0.5)' : i < 6 ? 'rgba(245,158,11,0.5)' : theme.colors.blue,
                    opacity: i === 6 ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: theme.fonts.mono,
              fontSize: '9px',
              color: theme.colors.text3,
              marginTop: '6px',
            }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>

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
                      <div dangerouslySetInnerHTML={{
                        __html: activity.message.replace(/api-service #\d+|frontend-app #\d+|payments #\d+/g,
                          match => `<strong style="color:${theme.colors.blue2}">${match}</strong>`)
                      }} />
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
