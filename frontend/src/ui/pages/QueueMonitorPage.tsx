import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSettings } from '../lib/storage';
import { Job } from '../types/job';

export default function QueueMonitorPage() {
  const navigate = useNavigate();
  const { apiBaseUrl } = loadSettings();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/jobs`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setJobs(data || []);
      setError('');
    } catch (e: any) {
      console.error(e);
      setError(`Failed to load jobs: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 60000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  function statusClass(s: string) {
    if (s === 'done') return 'ok';
    if (s === 'failed') return 'bad';
    if (s === 'running') return 'warn';
    return '';
  }

  function openJob(jobId: string) {
    navigate(`/results/${jobId}`);
  }

  const clear = () => {
    setJobs([]);
    setError('');
  };

  return (
    <div className="grid queue">
      <section className="card">
        <h2 className="h1">Queue Monitor</h2>
        <p className="p">
          View all PR analysis jobs and click to inspect results.
        </p>

        <div className="row" style={{ gap: '0.5rem' }}>
          <button className="btn" onClick={fetchJobs} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button className="btn" onClick={clear}>
            Clear
          </button>
        </div>

        {loading && <p className="p">Loading...</p>}
        {error && <p className="p">{error}</p>}

        <div className="grid">
          {jobs.length === 0 && !loading && !error && (
            <p className="p">No jobs in queue.</p>
          )}
          {jobs.map((job) => (
            <div
              key={job.id}
              className="card"
              onClick={() => openJob(job.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Header */}
              <div className="row">
                <strong>ID:</strong> {job.id}

                <span className={`pill ${statusClass(job.status)}`}>
                  {job.status}
                </span>
              </div>

              {/* Result summary */}
              {job.result && (
                <div className="grid" style={{ marginTop: 10 }}>
                  <div>
                    Overall:
                    <span className={`pill ${statusClass(job.result.overall)}`}>
                      {job.result.overall}
                    </span>
                  </div>

                  <div>Findings: {job.result.count}</div>

                  <div>
                    Gate:
                    <span
                      className={`pill ${
                        job.result.should_fail ? 'bad' : 'ok'
                      }`}
                    >
                      {job.result.should_fail ? 'FAIL' : 'PASS'}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              {job.created_at && (
                <div className="p" style={{ marginTop: 10 }}>
                  Created: {new Date(job.created_at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}