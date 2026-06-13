import React, { useState } from 'react';
import { apiPostJson } from '../lib/api';
import { loadSettings } from '../lib/storage';
import { mockRagSearchResults } from '../utils/mockData';

type Hit = { source: string; score: number; text: string };
type SearchResp = { ok: boolean; query: string; top_k: number; hits: Hit[] };

export default function RagSearchPage() {
  const { apiBaseUrl } = loadSettings();

  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(4);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SearchResp | null>(null);
  const [error, setError] = useState('');

  async function runSearch() {
    setLoading(true);
    setError('');
    setResp(null);
    try {
      const data = await apiPostJson<SearchResp>(apiBaseUrl, '/rag/search', {
        query,
        top_k: topK,
      });
      setResp(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const loadMock = () => {
    setQuery('parameterized queries');
    setResp(mockRagSearchResults as SearchResp);
    setError('');
  };

  const clear = () => {
    setQuery('');
    setResp(null);
    setError('');
  };

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">RAG Search</h2>
        <p className="p">Search your ingested KB chunks using embeddings.</p>

        <div className="grid two">
          <div>
            <label>Query</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., parameterized queries" />
          </div>
          <div>
            <label>Top K</label>
            <input type="number" value={topK} onChange={(e) => setTopK(Number(e.target.value))} min={1} max={20} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, gap: '0.5rem' }}>
          <button className="btn" onClick={runSearch} disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button className="btn" onClick={loadMock}>
            Load Sample Data
          </button>
          <button className="btn" onClick={clear}>
            Clear
          </button>
        </div>

        {error && <pre className="code">{error}</pre>}
      </section>

      {resp && (
        <section className="card">
          <h3 className="h1">Results</h3>
          <div className="grid">
            {resp.hits.map((h, i) => (
              <div key={i} className="card">
                <div className="row">
                  <span className="pill">{h.source}</span>
                  <span className="pill">{h.score.toFixed(3)}</span>
                </div>
                <pre className="code">{h.text}</pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}