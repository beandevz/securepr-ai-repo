# PROJECT_MEMORY.md — SecurePR AI (Living Context for AI Assistants)

## Current State (Updated: 2026-05-29)

### Backend Status
**Architecture**: Fully refactored with SOLID principles + GoF patterns (Factory, Strategy, Pipeline, Singleton)

**Working Components**:
- ✅ Webhook ingest (`api/routes/ingest.py` → `services/ingest_service.py`)
- ✅ Queue management (InProcQueue, ServiceBusQueue via `queue/manager.py`)
- ✅ Pipeline orchestration (4 stages: Fetch → Analyze → Aggregate → Publish)
- ✅ Strategy-based analyzers (RuleBasedAnalyzer, LlmAnalyzer)
- ✅ Factory pattern for providers (LLM, Queue, VCS)
- ✅ HTTP client resource management (singleton per token, connection pooling, retry)
- ✅ GitHub integration (review comments, check runs, commit status)
- ✅ RAG service (vector store retrieval)
- ✅ Structured error handling (SecurePRError hierarchy)

**Key Files**:
- Entry: `app/services/pipeline_v2.py:process_job(job)`
- Interfaces: `app/interfaces/{llm,queue,vcs,rag}_provider.py`
- Factories: `app/factories/{llm,queue,vcs}_factory.py`
- Analyzers: `app/services/analyzers/{base,rule_analyzer,llm_analyzer,factory}.py`
- Pipeline: `app/services/pipeline/{base,orchestrator}.py` + `stages/{fetch_diff,analyze,aggregate,publish}.py`
- Services: `app/services/ingest_service.py`
- Integrations: `app/integrations/{http_client,github/{client,review_publisher,checks_publisher}}.py`

**Configuration**: Settings in `app/core/config.py` (env-based, Pydantic validated)

### Frontend Status
**Architecture**: React + TypeScript, modular with hooks pattern

**Working Components**:
- ✅ Type organization (`ui/types/` - centralized, DRY)
- ✅ API Client class (`ui/lib/ApiClient.ts`)
- ✅ Business logic extraction (`ui/utils/`, `ui/hooks/`)
- ✅ Component modularity (SplitDiffViewer: 563 lines → 120 lines)
- ✅ Error boundaries (all routes wrapped)
- ✅ Pages: Home, WebhookSimulator, QueueMonitor, ResultViewer, ChecksViewer, RagManager

**Key Files**:
- Entry: `ui/App.tsx` (routes, ErrorBoundary)
- Types: `ui/types/index.ts` (exports all)
- API: `ui/lib/ApiClient.ts`
- Utils: `ui/utils/{severity,navigation,diffParser,diffBlocks,wordDiff}.ts`
- Hooks: `ui/hooks/{useFindingNavigation,useJobFetch}.ts`
- Components: `ui/components/{ErrorBoundary,SplitDiffViewer/,Nav,Pill,Card}.tsx`

### Infrastructure
- ✅ Docker Compose for local dev (`docker-compose.yml`)
- ✅ Dockerfiles: API, Worker, Frontend (`deployment/docker/`)
- ✅ CI/CD: GitHub Actions (`.github/workflows/{ci,deploy-azure,deploy-aws}.yml`)
- ✅ IaC: Terraform modules for Azure/AWS (`deployment/terraform/{azure,aws}/`)
- ✅ Deployment guides: `docs/DEPLOYMENT_{AZURE,AWS,COMPARISON}.md`

### Documentation
- ✅ `README.md` - Project overview with badges
- ✅ `CONTRIBUTING.md` - Team collaboration guidelines
- ✅ `SETUP_GITHUB.md` - GitHub setup instructions
- ✅ `GETTING_STARTED.md` - Step-by-step setup guide
- ✅ `CLAUDE.md` - AI assistant instructions (token-optimized)
- ✅ `.github/copilot-instructions.md` - GitHub Copilot rules
- ✅ `docs/AI_IMPLEMENTATION_GUIDE.md` - Claude/Copilot integration

