# CLAUDE.md — SecurePR AI (Claude Code Agent Instructions)
# Goal: token-optimized deep reasoning for security analysis, architecture, and refactoring.

## 0) One-screen project snapshot (read first)
**Project**: SecurePR AI — "Shift Left Security. Detect Early. Ship Secure."  
SecurePR AI is an AI-powered pull request security review system designed to detect vulnerabilities, insecure coding patterns, and misconfigurations before code is merged.

**Core pipeline (diff-first)**: PR Trigger → Diff Parser → Chunking → RAG Retrieval → LLM Analysis → PR Comment.  
**Architecture**: GitHub Webhook → API → Queue → Orchestrator → Analysis → LLM → PR Comment.  
**Key components**: Webhook Handler, Orchestrator, Diff Processor, Rule Engine, RAG Service, LLM Service, Comment Publisher.

**Security constraints (non-negotiable)**:
- Validate webhook signature
- Protect code data (minimize LLM exposure)
- Apply OWASP mapping
- Maintain audit logging
- Do not leak code through AI processing

**Primary detection targets**: SQLi, SSRF, XSS, IDOR, hardcoded secrets, broken authn/authz; severity Low/Medium/High/Critical.

---

## 1) How you should work (token-optimized but deep)
### 1.1 Token discipline rules
- NEVER paste large files back. Use: file path + function name + small diffs.
- When asked to "analyze code", request/assume only the relevant snippet (≤120 lines).
- Prefer structured bullet summaries over long prose.
- Use "Context Anchors" (below) rather than re-explaining everything.

### 1.2 Context anchors (always keep consistent)
When responding, refer to these stable anchors:
- Pipeline: diff → chunk → RAG → LLM → findings → PR review/comment
- Architecture: webhook → queue → orchestrator → analysis → PR comment
- Requirements: detect vulns + severity + OWASP mapping + no exploit instructions + audit logging

### 1.3 Safety: no exploit instructions
- Explain risk, impact, and safe remediation.
- Do NOT provide step-by-step exploitation.

---

## 2) Persistent "Memory" protocol (for continuity)
You MUST maintain a living file: `docs/PROJECT_MEMORY.md`.

