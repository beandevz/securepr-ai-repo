import React, { useEffect, useState } from 'react';
import { loadSettings } from '../lib/storage';
import { mockCheckRuns } from '../utils/mockData';

type CheckRun = {
  name: string;
  status: string;
  conclusion: string;
  [key: string]: any;
};

export default function CheckRunViewerPage() {
  const { apiBaseUrl, githubToken } = loadSettings();

  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [sha, setSha] = useState('');

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  async function fetchStatus() {
    try {
      const res = await fetch(
        `${apiBaseUrl}/github/status/${owner}/${repo}/${sha}?token=${githubToken}`
      );
      const json = await res.json();
      setData(json);
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  const loadMock = () => {
    setOwner('acme-corp');
    setRepo('secure-app');
    setSha('abc123def456');
    setData({
      state: 'action_required',
      check_runs: mockCheckRuns
    });
    setError('');
  };

  const clear = () => {
    setOwner('');
    setRepo('');
    setSha('');
    setData(null);
    setError('');
  };

  useEffect(() => {
    if (!owner || !repo || !sha) return;

    fetchStatus();

    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [owner, repo, sha]);

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">GitHub Check Status Viewer</h2>

        <div className="grid two">
          <input placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <input placeholder="repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
          <input placeholder="commit sha" value={sha} onChange={(e) => setSha(e.target.value)} />
        </div>

        <div className="row" style={{ gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn" onClick={fetchStatus} disabled={!owner || !repo || !sha}>
            Fetch Check Runs
          </button>
          <button className="btn" onClick={loadMock}>
            Load Sample Data
          </button>
          <button className="btn" onClick={clear}>
            Clear
          </button>
        </div>

        {error && <p className="p">{error}</p>}
      </section>

      {data && (
        <>
          {/* Overall */}
          <section className="card">
            <h3 className="h1">Overall State</h3>
            <span className="pill">{data.state}</span>
          </section>

          {/* Check runs */}
          <section className="card">
            <h3 className="h1">Check Runs</h3>

            <div className="grid">
              {data.check_runs?.map((c: CheckRun, idx: number) => (
                <div key={idx} className="card">
                  <b>{c.name}</b>

                  <div className="row">
                    <span className="pill">{c.status}</span>
                    <span className="pill">{c.conclusion}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}