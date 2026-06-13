# CLAUDE.md — SecurePR AI (Claude Code Agent Instructions)
# Goal: token-optimized deep reasoning for security analysis, architecture, and refactoring.

## 0) One-screen project snapshot (read first)
**Project**: SecurePR AI — “Shift Left Security. Detect Early. Ship Secure.”  
SecurePR AI is an AI-powered pull request security review system designed to detect vulnerabilities, insecure coding patterns, and misconfigurations before code is merged. [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)

**Core pipeline (diff-first)**: PR Trigger → Diff Parser → Chunking → RAG Retrieval → LLM Analysis → PR Comment. [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)  
**Architecture**: GitHub Webhook → API → Queue → Orchestrator → Analysis → LLM → PR Comment. [2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)  
**Key components**: Webhook Handler, Orchestrator, Diff Processor, Rule Engine, RAG Service, LLM Service, Comment Publisher. [3](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events)[2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)

**Security constraints (non-negotiable)**:
- Validate webhook signature
- Protect code data (minimize LLM exposure)
- Apply OWASP mapping
- Maintain audit logging
- Do not leak code through AI processing [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)[2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)

**Primary detection targets**: SQLi, SSRF, XSS, IDOR, hardcoded secrets, broken authn/authz; severity Low/Medium/High/Critical. [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)

---

## 1) How you should work (token-optimized but deep)
### 1.1 Token discipline rules
- NEVER paste large files back. Use: file path + function name + small diffs.
- When asked to “analyze code”, request/assume only the relevant snippet (≤120 lines).
- Prefer structured bullet summaries over long prose.
- Use “Context Anchors” (below) rather than re-explaining everything.