At the end of any meaningful session, append a short update:
- Current State (what works / what's broken)
- Decisions (why)
- Next Actions (top 3–7)
- Risks / Open questions

Keep each update ≤ 25 lines.

---

## 3) What SecurePR AI currently includes (keep updated)
### 3.1 Backend Architecture (Node.js/Express + TypeScript, SOLID + GoF patterns)

**Core** (`src/core/`):
- `settings.ts` - Settings interface + singleton getSettings() with dotenv
- `security.ts` - HMAC-SHA256 compute + timing-safe verify (Node.js crypto)

**Domain & Errors** (`src/domain/`, `src/exceptions.ts`):
- `models.ts` - Finding, Severity, Confidence, OwaspCategory, Evidence, Location types
- `exceptions.ts` - SecurePRError hierarchy → ConfigurationError, LlmProviderError, VCSIntegrationError, QueueError, RagError, PipelineError, ValidationError, WebhookError

**Integration Layer** (`src/integrations/` - resource management + retry):
- `http-client.ts` - HttpClient (axios, connection pooling, exponential backoff)
- `github/host.ts` - host allow-list (`GITHUB_ALLOWED_HOSTS`), `parseRepoUrl`, `apiBaseUrlForHost` (github.com → api.github.com; GHES → `https://<host>/api/v3`), `hostFromWebhookPayload`
- `github/client.ts` - GitHubClient (singleton per apiBaseUrl+token, uses HttpClient)
- `github/review-publisher.ts` - ReviewPublisher (PR reviews, comments)
- `github/checks-publisher.ts` - ChecksPublisher (check runs, commit statuses)
- `github/status-client.ts` - getCommitStatus, getCheckRuns
- `github/repo-client.ts` - RepoWebhookClient (getRepo, createWebhook, deleteWebhook)
- `ai/openai-client.ts` - chatCompletion, chatCompletionJson, embedTexts, isEmbeddingConfigured
  (OpenAI-compatible; `OPENAI_BASE_URL` retargets it. Local SHA-256 embedding fallback
  is non-semantic and gated behind `RAG_ALLOW_LOCAL_EMBEDDINGS`.)

**Analyzer Layer** (`src/services/analyzers/` - Strategy Pattern):
- `base.ts` - SecurityAnalyzer interface
- `rule-analyzer.ts` - RuleBasedAnalyzer (regex patterns for secrets, etc.)
- `llm-analyzer.ts` - LlmAnalyzer (contextual reasoning via LLM provider)
- `factory.ts` - createAnalyzers(ragContext) → SecurityAnalyzer[]

**Pipeline Layer** (`src/services/pipeline/` - Chain of Responsibility):
- `base.ts` - PipelineContext + PipelineStage interface
- `stages/fetch-diff.ts` - FetchDiffStage (fetch PR files via GitHub API)
- `stages/analyze.ts` - AnalyzeStage (run all active analyzers)
- `stages/aggregate.ts` - AggregateStage (calculate overall severity + gate decision)
- `stages/publish.ts` - PublishStage (publish review + update check run/status)
- `orchestrator.ts` - PipelineOrchestrator (chains stages, handles errors)
- `pipeline-v2.ts` - processJob(job) entry point (uses orchestrator)

**Service Layer**:
- `ingest-service.ts` - IngestService: validateGithubPayload, createCheckRunIfEnabled, createJob, enqueueJob
- `rag-service.ts` - RAG retrieval wrapper (RagContext, RagStatus, getRagHealth)
- `rag-query.ts` - buildRagQueries: retrieval queries from a diff's added lines
- `repo-service.ts` - connectRepo, listRepos, configureWebhook, disconnectRepo (Connect Repository feature)
- `diff-fetcher.ts` - DiffFetcher: fetchFiles with GitHub pagination
- `prompts.ts` - SYSTEM_PROMPT, CHUNK_PROMPT_TEMPLATE (explicit finding JSON schema), formatChunkPrompt

**Queue Management** (`src/queue/`):
- `models.ts` - Job interface
- `job-store.ts` - Persistent sql.js JobStore at `JOBS_DB_PATH` (create, setStatus, setResult,
  setError, list, get, deleteAll, markPrClosed); `pr_state` column hides closed PRs
- `manager.ts` - InProcQueue (setInterval-based poll), ServiceBusQueue (placeholder)
- `instance.ts` - Queue singleton factory (getQueueInstance)

**RAG** (`src/rag/`):
- `store.ts` - sql.js-backed (SQLite via WASM) vector store with cosine similarity
- `chunker.ts` - text chunking (RAG_CHUNK_SIZE_CHARS / RAG_CHUNK_OVERLAP_CHARS)
- `rag-llm.ts` - askWithRag: retrieval-augmented Q&A behind POST /rag/ask

**Connected Repos** (`src/repos/`):
- `store.ts` - sql.js-backed store for connected repos (encrypted GitHub token, webhook_id, status)

**Utilities** (`src/utils/`):
- `severity.ts` - getMaxSeverity, shouldFailGate
- `formatters.ts` - formatInlineComment, formatSummary

**API Routes** (`src/api/routes/`):
- `ingest.ts` - POST /ingest/github-actions (accepts native GitHub `X-Hub-Signature-256` or custom `X-SecurePR-Signature`; resolves the sending host from the payload and the per-repo token from `repos/store.ts`)
- `health.ts` - GET /health
- `jobs.ts` - GET /jobs (open PRs only; `?include_closed=true` for all), GET /jobs/:jobId, DELETE /jobs/:jobId, DELETE /jobs (bulk; requires `?confirm=true`, optional `?status=`/`?pr_state=`)
- `rag.ts` - POST /rag/ingest/text, /rag/ingest/files (PDF upload), /rag/search, /rag/ask;
  GET /rag/sources, /rag/stats; DELETE /rag/sources/:source
- `github-status.ts` - GET /github/status/:owner/:repo/:sha
- `repos.ts` - POST /repos (connect + auto-create webhook), GET /repos, POST /repos/:id/webhook, DELETE /repos/:id

**Entry Point**: `src/main.ts` - Express app with CORS, raw body capture for HMAC, queue startup, graceful shutdown

### 3.2 Frontend Architecture (React + TypeScript, modular)

**Types** (`ui/types/`): `job.ts` (Job, JobStatus, JobResult, PrState) — each page otherwise
defines its own local view-model interfaces rather than sharing a central types barrel.

**API helpers** (`ui/lib/`):
- `api.ts` - `apiGet`/`apiPostJson` fetch helpers
- `storage.ts` - localStorage-backed app settings (apiBaseUrl, tokens)

**Utilities** (`ui/utils/` - extracted business logic):
- `export.ts` - exportAsJSON/CSV/Markdown/HTML for scan results

**Components** (`ui/components/`):
- `ErrorBoundary.tsx` + `ErrorFallback.tsx` - Error boundary pattern

**Pages** (`ui/pages/`, routed in `App.tsx`):
- `DashboardPage.tsx` - Stats + recent scans overview
- `ConnectRepoPage.tsx` - Connect a GitHub repo (real backend-backed, see `/repos` routes)
- `QueueMonitorPage.tsx` - Queue/job monitor
- `ResultViewerPageEnhanced.tsx` - Per-job finding detail viewer
- `GitHubPRViewPage.tsx` - PR-diff-style finding viewer
- `RagManagerPage.tsx` - RAG ingest + search tools

### 3.3 Tech stack
- Backend: Express.js + TypeScript (Node.js 20+)
- AI: OpenAI-compatible client (`integrations/ai/openai-client.ts`); local hash-based embedding fallback for dev
- DB: SQLite via `sql.js` (WASM) for both the RAG vector store and connected-repo store
- Frontend: React 18 + TypeScript + Vite
- Queue: In-process (setInterval poll) or Azure Service Bus (placeholder)
- VCS: GitHub integration (webhook create/delete, PR reviews, check runs) on github.com **and** GitHub Enterprise Server hosts (allow-listed via `GITHUB_ALLOWED_HOSTS`)

---

## 4) Skills Claude must provide (what you can ask it to do)
### Skill A — Security analysis (diff-based)
Input: PR diff chunks + metadata + RAG snippets  
Output: findings[] + summary with:
- severity, OWASP mapping, confidence
- file_path + line range
- risk + recommendation + safe fix example

### Skill B — System design / architecture
Always deliver:
- Mermaid architecture diagram
- Pipeline flow diagram
- API endpoints list
- Module responsibilities map
- Security checklist (OWASP-based)

### Skill C — Refactor & maintainability
- DRY + Rule of 3 (extract repeated logic after 3 occurrences)
- Reduce technical debt via small safe refactors
- Prefer dependency injection & interfaces at boundaries

### Skill D — GoF patterns (use when justified)
- Strategy: analyzers (rules vs LLM vs RAG), provider selection
- Adapter: GitHub/GitLab/Azure DevOps integration wrappers
- Factory: instantiate provider clients (LLM, embeddings, vector store, queue)
- Chain / Pipeline: processing stages (parse→chunk→analyze→aggregate→publish)
- Observer/Event bus: for run status updates (queue monitor)
- Decorator: enrich findings (add OWASP, add references, add gating)

### Skill E — Frontend guidance (portable React)
- Keep UI thin: typed DTOs + API client layer
- Avoid business logic in components; isolate to services/hooks
- Provide operator-friendly UX: statuses, retries, raw JSON view, copy buttons

### Skill F — Backend guidance (Node.js/TypeScript)
- Keep domain models framework-agnostic
- Put IO at edges (VCS API, queue, LLM); keep core pure functions
- Define ports/adapters so migration to other stacks is straightforward

---

## 5) Standard response formats (use to optimize tokens)
### 5.1 "Implement feature" response
1) Short plan (≤8 bullets)
2) Files to change (list)
3) Minimal patch snippets only
4) Tests / verification steps
5) Update to `docs/PROJECT_MEMORY.md`

