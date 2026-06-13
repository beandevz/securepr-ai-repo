import React, { useMemo, useState } from 'react';
import { apiPostJson } from '../lib/api';
import { hmacSha256Hex } from '../lib/crypto';
import { loadSettings } from '../lib/storage';
import { mockWebhookPayload } from '../utils/mockData';

// Minimal PR event payload template.
const samplePayload = {
  action: 'opened',
  number: 1,
  pull_request: {
    number: 1,
    head: {
      sha: 'REPLACE_WITH_HEAD_SHA',
    },
  },
  repository: {
    full_name: 'OWNER/REPO',
  },
};

export default function WebhookSimulatorPage() {
  const defaults = useMemo(() => loadSettings(), []);
  const [apiBaseUrl, setApiBaseUrl] = useState(defaults.apiBaseUrl);
  const [ingestSecret, setIngestSecret] = useState(defaults.ingestSecret);
  const [githubToken, setGithubToken] = useState(defaults.githubToken);

  const [payload, setPayload] = useState(JSON.stringify(samplePayload, null, 2));
  const [signature, setSignature] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function computeSig() {
    setError('');
    try {
      const sigHex = await hmacSha256Hex(ingestSecret, payload);
      setSignature(`sha256=${sigHex}`);
    } catch (e: any) {
      setSignature('');
      setError(e?.message || String(e));
    }
  }

  async function send() {
    setSending(true);
    setError('');
    setResponse('');
    try {
      const sig = signature || (await (async () => {
        const sigHex = await hmacSha256Hex(ingestSecret, payload);
        return `sha256=${sigHex}`;
      })());

      const parsed = JSON.parse(payload);
      const res = await apiPostJson<any>(
        apiBaseUrl,
        '/ingest/github-actions',
        parsed,
        {
          'X-SecurePR-Signature': sig,
          'X-SecurePR-Github-Token': githubToken,
        }
      );
      setResponse(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  }

  const loadMock = () => {
    setPayload(JSON.stringify(mockWebhookPayload, null, 2));
    setSignature('');
    setError('');
    setResponse('');
  };

  const clear = () => {
    setPayload(JSON.stringify(samplePayload, null, 2));
    setSignature('');
    setError('');
    setResponse('');
  };

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">Webhook Simulator</h2>
        <p className="p">
          Sends a GitHub pull_request event payload to <code>/ingest/github-actions</code>.
          It also computes <code>X-SecurePR-Signature</code> (HMAC SHA-256) in your browser.
        </p>

        <div className="grid two">
          <div>
            <label>API Base URL</label>
            <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} />
          </div>
          <div>
            <label>Ingest Secret</label>
            <input value={ingestSecret} onChange={(e) => setIngestSecret(e.target.value)} />
          </div>
          <div>
            <label>GitHub Token</label>
            <input value={githubToken} onChange={(e) => setGithubToken(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Payload JSON</label>
          <textarea value={payload} onChange={(e) => setPayload(e.target.value)} />
        </div>

        <div className="grid two" style={{ marginTop: 12 }}>
          <div>
            <label>Computed Signature</label>
            <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="sha256=..." />
            <div className="row" style={{ marginTop: 10, gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn" onClick={computeSig} disabled={sending}>
                Compute Signature
              </button>
              <button className="btn" onClick={send} disabled={sending}>
                {sending ? 'Sending...' : 'Send Webhook'}
              </button>
              <button className="btn" onClick={loadMock}>
                Load Sample Data
              </button>
              <button className="btn" onClick={clear}>
                Clear
              </button>
            </div>
          </div>
          <div>
            <label>Result</label>
            {error && <pre className="code" style={{ borderColor: 'rgba(255,107,107,0.45)' }}>{error}</pre>}
            {response && <pre className="code">{response}</pre>}
            {!error && !response && <pre className="code">No response yet.</pre>}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h1">Notes</h2>
        <p className="p">
          If you use Vite proxy mode, set <code>VITE_API_BASE_URL=/api</code> in <code>.env</code> and the dev server will proxy to your backend.
        </p>
        <pre className="code">{JSON.stringify(samplePayload, null, 2)}</pre>
      </section>
    </div>
  );
}