### 1.2 Context anchors (always keep consistent)
When responding, refer to these stable anchors:
- Pipeline: diff → chunk → RAG → LLM → findings → PR review/comment [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- Architecture: webhook → queue → orchestrator → analysis → PR comment [2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)
- Requirements: detect vulns + severity + OWASP mapping + no exploit instructions + audit logging [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)[2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)[3](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events)

### 1.3 Safety: no exploit instructions
- Explain risk, impact, and safe remediation.
- Do NOT provide step-by-step exploitation.

---

## 2) Persistent “Memory” protocol (for continuity)
You MUST maintain a living file: `docs/PROJECT_MEMORY.md`.

At the end of any meaningful session, append a short update:
- Current State (what works / what’s broken)
- Decisions (why)
- Next Actions (top 3–7)
- Risks / Open questions

Keep each update ≤ 25 lines.

---

## 3) What SecurePR AI currently includes (keep updated)
### 3.1 Backend Architecture (refactored with SOLID + GoF patterns)

**Interface Layer** (`app/interfaces/` - Dependency Inversion):
- `llm_provider.py` - LlmProvider Protocol (review, health_check)
- `queue_provider.py` - QueueProvider Protocol (enqueue, process, health)
- `vcs_provider.py` - VcsProvider Protocol (fetch_files, create_review, post_comment)
- `rag_provider.py` - RagProvider Protocol (retrieve, ingest)

**Factory Layer** (`app/factories/` - Factory Pattern with Singleton):
- `llm_factory.py` - create_llm_provider() → AzureOpenAI | NullLlm (singleton per provider)
- `queue_factory.py` - create_queue_provider() → InProcQueue | ServiceBusQueue
- `vcs_factory.py` - create_vcs_provider() → GitHubAdapter (uses GitHubClient singleton)

**Service Layer** (business logic extraction):
- `ingest_service.py` - IngestService: validate_github_payload, create_check_run_if_enabled, create_job, enqueue_job
- `rag_service.py` - RAG retrieval wrapper
- `llm_service.py` - Deprecated, replaced by LlmAnalyzer (see analyzers)

**Analyzer Layer** (`app/services/analyzers/` - Strategy Pattern):
- `base.py` - SecurityAnalyzer Protocol
- `rule_analyzer.py` - RuleBasedAnalyzer (regex patterns for secrets, SQLi, XSS, etc.)
- `llm_analyzer.py` - LlmAnalyzer (contextual reasoning via LLM provider)
- `factory.py` - create_analyzers(rag_context) → List[SecurityAnalyzer]

**Pipeline Layer** (`app/services/pipeline/` - Chain of Responsibility):
- `base.py` - PipelineContext (job, files, findings, metadata) + PipelineStage Protocol
- `stages/fetch_diff.py` - FetchDiffStage (fetch PR files via VCS)
- `stages/analyze.py` - AnalyzeStage (run all active analyzers)
- `stages/aggregate.py` - AggregateStage (calculate overall severity + gate decision)
- `stages/publish.py` - PublishStage (publish review + update check run/status)
- `orchestrator.py` - PipelineOrchestrator (chains stages, handles errors)
- `pipeline_v2.py` - process_job(job) entry point (uses orchestrator)

**Integration Layer** (resource management + retry):
- `http_client.py` - HTTPClient (singleton, connection pooling, exponential backoff)
- `github/client.py` - GitHubClient (singleton per token, uses HTTPClient)
- `github/review_publisher.py` - ReviewPublisher (uses GitHubClient)
- `github/checks_publisher.py` - ChecksPublisher (uses GitHubClient)

**Queue Management** (`app/queue/`):
- `manager.py` - InProcQueue, ServiceBusQueue classes (proper lifecycle, context manager)
- `inproc_queue.py` - Deprecated wrapper for backward compatibility

**Utilities** (`app/utils/`):
- `severity.py` - get_max_severity, should_fail_gate, severity_rank
- `formatters.py` - format_inline_comment, format_summary

**Error Handling** (`app/exceptions.py`):
- SecurePRError → LlmProviderError, VCSIntegrationError, QueueError, RagError, PipelineError

**API Routes** (`app/api/routes/`):
- `ingest.py` - POST /webhook (30 lines, delegates to IngestService)
- `rag.py` - RAG ingest/search endpoints
- All routes follow: validate → call service → return response

### 3.2 Frontend Architecture (React + TypeScript, modular)

**Type Organization** (`ui/types/` - centralized, DRY):
- `index.ts` - Central export point
- `job.ts` - Job, JobStatus, JobResult, JobDetail
- `api.ts` - All API request/response types
- `finding.ts`, `result.ts`, `diff.ts` - Domain types

**API Client** (`ui/lib/`):
- `ApiClient.ts` - Class-based client (getJobs, getJob, submitWebhook, etc.)
- `endpoints.ts` - Type-safe endpoint definitions
- `api.ts` - Deprecated functional API (backward compat)

**Utilities** (`ui/utils/` - extracted business logic):
- `severity.ts` - severityClass, severityWeight, sortBySeverity
- `navigation.ts` - scrollToElement, nextIndex, prevIndex
- `diffParser.ts` - parseUnifiedPatchToRows, parseHunkHeader
- `diffBlocks.ts` - buildBlocks, buildIssueBlocks
- `wordDiff.ts` - diffWords (word-level highlighting)

**Hooks** (`ui/hooks/` - reusable stateful logic):
- `useFindingNavigation.ts` - Finding navigation (goToNext, goToPrevious, activeIndex)
- `useJobFetch.ts` - Job fetching with loading/error states
- `useApi.ts` - Generic API hook template

**Components** (`ui/components/`):
- `ErrorBoundary.tsx` + `ErrorFallback.tsx` - Error boundary pattern
- `SplitDiffViewer/` (modular folder):
  - `index.tsx` - Main component (~120 lines, down from 563)
  - `DiffRow.tsx` - Single row rendering
  - `DiffToolbar.tsx` - Filter toolbar
  - `CollapsedSection.tsx` - Collapsible sections
- Other: Nav, Pill, Card (thin presentational components)

**Pages** (`ui/pages/`):
- `HomePage.tsx` - Health check panel
- `WebhookSimulatorPage.tsx` - Webhook simulator
- `QueueMonitorPage.tsx` - Queue monitor (uses hooks, no inline types)
- `ResultViewerPage.tsx` - Result viewer (uses useFindingNavigation, severity utils)
- `ChecksViewerPage.tsx` - Check-run / commit-status viewer
- `RagManagerPage.tsx` - RAG ingest + search tools

**Error Handling**:
- All routes wrapped in ErrorBoundary
- Graceful degradation for API failures

### 3.3 Tech stack (from requirements; keep portable)
- Backend: FastAPI (Python) [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)[2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)
- AI: Azure OpenAI / OpenAI; optional local LLM [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- DB: PostgreSQL for metadata/audit; Vector DB for RAG [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- Frontend: requirement mentions Angular for dashboard; current UI can be React/Vite (portable). [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)

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
- Security checklist (OWASP-based) [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)

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

### Skill E — Frontend guidance (portable React/Angular)
- Keep UI thin: typed DTOs + API client layer
- Avoid business logic in components; isolate to services/hooks
- Provide operator-friendly UX: statuses, retries, raw JSON view, copy buttons

### Skill F — Backend guidance (portable Python/Java)
- Keep domain models framework-agnostic
- Put IO at edges (VCS API, queue, LLM); keep core pure functions
- Define ports/adapters so migration to Java/Spring or other stacks is straightforward

---

## 5) Standard response formats (use to optimize tokens)
### 5.1 “Implement feature” response
1) Short plan (≤8 bullets)
2) Files to change (list)
3) Minimal patch snippets only
4) Tests / verification steps
5) Update to `docs/PROJECT_MEMORY.md`

