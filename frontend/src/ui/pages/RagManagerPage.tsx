import React, { useState, useEffect, useCallback } from 'react';
import { loadSettings } from '../lib/storage';
import { theme } from '../theme';

type TabType = 'upload' | 'ask' | 'sources';

interface Source {
  source: string;
  chunk_count: number;
  created_at: string;
}

interface KBStats {
  total_chunks: number;
  total_sources: number;
  db_size_bytes: number;
}

interface AskSource {
  source: string;
  score: number;
  text: string;
}

interface AskResult {
  answer: string;
  sources: AskSource[];
  llm_used: boolean;
}

export const RagManagerPage: React.FC = () => {
  const { apiBaseUrl } = loadSettings();
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Stats
  const [stats, setStats] = useState<KBStats | null>(null);

  // Upload
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Ask
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [askError, setAskError] = useState('');

  // Sources
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourcesError, setSourcesError] = useState('');

  // ─── Fetch Stats ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/rag/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Upload ─────────────────────────────────────────────────────────────

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setUploadResult('');
    setUploadError('');
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      fd.append('source_prefix', 'upload');

      const res = await fetch(`${apiBaseUrl}/rag/ingest/files`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setUploadResult(JSON.stringify(data, null, 2));
      fetchStats();
    } catch (e: any) {
      setUploadError(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  // ─── Ask ────────────────────────────────────────────────────────────────

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAskError('');
    setAskResult(null);
    try {
      const res = await fetch(`${apiBaseUrl}/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, top_k: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setAskResult(data);
    } catch (e: any) {
      setAskError(e?.message || String(e));
    } finally {
      setAsking(false);
    }
  };

  // ─── Sources ────────────────────────────────────────────────────────────

  const fetchSources = useCallback(async () => {
    setLoadingSources(true);
    setSourcesError('');
    try {
      const res = await fetch(`${apiBaseUrl}/rag/sources`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setSources(data.sources || []);
    } catch (e: any) {
      setSourcesError(e?.message || String(e));
    } finally {
      setLoadingSources(false);
    }
  }, [apiBaseUrl]);

  const deleteSource = async (source: string) => {
    if (!confirm(`Delete all chunks from "${source}"?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/rag/sources/${encodeURIComponent(source)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      fetchSources();
      fetchStats();
    } catch (e: any) {
      setSourcesError(e?.message || String(e));
    }
  };

  useEffect(() => {
    if (activeTab === 'sources') {
      fetchSources();
    }
  }, [activeTab, fetchSources]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: theme.spacing['2xl'],
      background: theme.colors.bg,
    }}>
      {/* Page Header with Stats */}
      <div style={{ marginBottom: theme.spacing['2xl'] }}>
        <h1 style={{
          fontFamily: theme.fonts.ui,
          fontWeight: theme.fontWeights.extrabold,
          fontSize: '22px',
          color: theme.colors.text,
          letterSpacing: '-0.5px',
          margin: 0,
        }}>
          RAG Knowledge Base
        </h1>
        <p style={{
          fontFamily: theme.fonts.ui,
          fontSize: '13px',
          color: theme.colors.text2,
          marginTop: '3px',
          margin: 0,
        }}>
          Upload documents, ask questions, and manage your security knowledge base
        </p>

        {/* Stats Bar */}
        {stats && (
          <div style={{
            display: 'flex',
            gap: theme.spacing.xl,
            marginTop: theme.spacing.lg,
            padding: '10px 16px',
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
          }}>
            {[
              { label: 'Sources', value: stats.total_sources },
              { label: 'Chunks', value: stats.total_chunks },
              { label: 'DB Size', value: formatBytes(stats.db_size_bytes) },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: '10px',
                  color: theme.colors.text3,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>{s.label}</span>
                <span style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: theme.colors.cyan2,
                }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: theme.spacing.xl,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        {[
          { key: 'upload' as TabType, label: '📤 Upload' },
          { key: 'ask' as TabType, label: '🤖 Ask AI' },
          { key: 'sources' as TabType, label: '📚 Sources' },
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

      {/* ─── Upload Tab ─────────────────────────────────────────────── */}
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
              cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
            onClick={() => !uploading && document.getElementById('file-upload')?.click()}
          >
            <div style={{ fontSize: '48px', marginBottom: theme.spacing.lg }}>
              {uploading ? '⏳' : '📁'}
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontSize: '16px',
              color: theme.colors.text,
              fontWeight: theme.fontWeights.bold,
              marginBottom: theme.spacing.sm,
            }}>
              {uploading ? 'Uploading & Processing...' : 'Drag & Drop Files Here'}
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontSize: '13px',
              color: theme.colors.text2,
              marginBottom: theme.spacing.lg,
            }}>
              {uploading ? 'Extracting text → Chunking → Embedding → Storing' : 'or click to browse'}
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

          {uploadError && (
            <div style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: theme.radius.lg,
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: '#ef4444',
            }}>
              ❌ {uploadError}
            </div>
          )}

          {uploadResult && (
            <div style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: theme.radius.lg,
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: theme.colors.green2,
            }}>
              ✅ Upload successful
              <pre style={{
                marginTop: theme.spacing.sm,
                background: theme.colors.bg2,
                padding: theme.spacing.md,
                borderRadius: theme.radius.sm,
                fontSize: '11px',
                color: theme.colors.text2,
                overflow: 'auto',
              }}>{uploadResult}</pre>
            </div>
          )}

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
              📚 RAG Pipeline
            </div>
            <div style={{
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: theme.colors.text2,
              lineHeight: 2,
            }}>
              <div>Step 1 → <strong style={{ color: theme.colors.cyan2 }}>PDF Upload</strong> — Files received via multipart form</div>
              <div>Step 2 → <strong style={{ color: theme.colors.cyan2 }}>Text Extraction</strong> — PDF parsed, text extracted</div>
              <div>Step 3 → <strong style={{ color: theme.colors.cyan2 }}>Smart Chunking</strong> — Sentence-aware splits with overlap</div>
              <div>Step 4 → <strong style={{ color: theme.colors.cyan2 }}>Embeddings</strong> — Vector representation generated</div>
              <div>Step 5 → <strong style={{ color: theme.colors.cyan2 }}>Vector Storage</strong> — Stored in SQLite with metadata</div>
              <div>Step 6 → <strong style={{ color: theme.colors.cyan2 }}>Retrieval</strong> — Cosine similarity search</div>
              <div>Step 7 → <strong style={{ color: theme.colors.cyan2 }}>LLM Answer</strong> — Context-grounded answer generation</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Ask AI Tab ─────────────────────────────────────────────── */}
      {activeTab === 'ask' && (
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
              Ask Your Knowledge Base
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., How to prevent SQL injection?"
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
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
                onClick={handleAsk}
                disabled={asking || !question.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: theme.radius.sm,
                  fontFamily: theme.fonts.ui,
                  fontSize: '13px',
                  fontWeight: theme.fontWeights.semibold,
                  cursor: asking ? 'wait' : 'pointer',
                  border: 'none',
                  background: theme.colors.blue,
                  color: 'white',
                  opacity: asking || !question.trim() ? 0.5 : 1,
                }}
              >
                {asking ? '⏳ Thinking...' : '🤖 Ask'}
              </button>
            </div>
          </div>

          {askError && (
            <div style={{
              padding: theme.spacing.lg,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: theme.radius.lg,
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: '#ef4444',
              marginBottom: theme.spacing.xl,
            }}>
              ❌ {askError}
            </div>
          )}

          {askResult && (
            <div>
              {/* Answer */}
              <div style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.xl,
                marginBottom: theme.spacing.xl,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.lg,
                }}>
                  <div style={{
                    fontFamily: theme.fonts.ui,
                    fontWeight: theme.fontWeights.bold,
                    fontSize: '14px',
                    color: theme.colors.text,
                  }}>
                    🤖 Answer
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: theme.radius.full,
                    fontFamily: theme.fonts.mono,
                    fontSize: '10px',
                    fontWeight: 700,
                    background: askResult.llm_used ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: askResult.llm_used ? theme.colors.green2 : '#f59e0b',
                    border: `1px solid ${askResult.llm_used ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                    {askResult.llm_used ? 'LLM Generated' : 'Raw Chunks'}
                  </span>
                </div>
                <div style={{
                  fontFamily: theme.fonts.ui,
                  fontSize: '13px',
                  color: theme.colors.text2,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}>
                  {askResult.answer}
                </div>
              </div>

              {/* Sources */}
              {askResult.sources.length > 0 && (
                <div>
                  <div style={{
                    fontFamily: theme.fonts.ui,
                    fontWeight: theme.fontWeights.bold,
                    fontSize: '14px',
                    color: theme.colors.text,
                    marginBottom: theme.spacing.lg,
                  }}>
                    📄 Sources ({askResult.sources.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {askResult.sources.map((src, i) => (
                      <div
                        key={i}
                        style={{
                          background: theme.colors.surface,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radius.lg,
                          padding: theme.spacing.lg,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: theme.spacing.sm,
                        }}>
                          <span style={{
                            fontFamily: theme.fonts.mono,
                            fontSize: '11px',
                            color: theme.colors.text3,
                          }}>
                            {src.source}
                          </span>
                          <span style={{
                            fontFamily: theme.fonts.mono,
                            fontSize: '11px',
                            color: theme.colors.green2,
                          }}>
                            {(src.score * 100).toFixed(1)}% relevant
                          </span>
                        </div>
                        <div style={{
                          fontFamily: theme.fonts.mono,
                          fontSize: '11px',
                          color: theme.colors.text2,
                          lineHeight: 1.6,
                          maxHeight: '100px',
                          overflow: 'hidden',
                        }}>
                          {src.text.substring(0, 300)}{src.text.length > 300 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Sources Tab ────────────────────────────────────────────── */}
      {activeTab === 'sources' && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.lg,
          }}>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.bold,
              fontSize: '14px',
              color: theme.colors.text,
            }}>
              Ingested Sources ({sources.length})
            </div>
            <button
              onClick={fetchSources}
              disabled={loadingSources}
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
              }}
            >
              {loadingSources ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {sourcesError && (
            <div style={{
              padding: theme.spacing.lg,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: theme.radius.lg,
              fontFamily: theme.fonts.mono,
              fontSize: '12px',
              color: '#ef4444',
              marginBottom: theme.spacing.lg,
            }}>
              ❌ {sourcesError}
            </div>
          )}

          {sources.length === 0 && !loadingSources && !sourcesError && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.lg,
            }}>
              <div style={{ fontSize: '32px', marginBottom: theme.spacing.md }}>📭</div>
              <div style={{
                fontFamily: theme.fonts.ui,
                fontSize: '14px',
                color: theme.colors.text2,
              }}>
                No documents ingested yet. Go to Upload tab to add some.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {sources.map(src => (
              <div
                key={src.source}
                style={{
                  background: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing.xl,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: '13px',
                    color: theme.colors.text,
                    fontWeight: theme.fontWeights.semibold,
                    marginBottom: '4px',
                  }}>
                    {src.source}
                  </div>
                  <div style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: '11px',
                    color: theme.colors.text3,
                  }}>
                    {src.chunk_count} chunks · ingested {src.created_at || 'unknown'}
                  </div>
                </div>
                <button
                  onClick={() => deleteSource(src.source)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: theme.radius.sm,
                    fontFamily: theme.fonts.ui,
                    fontSize: '11px',
                    fontWeight: theme.fontWeights.semibold,
                    cursor: 'pointer',
                    border: '1px solid rgba(239,68,68,0.25)',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    transition: 'all 0.15s',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
