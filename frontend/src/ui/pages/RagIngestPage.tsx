import React, { useState } from 'react';
import { loadSettings } from '../lib/storage';
import { mockRagDocuments } from '../utils/mockData';

export default function RagIngestPage() {
  const { apiBaseUrl } = loadSettings();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  async function ingest() {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await fetch(`${apiBaseUrl}/rag/ingest/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documents: [text]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const loadMock = () => {
    setText(mockRagDocuments.map(d => `[${d.source}]\n${d.text}`).join('\n\n---\n\n'));
    setResult('');
    setError('');
  };

  const clear = () => {
    setText('');
    setResult('');
    setError('');
  };

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">RAG Knowledge Base Ingestion</h2>

        <textarea
          placeholder="Paste secure coding guideline, OWASP doc, etc..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="row" style={{ gap: '0.5rem' }}>
          <button className="btn" onClick={ingest} disabled={loading || !text.trim()}>
            {loading ? "Uploading..." : "Ingest"}
          </button>
          <button className="btn" onClick={loadMock}>
            Load Sample Data
          </button>
          <button className="btn" onClick={clear}>
            Clear
          </button>
        </div>

        {error && <pre className="code">{error}</pre>}
        {result && <pre className="code">{result}</pre>}
      </section>
    </div>
  );
}