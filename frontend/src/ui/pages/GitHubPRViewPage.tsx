import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { theme } from '../theme';

interface DiffLine {
  type: 'context' | 'add' | 'del';
  oldLineNum?: number;
  newLineNum?: number;
  content: string;
  hasComment?: boolean;
  commentText?: string;
  commentSeverity?: 'critical' | 'high' | 'medium' | 'low';
}

interface DiffFile {
  filename: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

export const GitHubPRViewPage: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [prData, setPrData] = useState<any>(null);

  useEffect(() => {
    // Mock GitHub PR view data
    setPrData({
      repo: 'myorg/api-service',
      prNumber: 456,
      title: 'Add user login endpoint',
      author: 'jsmith',
      openedAt: '5 minutes ago',
      filesChanged: 3,
      additions: 47,
      deletions: 12,
      checkStatus: {
        name: 'SecurePR AI',
        status: 'failure',
        criticalCount: 3,
        message: 'Merging is blocked until all CRITICAL issues are resolved. Click findings below for fix instructions.',
      },
      diffFiles: [
        {
          filename: 'app/routes/login.py',
          additions: 18,
          deletions: 4,
          lines: [
            { type: 'context', oldLineNum: 40, newLineNum: 40, content: '...' },
            { type: 'context', oldLineNum: 41, newLineNum: 41, content: 'from flask import request, jsonify' },
            { type: 'context', oldLineNum: 42, newLineNum: 42, content: 'from app.db import get_db_connection' },
            { type: 'context', oldLineNum: 43, newLineNum: 43, content: '' },
            { type: 'context', oldLineNum: 44, newLineNum: 44, content: 'def get_user(user_id):' },
            {
              type: 'del',
              oldLineNum: 45,
              content: '    query = f"SELECT * FROM users WHERE id=\'{user_id}\'"',
              hasComment: true,
              commentText: 'This query builds SQL by inserting user_id directly — an attacker can craft input to dump your entire database or bypass authentication.',
              commentSeverity: 'critical',
            },
            { type: 'del', oldLineNum: 46, content: '    return conn.execute(query).fetchone()' },
            { type: 'add', newLineNum: 45, content: '    query = "SELECT * FROM users WHERE id = %s"' },
            { type: 'add', newLineNum: 46, content: '    return conn.execute(query, (user_id,)).fetchone()' },
          ],
        },
        {
          filename: 'app/config.py',
          additions: 3,
          deletions: 1,
          lines: [
            { type: 'context', oldLineNum: 10, newLineNum: 10, content: 'import os' },
            {
              type: 'del',
              oldLineNum: 11,
              content: 'SECRET_KEY = "sup3r_s3cr3t_k3y_d0_n0t_sh4r3"',
              hasComment: true,
              commentText: 'This key is now permanently in your git history. Anyone with repo access can forge auth tokens.',
              commentSeverity: 'critical',
            },
            { type: 'add', newLineNum: 11, content: 'SECRET_KEY = os.environ.get("SECRET_KEY")' },
          ],
        },
      ],
    });
  }, [jobId]);

  if (!prData) {
    return <div style={{ padding: theme.spacing['2xl'], color: theme.colors.text }}>Loading...</div>;
  }

