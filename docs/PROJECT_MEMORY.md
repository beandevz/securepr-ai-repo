# PROJECT_MEMORY.md — SecurePR AI (Living Context for AI Assistants)

## Current State (Updated: 2026-08-17)

> The 2026-05-29 snapshot that used to sit here described the original
> Python/FastAPI codebase (`app/services/pipeline.py`, Pydantic settings,
> Alembic, Terraform, `ui/hooks/`, `ui/lib/ApiClient.ts`). The backend was
> rewritten in Node/TypeScript and none of those files exist. It was replaced
> with the description below; the dated decision log further down is unchanged.

### Backend Status (Node.js/Express + TypeScript, ESM)
**Working**:
- ✅ Webhook ingest — `api/routes/ingest.ts` → `services/ingest-service.ts`;
  HMAC verified over the raw body, `X-Hub-Signature-256` or `X-SecurePR-Signature`
- ✅ Multi-host GitHub (github.com + GHES) via `integrations/github/host.ts`
  allow-list (`GITHUB_ALLOWED_HOSTS`)
- ✅ Queue — `queue/manager.ts` InProcQueue (setInterval poll); ServiceBusQueue
  is still a placeholder
- ✅ Persistent job store — `queue/job-store.ts`, sql.js at `JOBS_DB_PATH`,
  `pr_state` column so closed PRs drop out of listings
- ✅ 4-stage pipeline — FetchDiff → Analyze → Aggregate → Publish
  (`services/pipeline/`), entry `pipeline-v2.ts:processJob(job)`
- ✅ Strategy analyzers — RuleBasedAnalyzer, LlmAnalyzer (`services/analyzers/`)
- ✅ RAG — sql.js vector store (`rag/store.ts`), relevance floor `RAG_MIN_SCORE`,
  per-finding policy citations, local hash embeddings gated behind
  `RAG_ALLOW_LOCAL_EMBEDDINGS`
- ✅ Connected repos — `repos/store.ts`, PAT encrypted at rest (AES-256-GCM)
- ✅ Error hierarchy — `SecurePRError` subclasses in `exceptions.ts`

**Key files**: entry `src/main.ts`; settings `src/core/settings.ts` (plain env,
no schema validation); LLM/embeddings `integrations/ai/openai-client.ts`
(OpenAI-compatible, `OPENAI_BASE_URL` retargets to Azure/self-hosted).

### Frontend Status (React 18 + TypeScript + Vite)
**Working**: 6 routes in `ui/App.tsx` — `/` Dashboard, `/connect` ConnectRepo,
`/queue` QueueMonitor, `/results/:jobId` ResultViewerEnhanced, `/github-pr/:jobId`
GitHubPRView, `/rag` RagManager. Error boundaries wrap the tree.

**Key files**: `ui/lib/api.ts` (`apiGet`/`apiPostJson` — functional, there is no
ApiClient class), `ui/lib/storage.ts` (`loadSettings`), `ui/utils/export.ts`
(JSON/CSV/Markdown/HTML), `ui/types/job.ts`. Pages hold their own view-model
types; there is no central types barrel and no `ui/hooks/`.

### Infrastructure
- ✅ `docker-compose.yml` (api + frontend, nginx proxies `/api`)
- ✅ Dockerfiles in `deployment/docker/` — api, frontend, combined
- ❌ No CI/CD workflows (`.github/` does not exist)
- ❌ No IaC — the deployment guides describe manual/CLI steps, not Terraform
- ✅ Deployment guides: `docs/DEPLOYMENT_{AZURE,AWS,COMPARISON}.md`

### Testing
`npm test` in `backend/` — vitest, 97 tests across 8 files (job-store, chunker,
llm-analyzer, ingest-service, prompts, rag-query, rag-service, formatters).
No frontend tests, no integration test for the full pipeline.

### Known Issues / Not Implemented
- ⚠️ No integration tests for the full pipeline (webhook → publish)
- ⚠️ No metrics/observability; audit logging is `console.log` only
- ⚠️ `ServiceBusQueue` is a placeholder — only `inproc` actually runs
- ⚠️ `MAX_LLM_CHUNKS` caps *files*, not chunks; files past the cap are dropped
  silently with no real diff chunking
