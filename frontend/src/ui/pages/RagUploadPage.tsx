import React, { useState } from 'react';
import { loadSettings } from '../lib/storage';

export default function RagUploadPage() {
  const { apiBaseUrl } = loadSettings();

  const [files, setFiles] = useState<FileList | null>(null);
  const [sourcePrefix, setSourcePrefix] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function upload() {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const fd = new FormData();
      if (files) {
        Array.from(files).forEach((f) => fd.append('files', f));
      }
      fd.append('source_prefix', sourcePrefix);

      const res = await fetch(`${apiBaseUrl}/rag/ingest/files`, {
        method: 'POST',
        body: fd,
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
      setResult(text);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const clear = () => {
    setFiles(null);
    setSourcePrefix('upload');
    setResult('');
    setError('');
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">RAG Upload (PDF / Text)</h2>
        <p className="p">Upload PDFs or .txt/.md files and ingest into your vector DB.</p>

        <div className="grid two">
          <div>
            <label>Source prefix</label>
            <input value={sourcePrefix} onChange={(e) => setSourcePrefix(e.target.value)} />
          </div>
          <div>
            <label>Files</label>
            <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, gap: '0.5rem' }}>
          <button className="btn" onClick={upload} disabled={loading || !files || files.length === 0}>
            {loading ? 'Uploading...' : 'Upload & Ingest'}
          </button>
          <button className="btn" onClick={clear}>
            Clear
          </button>
          <span className="p" style={{ marginLeft: '1rem' }}>
            {files && files.length > 0 && `${files.length} file(s) selected`}
          </span>
        </div>

        {error && <pre className="code">{error}</pre>}
        {result && <pre className="code">{result}</pre>}
      </section>
    </div>
  );
}