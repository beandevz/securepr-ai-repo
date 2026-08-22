import React, { useEffect, useState } from 'react';
import { theme } from '../theme';
import { loadSettings } from '../lib/storage';
import { apiGet, apiPostJson } from '../lib/api';

interface ConnectedRepo {
  id: string;
  owner: string;
  name: string;
  url: string;
  /** 'github.com' or an enterprise host such as 'github.boschdevcloud.com'. */
  host?: string;
  webhookConfigured: boolean;
  lastSync: string;
  status: 'active' | 'inactive';
}

export const ConnectRepoPage: React.FC = () => {
  const { apiBaseUrl } = loadSettings();
  const [githubToken, setGithubToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    apiGet<ConnectedRepo[]>(apiBaseUrl, '/repos')
      .then(repos => { if (mounted) setConnectedRepos(repos); })
      .catch(err => { if (mounted) setError(err.message || String(err)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [apiBaseUrl]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError('');

    try {
      const repo = await apiPostJson<ConnectedRepo>(apiBaseUrl, '/repos', { repoUrl, githubToken });
      setConnectedRepos(prev => [repo, ...prev]);
      setRepoUrl('');
      setGithubToken('');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm(
      'Disconnect this repository?\n\n' +
      'Its webhook, stored token, and every scan it produced are deleted. ' +
      'This cannot be undone.'
    )) return;
    try {
      await fetch(`${apiBaseUrl}/repos/${id}`, { method: 'DELETE' });
      setConnectedRepos(prev => prev.filter(repo => repo.id !== id));
    } catch (err: any) {
      setError(err.message || String(err));
    }
  };

  const handleConfigureWebhook = async (id: string) => {
    try {
      const repo = await apiPostJson<ConnectedRepo>(apiBaseUrl, `/repos/${id}/webhook`, {});
      setConnectedRepos(prev => prev.map(r => (r.id === id ? repo : r)));
    } catch (err: any) {
      setError(err.message || String(err));
    }
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
        marginBottom: theme.spacing['2xl'],
      }}>
        <h1 style={{
          fontFamily: theme.fonts.ui,
          fontWeight: theme.fontWeights.extrabold,
          fontSize: '22px',
          color: theme.colors.text,
          letterSpacing: '-0.5px',
          margin: 0,
        }}>
          Connect GitHub Repositories
        </h1>
        <p style={{
          fontFamily: theme.fonts.ui,
          fontSize: '13px',
          color: theme.colors.text2,
          marginTop: '3px',
          margin: 0,
        }}>
          Add repositories to enable automated security scanning on pull requests
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: theme.spacing.lg,
          padding: '10px 14px',
          borderRadius: theme.radius.sm,
          background: theme.status.fail.bg,
          border: `1px solid ${theme.status.fail.border}`,
          color: theme.status.fail.color,
          fontFamily: theme.fonts.ui,
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: theme.spacing['2xl'],
      }}>
        {/* Left Column - Connected Repos */}
        <div>
          <div style={{
            fontFamily: theme.fonts.ui,
            fontWeight: theme.fontWeights.bold,
            fontSize: '14px',
            color: theme.colors.text,
            marginBottom: theme.spacing.lg,
          }}>
            Connected Repositories ({connectedRepos.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {loading ? (
              <div style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.lg,
                padding: '40px',
                textAlign: 'center',
                fontFamily: theme.fonts.ui,
                fontSize: '13px',
                color: theme.colors.text2,
              }}>
                Loading connected repositories...
              </div>
            ) : connectedRepos.length === 0 ? (
              <div style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.lg,
                padding: '40px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: theme.spacing.lg,
                }}>
                  📁
                </div>
                <div style={{
                  fontFamily: theme.fonts.ui,
                  fontSize: '14px',
                  color: theme.colors.text2,
                }}>
                  No repositories connected yet
                </div>
                <div style={{
                  fontFamily: theme.fonts.ui,
                  fontSize: '12px',
                  color: theme.colors.text3,
                  marginTop: theme.spacing.sm,
                }}>
                  Use the form on the right to connect your first repository
                </div>
              </div>
            ) : (
              connectedRepos.map(repo => (
                <div key={repo.id} style={{
                  background: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing.xl,
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '14px',
                        color: theme.colors.blue2,
                        fontWeight: theme.fontWeights.semibold,
                        marginBottom: '4px',
                      }}>
                        {repo.owner} / {repo.name}
                        {repo.host && repo.host !== 'github.com' && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: theme.colors.surface3,
                            color: theme.colors.text2,
                            fontSize: '10px',
                            fontWeight: theme.fontWeights.semibold,
                          }}>
                            {repo.host}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '11px',
                        color: theme.colors.text3,
                      }}>
                        {repo.url}
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: theme.radius.full,
                      fontFamily: theme.fonts.mono,
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      background: repo.status === 'active' ? theme.status.pass.bg : theme.status.pending.bg,
                      color: repo.status === 'active' ? theme.status.pass.color : theme.status.pending.color,
                      border: `1px solid ${repo.status === 'active' ? theme.status.pass.border : theme.status.pending.border}`,
                    }}>
                      {repo.status === 'active' ? '● ACTIVE' : '○ INACTIVE'}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: theme.spacing.lg,
                    padding: theme.spacing.md,
                    background: theme.colors.bg2,
                    borderRadius: theme.radius.sm,
                    marginBottom: theme.spacing.md,
                  }}>
                    <div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '10px',
                        color: theme.colors.text3,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '4px',
                      }}>
                        Webhook Status
                      </div>
                      <div style={{
                        fontFamily: theme.fonts.ui,
                        fontSize: '12px',
                        color: repo.webhookConfigured ? theme.colors.green2 : theme.colors.amber2,
                        fontWeight: theme.fontWeights.semibold,
                      }}>
                        {repo.webhookConfigured ? '✓ Configured' : '⚠ Not Configured'}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '10px',
                        color: theme.colors.text3,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '4px',
                      }}>
                        Last Sync
                      </div>
                      <div style={{
                        fontFamily: theme.fonts.ui,
                        fontSize: '12px',
                        color: theme.colors.text2,
                      }}>
                        {repo.lastSync}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                    {!repo.webhookConfigured && (
                      <button
                        onClick={() => handleConfigureWebhook(repo.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: theme.radius.sm,
                          fontFamily: theme.fonts.ui,
                          fontSize: '12px',
                          fontWeight: theme.fontWeights.semibold,
                          cursor: 'pointer',
                          border: 'none',
                          background: theme.colors.blue,
                          color: 'white',
                          transition: 'all 0.15s',
                        }}
                      >
                        Configure Webhook
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(repo.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: theme.radius.sm,
                        fontFamily: theme.fonts.ui,
                        fontSize: '12px',
                        fontWeight: theme.fontWeights.semibold,
                        cursor: 'pointer',
                        border: `1px solid ${theme.colors.border2}`,
                        background: theme.colors.surface,
                        color: theme.colors.text2,
                        transition: 'all 0.15s',
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Connection Form */}
        <div>
          <div style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing['2xl'],
            position: 'sticky',
            top: theme.spacing['2xl'],
          }}>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.bold,
              fontSize: '14px',
              color: theme.colors.text,
              marginBottom: theme.spacing.lg,
            }}>
              Add New Repository
            </div>

            <form onSubmit={handleConnect}>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontFamily: theme.fonts.mono,
                  fontSize: '11px',
                  color: theme.colors.text2,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: theme.spacing.sm,
                }}>
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo or https://github.boschdevcloud.com/owner/repo"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontFamily: theme.fonts.mono,
                    fontSize: '13px',
                    color: theme.colors.text,
                    background: theme.colors.bg2,
                    border: `1px solid ${theme.colors.border2}`,
                    borderRadius: theme.radius.sm,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.colors.blue;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.colors.border2;
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontFamily: theme.fonts.mono,
                  fontSize: '11px',
                  color: theme.colors.text2,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: theme.spacing.sm,
                }}>
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxx"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontFamily: theme.fonts.mono,
                    fontSize: '13px',
                    color: theme.colors.text,
                    background: theme.colors.bg2,
                    border: `1px solid ${theme.colors.border2}`,
                    borderRadius: theme.radius.sm,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.colors.blue;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.colors.border2;
                  }}
                />
                <div style={{
                  fontFamily: theme.fonts.ui,
                  fontSize: '11px',
                  color: theme.colors.text3,
                  marginTop: theme.spacing.sm,
                }}>
                  Token needs <code style={{
                    background: theme.colors.surface3,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                  }}>repo</code> and <code style={{
                    background: theme.colors.surface3,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                  }}>webhook</code> permissions
                </div>
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  borderRadius: theme.radius.sm,
                  fontFamily: theme.fonts.ui,
                  fontSize: '13px',
                  fontWeight: theme.fontWeights.semibold,
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                  border: 'none',
                  background: isConnecting ? theme.colors.surface2 : theme.colors.blue,
                  color: 'white',
                  transition: 'all 0.15s',
                  opacity: isConnecting ? 0.6 : 1,
                }}
              >
                {isConnecting ? '⏳ Connecting...' : '+ Connect Repository'}
              </button>
            </form>

            <div style={{
              marginTop: theme.spacing['2xl'],
              padding: theme.spacing.lg,
              background: theme.colors.bg2,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.sm,
            }}>
              <div style={{
                fontFamily: theme.fonts.ui,
                fontSize: '12px',
                color: theme.colors.text2,
                lineHeight: 1.6,
              }}>
                <strong style={{ color: theme.colors.text }}>ℹ️ Setup Instructions:</strong>
                <ol style={{ marginTop: theme.spacing.sm, paddingLeft: theme.spacing.xl }}>
                  <li>Create a GitHub Personal Access Token</li>
                  <li>Enter your repository URL and token</li>
                  <li>SecurePR AI will auto-configure the webhook</li>
                  <li>Start receiving security scans on new PRs</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