- ⚠️ `llm-analyzer.ts` swallows LLM errors in a bare `catch {}`
- ⚠️ Scans recorded before the open-PR filter stay visible until that PR's next
  webhook arrives
- ⚠️ No `LICENSE` file despite README claiming MIT

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

### 2026-08-15: RAG hardening Phase 2 (citations in PR comments)
**Current state**: Findings now carry `policy_sources` and every PR comment
states its grounding. Prompt labels each excerpt `[R1 | source=… | chunk i/n |
relevance x]`; the finding schema gained `policy_refs`, which LlmAnalyzer
resolves against the ids it actually sent — unknown ids are dropped with a warn,
so a citation can never name a document that was not retrieved. Excerpts are
sliced from the stored chunk (200 chars), never from model output.
Inline comment renders `> 📚 Policy source: <doc> — chunk 3/12 · relevance 0.71`
plus the quote, or an explicit "_No matching internal policy_" line. Review
summary + check-run summary share `buildSummary()` and end with a Knowledge base
line (documents cited / retrieved-but-uncited / disabled / empty / no match /
unavailable / failed). `rag_status` + `cited_sources` land in job metadata, and
ResultViewerPageEnhanced renders the source card per finding.
**Decisions**:
- `references` is now reserved for public refs (OWASP/CWE); document attribution
  goes through `policy_sources` only — the model is told never to write a file name.
- `formatChunkPrompt` fills both placeholders in one regex pass with a replacer,
  so `$&`/`$'` or a literal `{chunk}` in doc/diff text cannot corrupt the prompt.
**Verification**: backend `typecheck` + `test` (61 passed, 21 new across
llm-analyzer/formatters); frontend `tsc --noEmit` clean; rendered comment/summary
markdown inspected via a scratch script.
**Next**: Phase 3 — retrieval query from added lines only, per-hunk retrieve +
dedupe for long patches, nonce-delimited untrusted-data blocks for RAG/diff.
Consider carrying citations into the Markdown/HTML exports (`ui/utils/export.ts`).

### 2026-08-15: RAG hardening Phase 3 (query quality + prompt injection)
**Current state**: Retrieval queries are built by `services/rag-query.ts`
(`buildRagQueries`) instead of `patch.substring(0,1500)`: file path + language
from the extension + security topics implied by the added code + the added lines
only (context and deleted lines dropped). A file whose added code exceeds
`RAG_QUERY_MAX_CHARS` (4000) is queried per hunk (max 4) rather than truncated;
`RagService.retrieve` now accepts `string | string[]`, embeds all queries in one
call and merges hits by `(source, chunkIndex)` keeping the best score.
Prompt injection: RAG_CONTEXT and DIFF_CHUNK are fenced with per-request nonce
markers (`<<<BEGIN_DIFF_CHUNK_<12 hex>>>>`), SYSTEM_PROMPT declares everything
between them untrusted data and never instructions, and marker-lookalikes in
document or diff text are rewritten to `<redacted-marker ` while the text itself
stays reviewable.
**Decisions**:
- Only the fixed part of a marker needs defusing — the nonce is unguessable, so
  content is not otherwise mangled (git conflict markers etc. survive intact).
- Rule-analyzer hits are NOT used to seed the query (would force running the
  analyzers before retrieval); a keyword table in rag-query.ts covers the same
  intent without coupling the stages.
**Verification**: `typecheck` clean; `npm test` 79 passed (18 new in
rag-query/prompts + 3 merge tests). Rendered prompt inspected via scratch script.
Fixed a Phase 2 slip: the llm-analyzer test mock failed `tsc --noEmit` (mock
declared 0 params, called with 2) — tests passed, typecheck did not.
**Next**: carry citations into `ui/utils/export.ts` (Markdown/HTML exports);
consider real diff chunking so files 6+ are not dropped silently (MAX_LLM_CHUNKS
caps files, not chunks); stop swallowing LLM errors (llm-analyzer.ts catch {}).