### Known Issues / Not Implemented
- ⚠️ No persistent job store (jobs exist only in queue/memory)
- ⚠️ No database migrations (PostgreSQL schema not versioned)
- ⚠️ No integration tests for full pipeline
- ⚠️ No metrics/observability dashboard
- ⚠️ RAG ingest management UI incomplete
- ⚠️ Legacy `pipeline.py` still exists (deprecated, use `pipeline_v2.py`)

---

## Recent Decisions (Why)

### 2026-05-29: Complete architecture refactoring
**Decision**: Applied SOLID + GoF patterns across backend and frontend  
**Why**: Original codebase had tight coupling, global state, business logic in routes/components, 563-line monolithic components, no testability  
**Impact**: 
- Backend: 22 new files (interfaces, factories, analyzers, pipeline stages), 15 refactored files
- Frontend: 20+ new files (types, utils, hooks, component modules), 8 refactored files
- Maintainability: Each module <150 lines, clear separation of concerns
- Extensibility: Add new analyzers/stages/providers by implementing protocols

### 2026-05-29: Pipeline pattern for orchestration
**Decision**: Replaced 138-line monolithic `process_job_legacy()` with 4-stage pipeline  
**Why**: Monolithic function was untestable, hard to extend, mixed concerns  
**Stages**: FetchDiffStage → AnalyzeStage → AggregateStage → PublishStage  
**Benefits**: Each stage testable in isolation, easy to add/remove stages, clear data flow via PipelineContext

### 2026-05-29: Strategy pattern for analyzers
**Decision**: Pluggable analyzers via SecurityAnalyzer protocol  
**Why**: Need to support multiple analysis methods (rules, LLM, future: ML models)  
**Current**: RuleBasedAnalyzer (regex patterns), LlmAnalyzer (contextual reasoning)  
**Future**: Easy to add SastAnalyzer, TaintAnalyzer, etc.

### 2026-05-29: HTTP client resource management
**Decision**: Singleton GitHubClient per token with connection pooling  
**Why**: Creating new httpx.Client() per request caused resource exhaustion, no connection reuse  
**Implementation**: `integrations/http_client.py` (base client) → `github/client.py` (singleton per token)  
**Benefits**: Connection pooling, exponential backoff retry, proper timeout handling

### 2026-05-29: Service layer extraction
**Decision**: Moved business logic from routes to service classes  
**Why**: Routes should only handle HTTP concerns (validation, response format)  
**Example**: `ingest.py` 72 lines → 30 lines by extracting IngestService  
**Pattern**: Route validates → calls service → returns response

### 2026-05-29: Frontend type centralization
**Decision**: All types in `ui/types/`, imported from `ui/types/index.ts`  
**Why**: Inline types in components caused duplication, inconsistency with backend  
**Benefits**: Single source of truth, easy to keep in sync with API schemas

### 2026-05-29: Component modularity
**Decision**: Break components >150 lines into folders with sub-components  
**Why**: 563-line SplitDiffViewer was unmaintainable  
**Result**: `SplitDiffViewer/` folder with index.tsx (120 lines) + DiffRow + DiffToolbar + CollapsedSection  
**Pattern**: Reusable for other large components (future: ResultViewerPage)

---

## Architecture Quick Reference (for AI context)

### Backend Flow
```
GitHub Webhook → ingest.py → IngestService → Queue → pipeline_v2.py:process_job()
  → PipelineOrchestrator.execute()
    → FetchDiffStage (via VcsProvider)
    → AnalyzeStage (via SecurityAnalyzer[])
    → AggregateStage (severity calculation)
    → PublishStage (GitHub review + check run)
```

### Backend Layers (Dependency Inversion)
```
API Routes (thin, HTTP-only)
  ↓
Service Layer (business logic)
  ↓
Factory Layer (provider creation)
  ↓
Interface Layer (protocols)
  ↓
Integration Layer (external systems: GitHub, LLM, Queue, RAG)
```

### Frontend Flow
```
User → Page Component → Hook (useApi, useFindingNavigation)
  → ApiClient (class-based)
    → Fetch API
  → Utils (severityClass, diffParser, etc.)
    → Pure functions
  → Presentational Components (Pill, Card, etc.)
```

