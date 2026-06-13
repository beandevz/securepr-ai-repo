import React, { useMemo, useState } from 'react';
import { loadSettings, saveSettings } from '../lib/storage';
import { mockSettings } from '../utils/mockData';

export default function SettingsPage() {
  const initial = useMemo(() => loadSettings(), []);
  const [apiBaseUrl, setApiBaseUrl] = useState(initial.apiBaseUrl);
  const [ingestSecret, setIngestSecret] = useState(initial.ingestSecret);
  const [githubToken, setGithubToken] = useState(initial.githubToken);
  const [useMockApi, setUseMockApi] = useState(initial.useMockApi);
  const [saved, setSaved] = useState<string | null>(null);

  function onSave() {
    saveSettings({ apiBaseUrl, ingestSecret, githubToken, useMockApi });
    setSaved('Saved');
    setTimeout(() => setSaved(null), 1200);
  }

  const loadDefaults = () => {
    setApiBaseUrl(mockSettings.apiBaseUrl);
    setIngestSecret(mockSettings.webhookSecret);
    setGithubToken(mockSettings.githubToken);
    setUseMockApi(false);
    setSaved(null);
  };

  const clear = () => {
    setApiBaseUrl('');
    setIngestSecret('');
    setGithubToken('');
    setUseMockApi(false);
    setSaved(null);
  };

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">Settings</h2>
        <p className="p">These values are used by the Webhook Simulator.</p>

        <div className="grid two">
          <div>
            <label>API Base URL</label>
            <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="/api or http://localhost:8000" />
            <p className="p">Tip: use <code>/api</code> with Vite proxy to avoid CORS.</p>
          </div>
          <div>
            <label>Ingest Secret (SECUREPR_INGEST_SECRET)</label>
            <input value={ingestSecret} onChange={(e) => setIngestSecret(e.target.value)} placeholder="change_me" />
          </div>
          <div>
            <label>GitHub Token (for backend to post comments)</label>
            <input value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." />
            <p className="p">Stored locally in your browser.</p>
          </div>
          <div>
            <label>
              <input type="checkbox" checked={useMockApi} onChange={(e) => setUseMockApi(e.target.checked)} />
              {' '}Use Mock API (for frontend-only development)
            </label>
            <p className="p">When enabled, no real API calls are made.</p>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, gap: '0.5rem' }}>
          <button className="btn" onClick={onSave}>Save Settings</button>
          <button className="btn" onClick={loadDefaults}>Load Defaults</button>
          <button className="btn" onClick={clear}>Clear</button>
          {saved && <span className="pill ok">{saved}</span>}
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <h4>Current Settings</h4>
          <pre className="code">{JSON.stringify({ apiBaseUrl, ingestSecret, githubToken, useMockApi }, null, 2)}</pre>
        </div>
      </section>
    </div>
  );
}