### 5.2 "Overview/presentation" response
1) Executive summary (≤10 lines)
2) Architecture + flow
3) Feature list (BE + FE)
4) Risks + roadmap

---

## 6) Implementation patterns (code generation guidance)

### 6.1 Adding a new analyzer
```typescript
// 1. Create analyzer in src/services/analyzers/
class MyAnalyzer implements SecurityAnalyzer {
  async analyze(filePath: string, content: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    // detection logic
    return findings;
  }
  getName(): string {
    return 'MyAnalyzer';
  }
}

// 2. Register in factory.ts
export function createAnalyzers(ragContext: string = ''): SecurityAnalyzer[] {
  const analyzers: SecurityAnalyzer[] = [new RuleBasedAnalyzer()];
  if (settings.myAnalyzerEnabled) {
    analyzers.push(new MyAnalyzer());
  }
  return analyzers;
}
```

### 6.2 Adding a new pipeline stage
```typescript
// 1. Create stage in src/services/pipeline/stages/
class MyStage implements PipelineStage {
  async execute(context: PipelineContext): Promise<PipelineContext> {
    // stage logic
    return context;
  }
  getName(): string {
    return 'MyStage';
  }
}

// 2. Register in orchestrator.ts constructor
this.stages = [new FetchDiffStage(), new MyStage(), new AnalyzeStage(), ...];
```