  const getLineStyle = (line: DiffLine) => {
    if (line.type === 'del') {
      return {
        background: 'rgba(248,81,73,0.1)',
        color: '#ff7b72',
      };
    }
    if (line.type === 'add') {
      return {
        background: 'rgba(63,185,80,0.1)',
        color: '#7ee787',
      };
    }
    return {
      background: 'transparent',
      color: '#e6edf3',
    };
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
    }}>
      {/* GitHub-style Top Bar */}
      <div style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.lg,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: theme.fonts.ui,
          fontWeight: 900,
          fontSize: '18px',
          color: '#f0f6fc',
        }}>
          ⬡ GitHub
        </div>
        <div style={{
          fontFamily: theme.fonts.mono,
          fontSize: '13px',
          color: '#58a6ff',
        }}>
          {prData.repo.split('/')[0]}
          <span style={{ color: '#8b949e', margin: '0 6px' }}>/</span>
          {prData.repo.split('/')[1]}
          <span style={{ color: '#8b949e', margin: '0 6px' }}>/</span>
          pull
          <span style={{ color: '#8b949e', margin: '0 6px' }}>/</span>
          {prData.prNumber}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
          <div style={{
            fontFamily: theme.fonts.mono,
            fontSize: '11px',
            color: '#8b949e',
          }}>
            SecurePR AI Bot
          </div>
          <button
            onClick={() => navigate(`/results/${jobId}`)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: theme.fonts.ui,
              cursor: 'pointer',
              border: '1px solid #30363d',
              background: '#21262d',
              color: '#c9d1d9',
              fontWeight: theme.fontWeights.semibold,
            }}
          >
            ← Back to Results
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: theme.spacing['2xl'],
      }}>
        {/* PR Header */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <div style={{
            fontFamily: theme.fonts.ui,
            fontWeight: 700,
            fontSize: '22px',
            color: '#f0f6fc',
            marginBottom: theme.spacing.sm,
          }}>
            {prData.title}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: theme.fonts.ui,
            fontSize: '13px',
            color: '#8b949e',
          }}>
            <div style={{
              background: '#238636',
              color: 'white',
              padding: '4px 12px',
              borderRadius: theme.radius.full,
              fontSize: '12px',
              fontWeight: theme.fontWeights.semibold,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}>
              ● Open
            </div>
            <span>{prData.author} opened this pull request {prData.openedAt}</span>
            <span>·</span>
            <span>{prData.filesChanged} files changed</span>
            <span>·</span>
            <span style={{ color: '#3fb950' }}>+{prData.additions}</span>
            <span style={{ color: '#f85149' }}>-{prData.deletions}</span>
          </div>
        </div>

        {/* Check Banner */}
        <div style={{
          background: 'rgba(248,81,73,0.08)',
          border: '1px solid rgba(248,81,73,0.25)',
          borderRadius: theme.radius.sm,
          padding: '14px 16px',
          marginBottom: theme.spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}>
          <div style={{ fontSize: '20px' }}>❌</div>
          <div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontSize: '13px',
              color: '#f0f6fc',
              fontWeight: 700,
            }}>
              {prData.checkStatus.name} — {prData.checkStatus.criticalCount} security issues found ({prData.checkStatus.criticalCount} Critical)
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8b949e',
              marginTop: '2px',
            }}>
              {prData.checkStatus.message}
            </div>
          </div>
        </div>

        {/* Diff Files */}
        {prData.diffFiles.map((file: DiffFile, fileIdx: number) => (
          <div
            key={fileIdx}
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: theme.radius.sm,
              marginBottom: theme.spacing.md,
              overflow: 'hidden',
            }}
          >
            {/* File Header */}
            <div style={{
              background: '#1c2128',
              padding: '10px 14px',
              borderBottom: '1px solid #30363d',
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: '#8b949e',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}>
              <span>📄</span>
              <span style={{ color: '#58a6ff', fontWeight: theme.fontWeights.semibold }}>
                {file.filename}
              </span>
              <span style={{ marginLeft: 'auto', color: '#3fb950', fontSize: '11px' }}>
                +{file.additions}
              </span>
              <span style={{ color: '#f85149', fontSize: '11px', marginLeft: '6px' }}>
                -{file.deletions}
              </span>
            </div>

            {/* Diff Lines */}
            {file.lines.map((line, lineIdx) => {
              const lineStyle = getLineStyle(line);
              return (
                <React.Fragment key={lineIdx}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    fontFamily: theme.fonts.mono,
                    fontSize: '12px',
                  }}>
                    <div style={{
                      width: '50px',
                      padding: '4px 8px',
                      textAlign: 'right',
                      color: 'rgba(139,148,158,0.5)',
                      borderRight: '1px solid #30363d',
                      flexShrink: 0,
                      userSelect: 'none',
                      fontSize: '11px',
                      background: line.type === 'del' ? 'rgba(248,81,73,0.06)' :
                                  line.type === 'add' ? 'rgba(63,185,80,0.06)' : 'transparent',
                    }}>
                      {line.type === 'del' ? '-' : line.type === 'add' ? '+' : line.oldLineNum}
                    </div>
                    <div style={{
                      flex: 1,
                      padding: '4px 12px',
                      whiteSpace: 'pre',
                      overflowX: 'auto',
                      ...lineStyle,
                    }}>
                      {line.content}
                    </div>
                  </div>

                  {/* Inline Bot Comment */}
                  {line.hasComment && (
                    <div style={{
                      margin: '8px 12px 12px 32px',
                      background: '#1c2128',
                      border: '1px solid #30363d',
                      borderRadius: theme.radius.sm,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        background: '#22272e',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        borderBottom: '1px solid #30363d',
                        fontFamily: theme.fonts.ui,
                        fontSize: '12px',
                        color: '#8b949e',
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.colors.blue}, ${theme.colors.cyan})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: 'white',
                          fontWeight: 700,
                        }}>
                          S
                        </div>
                        <div style={{ color: '#f0f6fc', fontWeight: theme.fontWeights.semibold }}>
                          securepr-ai[bot]
                        </div>
                        <span>commented 2 minutes ago</span>
                        <span style={{
                          marginLeft: 'auto',
                          background: 'rgba(248,81,73,0.15)',
                          color: '#f85149',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}>
                          CRITICAL
                        </span>
                      </div>
                      <div style={{ padding: '12px 14px' }}>
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
                          background: theme.severity.critical.bg,
                          color: theme.severity.critical.color,
                          border: `1px solid ${theme.severity.critical.border}`,
                          marginBottom: theme.spacing.sm,
                        }}>
                          🔴 SQL Injection — {file.filename} line {line.oldLineNum}
                        </span>
                        <div style={{
                          fontFamily: theme.fonts.ui,
                          fontSize: '12px',
                          color: '#c9d1d9',
                          lineHeight: 1.6,
                          marginTop: theme.spacing.sm,
                        }}>
                          <strong style={{ color: '#f0f6fc' }}>Risk:</strong> {line.commentText}
                          <br /><br />
                          <strong style={{ color: '#f0f6fc' }}>Fix:</strong> Use parameterized queries (shown below). The database driver handles escaping automatically.
                        </div>
                        <div style={{
                          background: 'rgba(63,185,80,0.08)',
                          border: '1px solid rgba(63,185,80,0.2)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontFamily: theme.fonts.mono,
                          fontSize: '11px',
                          color: '#7ee787',
                          marginTop: '10px',
                          lineHeight: 1.6,
                        }}>
                          ✅ Safe version:
                          <br />
                          query = "SELECT * FROM users WHERE id = %s"
                          <br />
                          return conn.execute(query, (user_id,)).fetchone()
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