### Key Design Patterns Used
- **Factory**: `create_llm_provider()`, `create_queue_provider()`, `create_vcs_provider()`, `create_analyzers()`
- **Strategy**: SecurityAnalyzer (RuleBasedAnalyzer, LlmAnalyzer)
- **Pipeline**: PipelineStage (FetchDiffStage, AnalyzeStage, AggregateStage, PublishStage)
- **Singleton**: GitHubClient (per token), HTTPClient, LLM providers
- **Adapter**: GitHubAdapter (implements VcsProvider for GitHub API)
- **Protocol**: All `*Provider` interfaces (dependency inversion)

---

## File Organization (for navigation)

### Backend Critical Paths
- **Pipeline entry**: `app/services/pipeline_v2.py`
- **Orchestrator**: `app/services/pipeline/orchestrator.py`
- **Analyzers**: `app/services/analyzers/factory.py` (registration point)
- **Services**: `app/services/ingest_service.py` (webhook logic)
- **Factories**: `app/factories/{llm,queue,vcs}_factory.py` (provider creation)
- **Integrations**: `app/integrations/github/client.py` (GitHub API client)

### Frontend Critical Paths
- **App entry**: `ui/App.tsx` (routing, ErrorBoundary)
- **Type index**: `ui/types/index.ts` (import from here)
- **API client**: `ui/lib/ApiClient.ts` (all API calls)
- **Main pages**: `ui/pages/{QueueMonitor,ResultViewer,WebhookSimulator}Page.tsx`
- **Key hooks**: `ui/hooks/useFindingNavigation.ts`
- **Key utils**: `ui/utils/{severity,diffParser}.ts`

---

## Next Actions (Priority)

### High Priority
1. **Add integration tests** for full pipeline (webhook → queue → analysis → GitHub publish)
2. **Implement persistent job store** (PostgreSQL table for jobs, add API endpoints)
3. **Add database migrations** (Alembic for schema versioning)
4. **Remove deprecated code** (`app/services/pipeline.py:process_job_legacy`, `ui/lib/api.ts` functional API)

### Medium Priority
5. **Add metrics/observability** (Prometheus metrics, structured logging, dashboard)
6. **Complete RAG management UI** (upload/delete/list sources, search interface)
7. **Add unit tests** for analyzers (RuleBasedAnalyzer patterns, LlmAnalyzer mocking)
8. **Add check run annotations** (file + line annotations for GitHub Checks)

### Low Priority
9. **Support GitLab/Azure DevOps** (implement VcsProvider adapters)
10. **Add ML-based analyzer** (train model on vulnerability dataset, implement as MlAnalyzer)
11. **Add rate limiting** (for webhook endpoint, LLM calls)
12. **Add caching layer** (Redis for RAG results, LLM responses)

---

## Common Tasks (How To)

### Add a new security detection rule
1. Edit `app/services/analyzers/rule_analyzer.py`
2. Add pattern to `PATTERNS` dict: `"rule_name": {"pattern": r"...", "severity": "HIGH", "message": "..."}`
3. Rule automatically active (no registration needed)

### Add a new analyzer type (e.g., SAST integration)
1. Create `app/services/analyzers/sast_analyzer.py`
2. Implement `SecurityAnalyzer` protocol (analyze, get_name)
3. Register in `app/services/analyzers/factory.py:create_analyzers()`:
   ```python
   if settings.sast_enabled:
       analyzers.append(SastAnalyzer())
   ```

### Add a new pipeline stage (e.g., post-processing)
1. Create `app/services/pipeline/stages/post_process.py`
2. Implement `PipelineStage` protocol (execute, get_name)
3. Add to `app/services/pipeline/orchestrator.py:__init__`:
   ```python
   self.stages = [FetchDiffStage(), AnalyzeStage(), AggregateStage(), PostProcessStage(), PublishStage()]
   ```