### 6.3 Adding a new VCS provider (GitLab, Azure DevOps)
```typescript
// 1. Create adapter in src/integrations/gitlab/
class GitLabAdapter implements VcsProvider {
  async fetchPrDiff(owner: string, repo: string, mrId: number) {
    // GitLab MR API call
  }
  async createReview(...) {
    // GitLab MR comment API
  }
  // ... implement VcsProvider interface
}
```

### 6.4 Adding a new frontend page
```typescript
// 1. Create page in ui/pages/MyPage.tsx
import { ApiClient } from '@/lib/ApiClient';
import { useApi } from '@/hooks/useApi';

export function MyPage() {
  const { data, loading, error } = useApi(() => new ApiClient('/api').getMyData());
  if (loading) return <div>Loading...</div>;
  if (error) return <ErrorFallback error={error} />;
  return <div>{/* render */}</div>;
}

// 2. Register route in App.tsx
<Route path="/my-page" element={<MyPage />} />
```

### 6.5 Token optimization strategies (for this codebase)
When working on SecurePR AI:
- **Anchor references**: Use "See Pipeline Layer §3.1" instead of re-explaining
- **File + function**: Reference `ingest-service.ts:validateGithubPayload` not full code
- **Diff format**: Show only changed lines with `+`/`-` prefix
- **Structured summaries**: Bullet lists > prose paragraphs
- **Type references**: Link to `src/domain/models.ts:Finding` instead of redefining
- **Pattern references**: "Uses Strategy pattern (§4D)" instead of explaining pattern

---

## 7) Feature suggestion skill (what's next)
When asked "what missing features?", prioritize by impact:
- Integration test harness for the full pipeline (webhook → publish)
- Real diff chunking (`MAX_LLM_CHUNKS` caps files, not chunks — files past the
  cap are dropped silently)
- Check-run annotations and richer checks output
- Audit log DB + metrics dashboard (logging is `console.log` today)
- Working ServiceBusQueue (currently a placeholder; only `inproc` runs)
- Surface LLM errors instead of swallowing them (`llm-analyzer.ts` bare `catch {}`)