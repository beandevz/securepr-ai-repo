import React, { useState } from 'react';
import { mockPipelineFlow } from '../utils/mockData';

type StageStatus = 'completed' | 'in_progress' | 'pending' | 'failed';

type Stage = {
  stage: string;
  timestamp: string;
  status: StageStatus;
  data: Record<string, any>;
};

type PipelineData = {
  job_id: string;
  pr_number: number;
  repo: string;
  stages: Stage[];
  diff_preview: string;
  rag_context: any[];
  llm_findings: any[];
  final_comment: string;
};

const StageIcon = ({ status }: { status: StageStatus }) => {
  const icons = {
    completed: '✅',
    in_progress: '⏳',
    pending: '⏸️',
    failed: '❌'
  };
  return <span style={{ fontSize: '1.5rem' }}>{icons[status]}</span>;
};

const StageCard = ({ stage, index }: { stage: Stage; index: number }) => (
  <div className="card" style={{ marginBottom: '1rem' }}>
    <div className="row" style={{ alignItems: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6366f1' }}>
        {index + 1}
      </div>
      <StageIcon status={stage.status} />
      <div style={{ flex: 1 }}>
        <h3 className="h1" style={{ margin: 0 }}>{stage.stage}</h3>
        <small style={{ color: '#6b7280' }}>
          {new Date(stage.timestamp).toLocaleString()}
        </small>
      </div>
      <span className={`pill ${stage.status === 'completed' ? 'success' : ''}`}>
        {stage.status}
      </span>
    </div>

    {stage.data && Object.keys(stage.data).length > 0 && (
      <div style={{ marginTop: '1rem' }}>
        <pre className="code" style={{ margin: 0, fontSize: '0.875rem' }}>
          {JSON.stringify(stage.data, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

export default function PipelineViewerPage() {
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [activeTab, setActiveTab] = useState<'stages' | 'diff' | 'rag' | 'findings' | 'comment'>('stages');

  const loadSample = () => {
    setPipeline(mockPipelineFlow);
  };

  const clear = () => {
    setPipeline(null);
    setActiveTab('stages');
  };

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">🔄 Pipeline Viewer</h2>
        <p className="p">
          Visualize the complete security analysis pipeline: PR → Diff → RAG → LLM → Comment
        </p>

        <div className="row" style={{ gap: '0.5rem' }}>
          <button className="btn" onClick={loadSample}>
            Load Sample Pipeline
          </button>
          {pipeline && (
            <button className="btn" onClick={clear}>
              Clear
            </button>
          )}
        </div>
      </section>

      {pipeline && (
        <>
          <section className="card">
            <div className="row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <div className="pill">Job: {pipeline.job_id}</div>
              <div className="pill">PR #{pipeline.pr_number}</div>
              <div className="pill">Repo: {pipeline.repo}</div>
            </div>

            <div className="row" style={{ gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {(['stages', 'diff', 'rag', 'findings', 'comment'] as const).map(tab => (
                <button
                  key={tab}
                  className={`btn ${activeTab === tab ? '' : 'secondary'}`}
                  onClick={() => setActiveTab(tab)}
                  style={activeTab === tab ? { background: '#6366f1', color: 'white' } : {}}
                >
                  {tab === 'stages' && '📋 Pipeline Stages'}
                  {tab === 'diff' && '📄 Diff Preview'}
                  {tab === 'rag' && '🔍 RAG Context'}
                  {tab === 'findings' && '🐛 LLM Findings'}
                  {tab === 'comment' && '💬 Final Comment'}
                </button>
              ))}
            </div>
          </section>

          {activeTab === 'stages' && (
            <section>
              <h3 className="h1">Pipeline Execution Flow</h3>
              <div style={{ position: 'relative' }}>
                {pipeline.stages.map((stage, i) => (
                  <React.Fragment key={i}>
                    <StageCard stage={stage} index={i} />
                    {i < pipeline.stages.length - 1 && (
                      <div style={{
                        height: '2rem',
                        borderLeft: '3px dashed #d1d5db',
                        marginLeft: '2rem',
                        marginBottom: '0.5rem'
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="card">
                <h4>⏱️ Total Pipeline Duration</h4>
                <p className="p">
                  {Math.round(
                    (new Date(pipeline.stages[pipeline.stages.length - 1].timestamp).getTime() -
                    new Date(pipeline.stages[0].timestamp).getTime()) / 1000
                  )} seconds
                </p>
              </div>
            </section>
          )}

          {activeTab === 'diff' && (
            <section className="card">
              <h3 className="h1">📄 Diff Preview</h3>
              <p className="p">Code changes that were analyzed for security issues.</p>
              <pre className="code" style={{
                background: '#1f2937',
                color: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.375rem',
                overflow: 'auto'
              }}>
                {pipeline.diff_preview}
              </pre>
            </section>
          )}

          {activeTab === 'rag' && (
            <section>
              <h3 className="h1">🔍 RAG Context Retrieved</h3>
              <p className="p">
                Security knowledge retrieved from the RAG system to inform the LLM analysis.
              </p>
              {pipeline.rag_context.map((hit, i) => (
                <div key={i} className="card">
                  <div className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="pill">{hit.source}</span>
                    <span className="pill success">Score: {hit.score.toFixed(3)}</span>
                  </div>
                  <pre className="code" style={{ margin: 0 }}>{hit.text}</pre>
                </div>
              ))}
            </section>
          )}

          {activeTab === 'findings' && (
            <section>
              <h3 className="h1">🐛 LLM Security Findings</h3>
              <p className="p">
                Issues detected by the LLM after analyzing the diff with RAG context.
              </p>
              {pipeline.llm_findings.map((finding, i) => (
                <div key={i} className="card">
                  <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`pill ${
                      finding.severity === 'Critical' ? 'critical' :
                      finding.severity === 'High' ? 'high' :
                      finding.severity === 'Medium' ? 'medium' : 'low'
                    }`}>
                      {finding.severity}
                    </span>
                    <h4 style={{ margin: 0, flex: 1 }}>{finding.title}</h4>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="pill" style={{ marginBottom: '0.5rem' }}>
                      {finding.file_path}:{finding.line_start}-{finding.line_end}
                    </div>
                    <p className="p">{finding.description}</p>
                    <p className="p" style={{ fontWeight: 'bold', color: '#059669' }}>
                      ✅ {finding.recommendation}
                    </p>

                    {finding.code_snippet && (
                      <pre className="code" style={{ marginTop: '0.5rem' }}>
                        {finding.code_snippet}
                      </pre>
                    )}

                    <div className="row" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                      <span className="pill">{finding.owasp_category}</span>
                      <span className="pill">Confidence: {(finding.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeTab === 'comment' && (
            <section className="card">
              <h3 className="h1">💬 Final PR Comment</h3>
              <p className="p">
                The formatted comment that was posted to the GitHub pull request.
              </p>
              <pre className="code" style={{ whiteSpace: 'pre-wrap' }}>
                {pipeline.final_comment}
              </pre>
            </section>
          )}
        </>
      )}

      {!pipeline && (
        <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
          <h3 className="h1">No Pipeline Loaded</h3>
          <p className="p">Click "Load Sample Pipeline" to see a complete analysis flow</p>
        </section>
      )}
    </div>
  );
}