### Add a new VCS provider (e.g., GitLab)
1. Create `app/integrations/gitlab/adapter.py`
2. Implement `VcsProvider` protocol (fetch_files, create_review, post_comment, update_check_run)
3. Register in `app/factories/vcs_factory.py:create_vcs_provider()`:
   ```python
   if vcs_type == 'gitlab':
       return GitLabAdapter(token)
   ```
4. Update `app/core/config.py` with `vcs_provider` setting

### Add a new frontend page
1. Create `ui/pages/MyPage.tsx`
2. Add types to `ui/types/my.ts` if needed
3. Use `ApiClient` for API calls:
   ```typescript
   const client = new ApiClient('/api');
   const data = await client.getMyData();
   ```
4. Add route in `ui/App.tsx`:
   ```typescript
   <Route path="/my-page" element={<MyPage />} />
   ```

### Debug pipeline execution
1. Check logs for stage failures: `PipelineError: Stage X failed`
2. Inspect `PipelineContext.metadata` for stage outputs
3. Each stage returns context, so data flows: Fetch → files → Analyze → findings → Aggregate → severity → Publish
4. Use `logger.info(f"Stage {name}: {context}")` in stages

---

## Token Optimization Strategies (for AI sessions)

### Context References (use instead of re-explaining)
- **Architecture**: "See Backend Layers §Architecture Quick Reference"
- **Pipeline**: "See Backend Flow §Architecture Quick Reference"
- **Patterns**: "Uses Factory pattern (CLAUDE.md §6)"
- **File location**: Reference `ingest_service.py:validate_github_payload` not full code

### Diff Format (show only changes)
```diff
# ✅ DO
+ from app.factories.llm_factory import create_llm_provider
- from app.integrations.ai.azure_openai_client import AzureOpenAIClient

# ❌ DON'T paste full file (50 lines)
```

### Structured Summaries (bullets > prose)
```markdown
# ✅ DO
**Changes**:
- Added SecurityAnalyzer protocol
- Extracted RuleBasedAnalyzer
- Registered in factory

# ❌ DON'T
"I have added a new security analyzer protocol which defines the interface
for all analyzers. Then I extracted the rule-based analyzer into its own
file and registered it in the factory so that it can be used..." (50 words)
```

### Type References (link, don't redefine)
```markdown
# ✅ DO
Returns `Job` (see `ui/types/job.ts`)

# ❌ DON'T
Returns a Job object with fields: job_id (string), owner (string),
repo (string), pr_number (number), ... (20 fields)
```

---

## Risks / Open Questions

### Risk: Legacy pipeline code still active
- `app/services/pipeline.py:process_job_legacy()` still exists
- Worker may still call it (check `app/worker.py`)
- **Action**: Verify worker uses `pipeline_v2.py:process_job()`, remove legacy code

### Risk: No database schema versioning
- PostgreSQL schema changes not tracked (no Alembic migrations)
- Risk of schema drift between environments
- **Action**: Initialize Alembic, create initial migration from current schema

### Risk: No persistent job store
- Jobs only exist in queue/memory
- Cannot query job history, no audit trail
- **Action**: Add `jobs` table (PostgreSQL), update pipeline to persist results

### Risk: Type alignment between frontend/backend
- Frontend types manually defined, may drift from Pydantic schemas
- **Action**: Consider generating TypeScript types from Pydantic (e.g., pydantic-to-typescript)

### Question: Should we version the API?
- Current: `/api/jobs`, `/api/webhook`
- Future: `/api/v1/jobs`, `/api/v2/jobs`?
- **Consider**: API versioning strategy before adding breaking changes

### Question: How to handle large PRs (>1000 files)?
- Current: `settings.max_llm_chunks` limits files processed
- Risk: Miss vulnerabilities in files beyond limit
- **Consider**: Parallel processing, chunking strategy, priority-based file selection

---

## Verification Commands (for testing)

### Backend
```bash
# Run all tests (if any)
pytest

# Start API server
uvicorn app.main:app --reload --port 8000

# Test webhook endpoint
curl -X POST http://localhost:8000/api/webhook \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/github_webhook.json

# Check health
curl http://localhost:8000/api/health
```

### Frontend
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Type check
npm run type-check