### 5.2 “Overview/presentation” response
1) Executive summary (≤10 lines)
2) Architecture + flow
3) Feature list (BE + FE)
4) Risks + roadmap

---

## 6) Implementation patterns (code generation guidance)

### 6.1 Adding a new analyzer
```python
# 1. Create analyzer in app/services/analyzers/
class MyAnalyzer:
    def analyze(self, file_path: str, content: str) -> List[Finding]:
        findings = []
        # detection logic
        return findings
    def get_name(self) -> str:
        return “MyAnalyzer”

# 2. Register in factory.py
def create_analyzers(rag_context: str = “”) -> List[SecurityAnalyzer]:
    analyzers = [RuleBasedAnalyzer()]
    if settings.my_analyzer_enabled:
        analyzers.append(MyAnalyzer())
    return analyzers
```

### 6.2 Adding a new pipeline stage
```python
# 1. Create stage in app/services/pipeline/stages/
class MyStage:
    def execute(self, context: PipelineContext) -> PipelineContext:
        # stage logic
        return context
    def get_name(self) -> str:
        return “MyStage”

# 2. Register in orchestrator.py __init__
self.stages = [FetchDiffStage(), MyStage(), AnalyzeStage(), ...]
```

### 6.3 Adding a new VCS provider (GitLab, Azure DevOps)
```python
# 1. Create adapter in app/integrations/gitlab/
class GitLabAdapter:
    def fetch_files(self, owner: str, repo: str, mr_id: int) -> List[Dict]:
        # GitLab MR API call
    def create_review(self, ...):
        # GitLab MR comment API
    # ... implement VcsProvider protocol

# 2. Register in vcs_factory.py
def create_vcs_provider(vcs_type: str, token: str) -> VcsProvider:
    if vcs_type == ‘gitlab’:
        return GitLabAdapter(token)
    elif vcs_type == ‘github’:
        return GitHubAdapter(token)
```

### 6.4 Adding a new frontend page
```typescript
// 1. Create page in ui/pages/MyPage.tsx
import { ApiClient } from ‘@/lib/ApiClient’;
import { useApi } from ‘@/hooks/useApi’;

export function MyPage() {
  const { data, loading, error } = useApi(() => new ApiClient(‘/api’).getMyData());
  if (loading) return <div>Loading...</div>;
  if (error) return <ErrorFallback error={error} />;
  return <div>{/* render */}</div>;
}

// 2. Register route in App.tsx
<Route path=”/my-page” element={<MyPage />} />
```

### 6.5 Token optimization strategies (for this codebase)
When working on SecurePR AI:
- **Anchor references**: Use “See Pipeline Layer §3.1” instead of re-explaining
- **File + function**: Reference `ingest_service.py:validate_github_payload` not full code
- **Diff format**: Show only changed lines with `+`/`-` prefix
- **Structured summaries**: Bullet lists > prose paragraphs
- **Type references**: Link to `ui/types/job.ts:Job` instead of redefining
- **Pattern references**: “Uses Strategy pattern (§4D)” instead of explaining pattern

---

## 7) Feature suggestion skill (what’s next)
When asked “what missing features?”, prioritize by impact:
- Persistent job store + status endpoints (runs/jobs)
- Check-run annotations and richer checks output
- RAG management: upload/search/delete/list sources
- Audit log DB + metrics dashboard
- Provider abstraction + integration tests harness [1](https://docs.github.com/en/webhooks/webhook-events-and-payloads)[2](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)