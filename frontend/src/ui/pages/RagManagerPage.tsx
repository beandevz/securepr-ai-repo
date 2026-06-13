import React, { useState } from 'react';
import { theme } from '../theme';

type TabType = 'upload' | 'search' | 'ingest';

interface SearchResult {
  id: string;
  content: string;
  source: string;
  relevanceScore: number;
}

interface IngestJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunks: number;
  progress: number;
}

export const RagManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [ingestJobs, setIngestJobs] = useState<IngestJob[]>([
    { id: '1', filename: 'owasp-guide.pdf', status: 'completed', chunks: 147, progress: 100 },
    { id: '2', filename: 'security-patterns.md', status: 'processing', chunks: 52, progress: 65 },
  ]);
  const [dragActive, setDragActive] = useState(false);

  const handleSearch = () => {
    // Mock search
    setSearchResults([
      {
        id: '1',
        content: 'SQL Injection occurs when user input is directly concatenated into SQL queries without proper sanitization...',
        source: 'owasp-guide.pdf (page 42)',
        relevanceScore: 0.95,
      },
      {
        id: '2',
        content: 'Always use parameterized queries or prepared statements to prevent SQL injection vulnerabilities...',
        source: 'security-patterns.md',
        relevanceScore: 0.87,
      },
      {
        id: '3',
        content: 'The OWASP Top 10 2021 lists Injection as A03, which includes SQL, NoSQL, and command injection...',
        source: 'owasp-guide.pdf (page 18)',
        relevanceScore: 0.82,
      },
    ]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const newJob: IngestJob = {
        id: Date.now().toString(),
        filename: file.name,
        status: 'pending',
        chunks: 0,
        progress: 0,
      };
      setIngestJobs([newJob, ...ingestJobs]);

      // Simulate processing
      setTimeout(() => {
        setIngestJobs(jobs => jobs.map(j =>
          j.id === newJob.id ? { ...j, status: 'processing', progress: 30 } : j
        ));
      }, 500);
    });
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: theme.spacing['2xl'],
      background: theme.colors.bg,
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: theme.spacing['2xl'] }}>
        <h1 style={{
          fontFamily: theme.fonts.ui,
          fontWeight: theme.fontWeights.extrabold,
          fontSize: '22px',
          color: theme.colors.text,
          letterSpacing: '-0.5px',
          margin: 0,
        }}>
          RAG Knowledge Base Manager
        </h1>
        <p style={{
          fontFamily: theme.fonts.ui,
          fontSize: '13px',
          color: theme.colors.text2,
          marginTop: '3px',
          margin: 0,
        }}>
          Upload security documentation, search knowledge base, and monitor ingestion jobs
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: theme.spacing.xl,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        {[
          { key: 'upload' as TabType, label: '📤 Upload', icon: '📤' },
          { key: 'search' as TabType, label: '🔍 Search', icon: '🔍' },
          { key: 'ingest' as TabType, label: '⚙️ Ingest Jobs', icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontFamily: theme.fonts.ui,
              fontSize: '13px',
              fontWeight: theme.fontWeights.semibold,
              cursor: 'pointer',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${theme.colors.blue}` : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? theme.colors.text : theme.colors.text2,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              background: dragActive ? theme.colors.surface2 : theme.colors.surface,
              border: `2px dashed ${dragActive ? theme.colors.blue : theme.colors.border2}`,
              borderRadius: theme.radius.lg,
              padding: '60px',
              textAlign: 'center',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div style={{ fontSize: '48px', marginBottom: theme.spacing.lg }}>
              📁
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontSize: '16px',
              color: theme.colors.text,
              fontWeight: theme.fontWeights.bold,
              marginBottom: theme.spacing.sm,
            }}>
              Drag & Drop Files Here
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontSize: '13px',
              color: theme.colors.text2,
              marginBottom: theme.spacing.lg,
            }}>
              or click to browse
            </div>
            <div style={{
              fontFamily: theme.fonts.mono,
              fontSize: '11px',
              color: theme.colors.text3,
            }}>
              Supported: PDF, Markdown, Text files
            </div>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.md,.txt"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{
            marginTop: theme.spacing['2xl'],
            padding: theme.spacing.xl,
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
          }}>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.bold,
              fontSize: '14px',
              color: theme.colors.text,
              marginBottom: theme.spacing.lg,
            }}>
              📚 Knowledge Base Guidelines
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontSize: '13px',
              color: theme.colors.text2,
              lineHeight: 1.7,
            }}>
              <ul style={{ marginLeft: theme.spacing.xl, marginTop: theme.spacing.sm }}>
                <li>Upload OWASP guides, security best practices, and coding standards</li>
                <li>Files are automatically chunked and embedded for semantic search</li>
                <li>RAG context enhances LLM analysis with domain-specific knowledge</li>
                <li>Recommended sources: OWASP Top 10, CWE database, language-specific security guides</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div>
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
              Search Knowledge Base
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., SQL injection prevention, XSS mitigation..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontFamily: theme.fonts.mono,
                  fontSize: '13px',
                  color: theme.colors.text,
                  background: theme.colors.bg2,
                  border: `1px solid ${theme.colors.border2}`,
                  borderRadius: theme.radius.sm,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: '10px 20px',
                  borderRadius: theme.radius.sm,
                  fontFamily: theme.fonts.ui,
                  fontSize: '13px',
                  fontWeight: theme.fontWeights.semibold,
                  cursor: 'pointer',
                  border: 'none',
                  background: theme.colors.blue,
                  color: 'white',
                }}
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <div style={{
                fontFamily: theme.fonts.ui,
                fontWeight: theme.fontWeights.bold,
                fontSize: '14px',
                color: theme.colors.text,
                marginBottom: theme.spacing.lg,
              }}>
                Results ({searchResults.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    style={{
                      background: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.lg,
                      padding: theme.spacing.xl,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: theme.spacing.md,
                    }}>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '11px',
                        color: theme.colors.text3,
                      }}>
                        {result.source}
                      </div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '11px',
                        color: theme.colors.green2,
                      }}>
                        {Math.round(result.relevanceScore * 100)}% relevant
                      </div>
                    </div>
                    <div style={{
                      fontFamily: theme.fonts.ui,
                      fontSize: '13px',
                      color: theme.colors.text2,
                      lineHeight: 1.7,
                    }}>
                      {result.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingest Jobs Tab */}
      {activeTab === 'ingest' && (
        <div>
          <div style={{
            fontFamily: theme.fonts.ui,
            fontWeight: theme.fontWeights.bold,
            fontSize: '14px',
            color: theme.colors.text,
            marginBottom: theme.spacing.lg,
          }}>
            Ingestion Queue ({ingestJobs.length} jobs)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {ingestJobs.map(job => {
              const statusConfig = job.status === 'completed' ? theme.status.pass :
                                   job.status === 'processing' ? theme.status.running :
                                   job.status === 'failed' ? theme.status.fail :
                                   theme.status.pending;

              return (
                <div
                  key={job.id}
                  style={{
                    background: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.xl,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}>
                    <div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '13px',
                        color: theme.colors.text,
                        fontWeight: theme.fontWeights.semibold,
                        marginBottom: '4px',
                      }}>
                        {job.filename}
                      </div>
                      <div style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: '11px',
                        color: theme.colors.text3,
                      }}>
                        {job.chunks > 0 && `${job.chunks} chunks · `}
                        {job.status}
                      </div>
                    </div>
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
                      background: statusConfig.bg,
                      color: statusConfig.color,
                      border: `1px solid ${statusConfig.border}`,
                    }}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>

                  {job.status === 'processing' && (
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: theme.fonts.mono,
                        fontSize: '10px',
                        color: theme.colors.text2,
                        marginBottom: '6px',
                      }}>
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div style={{
                        height: '4px',
                        background: theme.colors.bg2,
                        borderRadius: theme.radius.full,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${job.progress}%`,
                          background: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.cyan2})`,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
