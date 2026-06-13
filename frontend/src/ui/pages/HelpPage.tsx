import React from 'react';

const PageHelp = ({ title, description, features, usageSteps }: {
  title: string;
  description: string;
  features: string[];
  usageSteps: string[];
}) => (
  <div className="card" style={{ marginBottom: '1rem' }}>
    <h3 className="h1">{title}</h3>
    <p className="p">{description}</p>

    {features.length > 0 && (
      <>
        <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Features:</h4>
        <ul style={{ marginLeft: '1.5rem' }}>
          {features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </>
    )}

    {usageSteps.length > 0 && (
      <>
        <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>How to Use:</h4>
        <ol style={{ marginLeft: '1.5rem' }}>
          {usageSteps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </>
    )}
  </div>
);

export default function HelpPage() {
  return (
    <div className="grid">
      <section className="card">
        <h2 className="h1">🔒 SecurePR AI - User Guide</h2>
        <p className="p">
          Welcome to SecurePR AI! This tool automatically reviews pull requests for security vulnerabilities,
          insecure coding patterns, and misconfigurations before code is merged.
        </p>
        <div className="pill" style={{ marginTop: '1rem' }}>
          Pipeline: PR Webhook → Diff Extraction → RAG Retrieval → LLM Analysis → PR Comment
        </div>
      </section>

      <PageHelp
        title="🏥 Health Check"
        description="Monitor the health status of all SecurePR services and dependencies."
        features={[
          "Real-time service status",
          "API connectivity check",
          "Database connection status",
          "LLM provider availability",
          "RAG system health"
        ]}
        usageSteps={[
          "Navigate to the Health page",
          "Click 'Check Health' to run diagnostics",
          "Review service status indicators",
          "Use 'Load Sample Data' to see mock health status"
        ]}
      />

      <PageHelp
        title="🔗 Webhook Simulator"
        description="Test GitHub webhook payloads without needing a real pull request."
        features={[
          "Simulate PR opened/updated events",
          "Custom payload editing",
          "Real-time response preview",
          "Load sample PR payload"
        ]}
        usageSteps={[
          "Click 'Load Sample Data' for a pre-filled payload",
          "Edit the JSON payload to match your test scenario",
          "Click 'Send Webhook' to simulate the event",
          "Review the API response in the output section",
          "Use 'Clear' to reset the form"
        ]}
      />

      <PageHelp
        title="📊 Queue Monitor"
        description="Track and manage security analysis jobs in the processing queue."
        features={[
          "View all analysis jobs (pending, in-progress, completed)",
          "Filter by status and severity",
          "Real-time job progress tracking",
          "Navigate to detailed results"
        ]}
        usageSteps={[
          "Click 'Refresh' to load current jobs",
          "Use 'Load Sample Data' to populate mock jobs",
          "Click on a job ID to view detailed analysis results",
          "Monitor job status and severity indicators",
          "Use 'Clear' to reset the view"
        ]}
      />

      <PageHelp
        title="🔍 Result Viewer"
        description="View detailed security findings from completed PR analyses."
        features={[
          "Comprehensive security findings list",
          "Severity-based highlighting (Critical, High, Medium, Low)",
          "OWASP category mapping",
          "Code snippets and recommendations",
          "Finding navigation (next/previous)",
          "Split diff view with inline annotations"
        ]}
        usageSteps={[
          "Enter a Job ID or click 'Load Sample Data'",
          "Review findings sorted by severity",
          "Click on findings to view details",
          "Use navigation arrows to move between findings",
          "Review code snippets and remediation recommendations",
          "Check OWASP mappings for security context"
        ]}
      />

      <PageHelp
        title="✅ Check Runs"
        description="View GitHub Check Runs and commit status updates created by SecurePR."
        features={[
          "List all check runs for a repository",
          "View check run conclusions (success, action_required, failure)",
          "Annotation counts and summaries",
          "Integration with GitHub PR interface"
        ]}
        usageSteps={[
          "Enter repository owner and name",
          "Click 'Fetch Check Runs' or 'Load Sample Data'",
          "Review check run statuses and conclusions",
          "View annotation counts for each run",
          "Use 'Clear' to reset the form"
        ]}
      />

      <PageHelp
        title="📚 RAG Knowledge Base"
        description="Ingest security guidelines, OWASP documentation, and coding standards into the RAG system."
        features={[
          "Text ingestion from OWASP docs, security guidelines",
          "Automatic chunking and embedding",
          "File upload support (PDF, TXT)",
          "Source tracking for all documents"
        ]}
        usageSteps={[
          "Click 'Load Sample Data' to populate example guidelines",
          "Paste your security documentation or coding standards",
          "Click 'Ingest' to process and store the content",
          "Review ingestion confirmation and chunk count",
          "Use 'Clear' to reset the input area"
        ]}
      />

      <PageHelp
        title="🔎 RAG Search"
        description="Search the ingested knowledge base using semantic similarity."
        features={[
          "Semantic search across all ingested documents",
          "Configurable Top-K results",
          "Relevance scoring",
          "Source attribution for each result"
        ]}
        usageSteps={[
          "Enter a search query (e.g., 'parameterized queries')",
          "Set the number of results you want (Top K)",
          "Click 'Search' or use 'Load Sample Data' for a demo",
          "Review results sorted by relevance score",
          "Click on sources to see full context",
          "Use 'Clear' to start a new search"
        ]}
      />

      <PageHelp
        title="📤 RAG Upload"
        description="Upload security documentation files (PDF, TXT, Markdown) to the knowledge base."
        features={[
          "Multi-file upload support",
          "PDF text extraction",
          "Custom source prefix naming",
          "Batch processing"
        ]}
        usageSteps={[
          "Click 'Choose Files' to select documents",
          "Add a source prefix for organization (e.g., 'owasp', 'company-policy')",
          "Click 'Upload and Ingest'",
          "Review processing status and chunk counts",
          "Use 'Clear' to reset the upload form"
        ]}
      />

      <PageHelp
        title="🔄 Pipeline Viewer"
        description="Visualize the complete security analysis pipeline from PR webhook to final comment."
        features={[
          "Step-by-step pipeline visualization",
          "Timing and performance metrics",
          "Diff preview with findings",
          "RAG context used in analysis",
          "LLM reasoning and final output",
          "Real-time stage progress"
        ]}
        usageSteps={[
          "Click 'Load Sample Pipeline' to see a complete flow",
          "Navigate through each stage (Webhook → Diff → RAG → LLM → Comment)",
          "Review timing and data at each stage",
          "View diff changes that triggered findings",
          "See RAG context retrieved for analysis",
          "Read the final PR comment generated"
        ]}
      />

      <PageHelp
        title="⚙️ Settings"
        description="Configure SecurePR connection settings and preferences."
        features={[
          "API base URL configuration",
          "GitHub token management",
          "Webhook secret setup",
          "Analysis preferences (severity thresholds, auto-publish)"
        ]}
        usageSteps={[
          "Enter your API base URL (default: http://localhost:8000/api)",
          "Add your GitHub personal access token",
          "Set webhook secret for payload validation",
          "Configure analysis preferences",
          "Click 'Save Settings'",
          "Use 'Load Defaults' to restore default values"
        ]}
      />

      <section className="card">
        <h3 className="h1">🚀 Quick Start</h3>
        <ol style={{ marginLeft: '1.5rem' }}>
          <li><strong>Check Health:</strong> Ensure all services are running</li>
          <li><strong>Configure Settings:</strong> Set up API URL and tokens</li>
          <li><strong>Ingest Knowledge:</strong> Upload security guidelines to RAG KB</li>
          <li><strong>Test Webhook:</strong> Use the simulator to test a PR event</li>
          <li><strong>Monitor Queue:</strong> Track analysis jobs</li>
          <li><strong>View Results:</strong> Review security findings</li>
        </ol>
      </section>

      <section className="card">
        <h3 className="h1">📖 Key Concepts</h3>
        <div className="grid">
          <div className="card">
            <h4>Severity Levels</h4>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li><strong style={{ color: '#dc2626' }}>Critical:</strong> Immediate security risk (e.g., SQL Injection)</li>
              <li><strong style={{ color: '#ea580c' }}>High:</strong> Serious vulnerability (e.g., hardcoded secrets)</li>
              <li><strong style={{ color: '#ca8a04' }}>Medium:</strong> Moderate risk (e.g., XSS)</li>
              <li><strong style={{ color: '#65a30d' }}>Low:</strong> Minor issue or best practice</li>
            </ul>
          </div>

          <div className="card">
            <h4>OWASP Categories</h4>
            <p className="p">
              All findings are mapped to OWASP Top 10 categories for standardized classification:
              A01 (Access Control), A02 (Cryptographic Failures), A03 (Injection), etc.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="h1">💡 Tips</h3>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li>Use "Load Sample Data" buttons to explore features without backend setup</li>
          <li>Clear buttons reset forms to start fresh</li>
          <li>All pages update in real-time when connected to the API</li>
          <li>RAG KB improves analysis accuracy - keep it updated with your security policies</li>
          <li>Check Runs integrate with GitHub PR interface for inline feedback</li>
        </ul>
      </section>
    </div>
  );
}
