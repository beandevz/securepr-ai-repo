import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { loadSettings } from '../lib/storage';
import { mockHealthResponse } from '../utils/mockData';

type Health = { status: string; [key: string]: any };

export default function HealthPage() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { apiBaseUrl } = loadSettings();

  async function ping() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Health>(apiBaseUrl, '/health');
      setHealth(data);
    } catch (e: any) {
      setHealth(null);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const loadMock = () => {
    setHealth(mockHealthResponse as Health);
    setError(null);
  };

  const clear = () => {
    setHealth(null);
    setError(null);
  };

  useEffect(() => {
    void ping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = health?.status === 'ok';

  return (
    <div className="grid two">
      <section className="card">
        <h2 className="h1">Backend Health</h2>
        <p className="p">Checks the FastAPI endpoint <code>/health</code>.</p>
        <div className="row" style={{ gap: '0.5rem' }}>
          <button className="btn" onClick={ping} disabled={loading}>
            {loading ? 'Checking...' : 'Check Health'}
          </button>
          <button className="btn" onClick={loadMock}>
            Load Sample Data
          </button>
          {health && (
            <button className="btn" onClick={clear}>
              Clear
            </button>
          )}
        </div>
        <div className="row" style={{ marginTop: '1rem' }}>
          {health && <span className={`pill ${ok ? 'ok' : 'warn'}`}>status: {health.status}</span>}
          {error && <span className="pill bad">error</span>}
        </div>
        {error && <pre className="code">{error}</pre>}
        {health && <pre className="code">{JSON.stringify(health, null, 2)}</pre>}
      </section>

      <section className="card">
        <h2 className="h1">Current Settings</h2>
        <p className="p">The UI reads settings from localStorage. Update them in the Settings tab.</p>
        <pre className="code">{JSON.stringify(loadSettings(), null, 2)}</pre>
      </section>
    </div>
  );
}