# Build
npm run build
```

### Docker
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Verify services
curl http://localhost:8000/api/health  # backend
curl http://localhost:5173             # frontend
```

---

## Context for Claude/Copilot (token-efficient prompts)

### When asked to add a feature
**Provide**:
- Feature name + purpose (1 line)
- Files to change (list)
- Which pattern to use (Factory/Strategy/Pipeline/etc.)
- Integration points (which protocol to implement)

**Example**:
```
Add SAST analyzer integration
- Purpose: Run Semgrep on PR diff, add findings to pipeline
- Files: analyzers/sast_analyzer.py (new), analyzers/factory.py (register)
- Pattern: Strategy (implement SecurityAnalyzer protocol)
- Integration: Call Semgrep CLI, parse JSON output, convert to Finding[]
```

### When asked to debug an issue
**Provide**:
- Error message (exact)
- File + line number
- Recent changes (if any)
- Expected vs actual behavior

**Example**:
```
Error: PipelineError: Stage AnalyzeStage failed: 'NoneType' object has no attribute 'review'
File: pipeline/stages/analyze.py:15
Recent: Refactored LlmService to LlmAnalyzer (factory pattern)
Expected: LlmAnalyzer.analyze() returns Finding[]
Actual: analyzer is None (factory not creating instance)
```

### When asked to review code
**Provide**:
- File path only (not full code)
- Specific concerns (security, performance, maintainability)
- Context (part of which feature/refactor)

**Example**:
```
Review ingest_service.py:validate_github_payload
Concerns: Security (payload validation), error handling
Context: Extracted from ingest.py route (service layer refactor)
```

---

## Memory Update Protocol

After any major changes, append to this file (≤25 lines):

```markdown
### YYYY-MM-DD: [Change summary]
**Decision**: [What]
**Why**: [Reason]
**Impact**: [Files changed, pattern used, benefits]
**Next**: [Follow-up actions]
```

This keeps context fresh for future AI sessions without re-reading full codebase.

### 2026-08-11: Multi-host GitHub support (github.com + GitHub Enterprise Server)
**Decision**: Resolve the GitHub API root per repo/job instead of hard-coding
`https://api.github.com`. New `integrations/github/host.ts` owns host parsing,
allow-listing, and the `apiBaseUrlForHost()` mapping (github.com →
`api.github.com`; any other host → `https://<host>/api/v3`).
**Why**: Bosch repos live on `github.boschdevcloud.com` (GHES), which serves
its API from the same hostname under `/api/v3`. One deployment must serve both.
**Impact**:
- `GITHUB_ALLOWED_HOSTS` env (default `github.com,github.boschdevcloud.com`);
  github.com is always kept in the list. Host is untrusted input — the stored
  token is sent there — so it is allow-listed, not merely parsed.
- `GitHubClient` singletons keyed by (apiBaseUrl, token), so hosts never share
  a pooled client or token. Publishers/`RepoWebhookClient`/`DiffFetcher`/
  `status-client` all take an optional `apiBaseUrl` (defaults to github.com).
- `Job` carries `githubHost` + `apiBaseUrl`; pipeline stages use them.
- Ingest derives the host from `repository.html_url` (or the
  `X-SecurePR-Github-Host` header) and rejects non-allow-listed hosts.
- `connected_repos` and `jobs` gained a `host` column; `connected_repos`
  uniqueness moved from (owner, name) to (host, owner, name) via an in-place
  table rebuild, so the same repo name can exist on both hosts. Legacy rows
  backfill to github.com. Verified against the existing repos.db/jobs.db.
- `GET /github/status/...` accepts `?host=`.
**Next**: Surface the host on job/PR links in the UI; consider per-host default
tokens for GHES service accounts.

