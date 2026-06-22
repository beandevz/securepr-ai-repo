import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadSettings } from '../lib/storage';
import SplitDiffViewer from '../components/SplitDiffViewer';
import { Result } from '../types/result';
import { severityClass } from '../utils/severity';
import { useFindingNavigation } from '../hooks/useFindingNavigation';
import { mockResultFindings, mockPipelineFlow } from '../utils/mockData';

const MOCK_RESULT: Result = {
  overall: 'Critical',
  should_fail: true,
  count: mockResultFindings.length,
  findings: mockResultFindings.map(f => ({
    severity: f.severity,
    category: f.title,
    file: f.file_path,
    line_start: f.line_start,
    line_end: f.line_end,
    risk: f.description,
    recommendation: f.recommendation,
    owasp: f.owasp_category,
    confidence: f.confidence
  }))
};

export default function ResultViewerPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [patch, setPatch] = useState('');
  const { jobId } = useParams();
  const { apiBaseUrl, useMockApi } = loadSettings();

  const totalFindings = result?.findings?.length || 0;
  const { activeIndex: activeFindingIndex, goToNext, goToPrevious, goToIndex } = useFindingNavigation(totalFindings);

  function parseJson() {
    try {
      const parsed = JSON.parse(input);
      setResult(parsed);
      setError('');
    } catch (e: any) {
      setError('Invalid JSON');
      setResult(null);
    }
  }

  const loadMock = () => {
    setResult(MOCK_RESULT);
    setPatch(mockPipelineFlow.diff_preview);
    setInput(JSON.stringify(MOCK_RESULT, null, 2));
    setError('');
  };

  const clear = () => {
    setResult(null);
    setPatch('');
    setInput('');
    setError('');
  };

  useEffect(() => {
    if (!jobId) return;

    // If mock mode enabled, use mock data
    if (useMockApi) {
      setResult(MOCK_RESULT);
      setPatch('');
      return;
    }

    fetch(`${apiBaseUrl}/jobs/${jobId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setResult(data.result);
        setPatch(data.patch);
      })
      .catch((e) => {
        setError(`Failed to load job: ${e?.message || e}`);
      });
  }, [jobId, useMockApi]);

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">Result Viewer</h2>
        <p className="p">
          Paste SecurePR output JSON to visualize findings.
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste result JSON here...'
        />

        <div className="row" style={{ marginTop: 10, gap: '0.5rem' }}>
          <button className="btn" onClick={parseJson} disabled={!input.trim()}>
            Parse Result
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

      {result && (
        <>
          {/* SUMMARY */}
          <section className="card">
            <h3 className="h1">Summary</h3>

            <div className="grid">
              <div>
                Overall:
                <span className={`pill ${severityClass(result.overall)}`}>
                  {result.overall}
                </span>
              </div>

              <div>Findings: {result.count}</div>

              <div>
                Gate:
                <span className={`pill ${result.should_fail ? 'bad' : 'ok'}`}>
                  {result.should_fail ? 'FAIL' : 'PASS'}
                </span>
              </div>
            </div>
          </section>

          {result?.findings && result.findings.length > 0 && (
            <section className="card">
              <h3 className="h1">Finding Navigation</h3>

              <div className="row">
                <button className="btn" onClick={goToPrevious}>
                  Previous Finding
                </button>

                <button className="btn" onClick={goToNext}>
                  Next Finding
                </button>

                <span className="pill">
                  {activeFindingIndex + 1} / {result.findings.length}
                </span>
              </div>
            </section>
          )}

          {/* DIFF VIEWER */}
          {patch && result && (
            <section className="card">
              <h3 className="h1">Diff (Split View)</h3>
              <SplitDiffViewer patch={patch} findings={result.findings || []} activeFindingIndex={activeFindingIndex} />
            </section>
          )}


          {/* FINDINGS */}
          <section className="card">
            <h3 className="h1">Findings</h3>

            <div className="grid">
              {result.findings?.map((f, idx) => (
                <div
                  key={idx}
                  className="card clickable"
                  onClick={() => goToIndex(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="row">
                    <span className={`pill ${severityClass(f.severity)}`}>
                      {f.severity}
                    </span>

                    {f.owasp_top10_2025 && (
                      <span className="pill">{f.owasp_top10_2025}</span>
                    )}
                  </div>

                  <h4>{f.title}</h4>

                  <p className="p"><b>Risk:</b> {f.risk}</p>

                  <p className="p"><b>Recommendation:</b> {f.recommendation}</p>

                  {f.file_path && (
                    <p className="p">File: {f.file_path}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* RAW JSON */}
          <section className="card">
            <h3 className="h1">Raw JSON</h3>
            <pre className="code">{JSON.stringify(result, null, 2)}</pre>
          </section>
        </>
      )}
    </div>
  );
}