### 2026-08-15: Scans limited to open PRs
**Current state**: Closed/merged PRs are neither scanned nor listed.
`IngestService.isPullRequestClosed(payload)` gates the webhook: on a positive
close signal (`pull_request.state === 'closed'`, `action === 'closed'`, or
`merged === true`) the request returns `{ ok, queued: false, skipped:
'pr_closed', hidden_scans: n }` without creating a job, and calls
`jobStore.markPrClosed(owner, repo, prNumber, host)` so that PR's earlier scans
disappear from the list too. `jobs` table gained `pr_state` (default 'open',
added via addColumnIfMissing so existing DBs upgrade in place); `jobStore.list()`
returns open PRs only, `list({ includeClosed: true })` / `GET
/jobs?include_closed=true` returns everything. A job whose PR closed while it sat
in the queue is marked `skipped` instead of posting a review.
**Decisions**:
- Only a *positive* close signal counts — relayed GitHub Actions payloads may
  omit `state`, and treating unknown as closed would silently stop all reviews.
- Hide, don't delete: `GET /jobs/:jobId` still resolves, so existing result links
  and the check-run details URL keep working after a merge.
- Dashboard stats derive from `GET /jobs`, so they now count open PRs only.
**Verification**: `typecheck` clean (backend + frontend); `npm test` 92 passed
(13 new in queue/job-store.test.ts + services/ingest-service.test.ts).
**Open**: scans recorded before this change stay visible until that PR's next
webhook arrives — a closed PR that never gets another event keeps its old scans
listed. A backfill would need to poll the GitHub API per PR.

### 2026-08-15: Bulk job delete endpoint
**Current state**: `DELETE /jobs` clears the job store. It refuses without
`?confirm=true` (400), and `?status=` / `?pr_state=` narrow it to one group
(e.g. dropping failed runs, or scans of closed PRs). Returns
`{ ok, deleted, filter }`. Backed by `jobStore.deleteAll({ status, prState })`,
which builds the WHERE clause from the supplied filters and only persists when
rows actually changed. Route order matters: `DELETE /jobs` is registered before
`DELETE /jobs/:jobId`.
**Why**: deleting every job previously meant looping `DELETE /jobs/:jobId` per id;
the QueueMonitorPage "Clear" button only resets React state, it deletes nothing.
**Verification**: `typecheck` clean; `npm test` 97 passed (5 new); smoke-tested
against the running dev server — 400 without confirm, 200 with, filters applied.

### 2026-08-17: Repo cleanup — dead code, stale docs, git hygiene
**Current state**: Tracked file count 7094 → 118. `node_modules` (6967 files),
`*.db`, `frontend/dist`, `frontend/.env`, `tsconfig.tsbuildinfo` and an orphan
root `package-lock.json` (no root `package.json`) were untracked; `.gitignore`
went from one line to a real ignore set. Dead code removed: backend
`sortFindingsBySeverity`, `getChunkCount`, `resetQueueInstance`,
`safeApiBaseUrl`, `touchLastSync`; frontend `ui/utils/navigation.ts` (whole
file, zero importers), `saveSettings`/`clearSettings`, `exportForJira`/
`copyForJira`, `JobDetail`, `VITE_USE_MOCK_API`. Deleted `backend/kb/` (no code
reads it) and the Python-era `docs/AI_IMPLEMENTATION_GUIDE.md` +
`docs/UI_UX_GUIDE.md`. Rewrote `docs/RAG_SETUP.md` against the real HTTP API,
ported WEBHOOK_GUIDE.md's Python samples to the actual TypeScript, fixed five
broken README links and the `AZURE_OPENAI_*` env blocks in README /
GETTING_STARTED / SETUP_GITHUB / docker-compose (settings.ts never read them).
**Decisions**:
- `git rm --cached` only — files stay on disk and history keeps the 72MB, so
  nothing is destroyed; a history rewrite would break every open clone.
- `client.ts` held a literal NUL byte as a Map-key separator, which made git and
  every grep treat the file as binary and skip it entirely. Replaced with the
  `\u0000` escape: identical runtime value, file is plain text again.
- PROJECT_MEMORY's "Current State" preamble described the Python/FastAPI
  codebase. Rewrote it; left every dated entry untouched.
**Verification**: backend typecheck clean, `npm test` 97 passed; frontend
`tsc -b` clean; no broken markdown links repo-wide.
**Open**: no `LICENSE` file; `docs/DEPLOYMENT_COMPARISON.md` and
`docs/REVIEW_BATCH.md` (3 lines) have no referrers and were left in place.