### 2026-08-13: GitHub token scopes documented (docs/GITHUB_TOKEN_SCOPES.md)
**Current state**: Audited every GitHub API call and mapped it to the required
token permission. Fine-grained PAT needs Metadata:R, Webhooks:RW,
Pull requests:RW, Issues:RW, Commit statuses:RW, Checks:R. Classic PAT needs
`repo` + `admin:repo_hook` (not `write:repo_hook` — `disconnectRepo` deletes).
**Decision**: Recommend `STATUS_REPORTING_MODE=commit_status` for any PAT
deployment. `POST /check-runs` is GitHub App-only; a PAT always 403s there.
The path already degrades safely (ingest-service.ts:78 swallows → publish.ts:100
falls through to createCommitStatus), so the gate works, but check_run mode
burns a guaranteed-failing call per job.
**Risks / open questions**:
- Real check runs require moving to a GitHub App installation token.
- `TOKEN_ENCRYPTION_KEY` still defaults to `change_me`; it decrypts every
  stored per-repo token.
**Next**: (1) consider defaulting STATUS_REPORTING_MODE to commit_status in
.env.example, (2) surface a permission-preflight on Connect Repo, (3) evaluate
GitHub App auth.

### 2026-08-13: Review flow documented (docs/FLOW.md)
**Current state**: Traced the live diff-review path. Per changed file: patch →
RAG retrieve (query = path + first 1500 chars) → RuleBasedAnalyzer + LlmAnalyzer
→ aggregate → publish. Confirmed RAG *is* wired end-to-end and reaches the LLM
prompt as `[source=X score=Y]` blocks, with the system prompt asking the model
to cite the source id in `references[]`.
**Findings that surprised**:
- Defaults ship the review as regex-only: `LLM_PROVIDER=none` and
  `RAG_ENABLED=false` (.env.example:15,22).
- Source/document name is never shown to the user. `references[]` reaches the
  job JSON (aggregate.ts:21) but formatInlineComment doesn't render it and the
  UI's local Finding interface (ResultViewerPageEnhanced.tsx:7) omits the field.
  Attribution is also model-dependent — RagService.retrieve collapses the
  (source, text, score) tuples into one string and discards the structure.
- No chunking despite the CLAUDE.md anchor: whole file patch = one DIFF_CHUNK;
  MAX_LLM_CHUNKS=5 caps *files*, and files 6+ are dropped silently.
- Hash-embedding fallback (openai-client.ts:92) makes retrieval meaningless
  without OPENAI_API_KEY, while still looking like it works.
**Next**: (1) render `references` in formatters + UI, (2) attach retrieved
sources to findings deterministically in AnalyzeStage, (3) real diff chunking +
a marker when files are truncated, (4) stop swallowing LLM errors
(llm-analyzer.ts:63).

### 2026-08-15: RAG hardening Phase 1 (retrieval foundation)
**Current state**: `RagService.retrieve()` now returns a structured
`RagContext { chunks, promptText, status }` instead of a flat string, and never
throws — every failure degrades to an empty context plus a reason
(`disabled | no_embedding_model | no_documents | no_relevant_docs | error`).
`store.search()` returns `RagHit[]` with `chunkIndex/totalChunks`, so a chunk can
be cited back to its document. Each retained chunk gets a server-assigned
`refId` (R1, R2, …) — unused in the prompt yet, it is the anchor for Phase 2
citations. `/health` and `/rag/stats` expose RAG health; `/rag/search` marks
`above_min_score` per hit for threshold tuning.
**Decisions**:
- `RAG_MIN_SCORE=0.30` drops low-similarity chunks so unrelated policy text
  cannot become "confirming evidence" (and stops burning prompt tokens).
- Retrieval is skipped when embeddings would fall back to SHA-256 hashes, since
  cosine over them is random; `RAG_ALLOW_LOCAL_EMBEDDINGS=true` overrides for dev.
  Warning is logged once per process, not per file.
- Ref ids are assigned server-side so a citation can never name a document that
  was not actually retrieved.
**Verification**: `npm run typecheck` clean; `npm test` 47 passed (8 new in
`services/rag-service.test.ts`).
**Next**: Phase 2 — label chunks as `[R1 | source=… | chunk i/n]` in the prompt,
add `policy_refs` to the finding schema, resolve refs to `Finding.policy_sources`
(dropping hallucinated ids), render the source in PR comments + UI. Then Phase 3
(better retrieval query, multi-hunk retrieve, prompt-injection delimiters).
