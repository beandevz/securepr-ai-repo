# SecurePR AI - Webhook Complete Guide

## 📖 Table of Contents
1. [What is a Webhook?](#what-is-a-webhook)
2. [How SecurePR AI Uses Webhooks](#how-securepr-ai-uses-webhooks)
3. [Webhook Flow Diagram](#webhook-flow-diagram)
4. [GitHub Webhook Setup](#github-webhook-setup)
5. [Webhook Security](#webhook-security)
6. [Payload Structure](#payload-structure)
7. [Export Functionality](#export-functionality)
8. [Troubleshooting](#troubleshooting)

---

## 🤔 What is a Webhook?

A **webhook** is an HTTP callback - a way for one application to send real-time data to another application when an event occurs.

### Traditional Polling vs Webhooks

**❌ Traditional Polling (Inefficient):**
```
SecurePR AI: "Hey GitHub, any new PRs?" (every 30 seconds)
GitHub: "Nope"
SecurePR AI: "Any new PRs now?"
GitHub: "Nope"
SecurePR AI: "How about now?"
GitHub: "Yes! PR #456 just opened"
```
**Problems:**
- Wastes API calls (rate limits)
- Delays (only checks every 30s)
- Server resources wasted

**✅ Webhooks (Efficient):**
```
[Developer opens PR #456]
GitHub → HTTP POST to SecurePR AI → "PR #456 just opened!"
SecurePR AI: "Got it! Starting scan..."
```
**Benefits:**
- Instant notifications (no delay)
- No wasted API calls
- Event-driven (only runs when needed)

---

## 🔄 How SecurePR AI Uses Webhooks

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Developer Activity                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         Developer opens/updates PR on GitHub
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. GitHub Webhook Trigger                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    GitHub sends HTTP POST to: https://your-app.com/ingest/github-actions
    
    Payload includes:
    - PR number, title, author
    - Changed files
    - Commit SHA
    - Repository info
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SecurePR AI Receives Webhook                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ✓ Validates GitHub signature (HMAC-SHA256)
    ✓ Extracts PR details
    ✓ Creates check run on GitHub
    ✓ Creates job in queue
    ✓ Returns 200 OK to GitHub (< 10 seconds)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Background Processing                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    → Fetch diff from GitHub
    → Chunk code into sections
    → Retrieve RAG context
    → Run LLM analysis
    → Run rule-based checks
    → Aggregate findings
    → Calculate severity score
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Post Results to GitHub                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ✓ Update check run (PASS/FAIL)
    ✓ Post inline comments on PR
    ✓ Add review (approve/request changes)
    ✓ Set commit status
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Developer Sees Results                                       │
└─────────────────────────────────────────────────────────────────┘
    
    Developer views:
    - ❌ "3 security issues found" check
    - Inline comments on vulnerable code
    - Safe fix suggestions
```

---

## 🎯 Webhook Flow Diagram

```
┌──────────────┐
│   GitHub     │
│              │
│  PR #456     │
│  opened      │
└──────┬───────┘
       │
       │ HTTP POST
       │ X-Hub-Signature-256: sha256=abc123...
       │ {
       │   "action": "opened",
       │   "pull_request": {...}
       │ }
       ↓
┌──────────────────────────────────────┐
│  SecurePR AI - Webhook Handler       │
│  POST /ingest/github-actions         │
├──────────────────────────────────────┤
│  1. Verify signature                 │
│     ✓ HMAC-SHA256 matches            │
│                                      │
│  2. Extract payload                  │
│     owner: "myorg"                   │
│     repo: "api-service"              │
│     pr_number: 456                   │
│     head_sha: "abc123..."            │
│                                      │
│  3. Create check run                 │
│     GitHub API: POST /check-runs     │
│     Status: "in_progress"            │
│     check_run_id: 98765              │
│                                      │
│  4. Create job                       │
│     job_id: "job-001"                │
│     status: "pending"                │
│                                      │
│  5. Enqueue                          │
│     Queue.push(job)                  │
│                                      │
│  6. Return 200 OK                    │
│     { "job_id": "job-001" }          │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Background Worker                   │
├──────────────────────────────────────┤
│  Job picked from queue               │
│                                      │
│  → Fetch diff                        │
│  → Analyze with LLM                  │
│  → Generate findings                 │
│  → Calculate score                   │
│  → Update check run                  │
│  → Post PR comments                  │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  GitHub PR Updated                   │
├──────────────────────────────────────┤
│  ❌ SecurePR AI                      │
│     3 security issues found          │
│                                      │
│  💬 Inline comments:                 │
│     "SQL Injection at line 45"       │
│     "Safe fix: use parameters"       │
└──────────────────────────────────────┘
```

---

## 🔧 GitHub Webhook Setup

### Option 1: Manual Setup (GitHub UI)

1. **Go to your repository on GitHub**
   - Navigate to: `https://github.com/owner/repo`

2. **Open Settings → Webhooks**
   - Settings → Webhooks → Add webhook

3. **Configure the webhook:**
   ```
   Payload URL: https://your-securepr-app.com/ingest/github-actions
   Content type: application/json
   Secret: your-webhook-secret (generate a strong random string)
   
   Events to trigger:
   ☑ Pull requests
   ☑ Pull request reviews
   ☑ Pull request review comments
   
   Active: ☑ (checked)
   ```

4. **Save and test:**
   - GitHub will send a test ping
   - Check "Recent Deliveries" to see the response

### Option 2: Automated Setup (via API)

SecurePR AI can auto-configure webhooks when you connect a repo:

```typescript
// Frontend: ConnectRepoPage.tsx
async function connectRepo(repoUrl: string, token: string) {
  // 1. Send to backend
  const response = await fetch('/api/repos/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, token })
  });
  
  // 2. Backend creates webhook via GitHub API
  const result = await response.json();
  // result.webhook_id, result.webhook_url
}
```

**Backend implementation** — `POST /repos` in `api/routes/repos.ts` delegates to
`services/repo-service.ts:connectRepo`:

```typescript
export async function connectRepo(repoUrl: string, githubToken: string): Promise<ConnectedRepoSafe> {
  // 1. Parse host + owner/name; the host is checked against GITHUB_ALLOWED_HOSTS
  //    so a token can never be sent to an unapproved GitHub instance.
  const { host, owner, name } = parseRepoUrl(repoUrl);
  const apiBaseUrl = apiBaseUrlForHost(host);

  // 2. Prove the token actually works before storing it.
  const client = new RepoWebhookClient(githubToken, apiBaseUrl);
  await client.getRepo(owner, name);

  // 3. Persist. The PAT is AES-256-GCM encrypted (core/security.ts:encryptSecret)
  //    so plaintext never touches disk.
  let repo = await repoStore.insertRepo({
    owner, name, url: repoUrl, host,
    encryptedToken: encryptSecret(githubToken),
  });

  // 4. Best-effort webhook creation against PUBLIC_BASE_URL. A failure here is
  //    logged, not fatal — the repo stays connected and can be wired up later
  //    via POST /repos/:id/webhook.
  const targetUrl = webhookTargetUrl();
  if (targetUrl) {
    const webhookId = await ensureWebhook(client, owner, name, targetUrl);
    repo = (await repoStore.setWebhook(repo.id, webhookId)) || repo;
  }

  return repo;
}
```

---

## 🔒 Webhook Security

### Why Validate Signatures?

**Without validation:**
```
Attacker → Fake webhook → SecurePR AI
         "Hey, PR #999 opened with malicious code!"
         SecurePR AI: "OK, scanning..."
         [Wastes resources, could inject malicious findings]
```

**With validation:**
```
Attacker → Fake webhook (no valid signature)
         SecurePR AI: "Invalid signature! Rejected."
         [Safe]

GitHub → Real webhook (valid HMAC signature)
       SecurePR AI: "Signature verified! Processing..."
```

### How HMAC-SHA256 Works

GitHub HMACs the **raw request body** with the shared secret and sends the digest
as a header:

```
X-Hub-Signature-256: sha256=abc123def456...
```

SecurePR recomputes that digest and compares it in constant time. A plain `===`
would leak the expected digest one byte at a time through response timing, so
the comparison must be timing-safe.

### Current Implementation

```typescript
// backend/src/core/security.ts
export function verifyHmacSha256(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  const theirs = signature.split('sha256=')[1]?.trim() || '';
  const ours = computeHmacSha256(secret, rawBody);

  try {
    return crypto.timingSafeEqual(Buffer.from(ours, 'hex'), Buffer.from(theirs, 'hex'));
  } catch {
    // Length mismatch or non-hex input — timingSafeEqual throws rather than
    // returning false, so a malformed signature is rejected here.
    return false;
  }
}
```

```typescript
// backend/src/api/routes/ingest.ts
router.post('/ingest/github-actions', async (req, res) => {
  // main.ts captures req.rawBody before JSON parsing — the HMAC must be
  // computed over the exact bytes GitHub signed, not a re-serialized object.
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).json({ detail: 'Missing raw body' });
    return;
  }

  // Native GitHub webhooks sign with X-Hub-Signature-256; the GitHub Actions
  // relay path signs with X-SecurePR-Signature.
  const signature = (req.headers['x-hub-signature-256'] ||
                     req.headers['x-securepr-signature']) as string | undefined;
  if (!verifyHmacSha256(settings.securePrIngestSecret, rawBody, signature)) {
    res.status(401).json({ detail: 'Invalid signature' });
    return;
  }

  // ... validate payload, resolve host, enqueue job
});
```

---

## 📦 Payload Structure

### GitHub Pull Request Webhook Payload

```json
{
  "action": "opened",  // or "synchronize", "reopened", "edited"
  "number": 456,
  "pull_request": {
    "id": 123456789,
    "number": 456,
    "state": "open",
    "title": "Add user login endpoint",
    "user": {
      "login": "jsmith",
      "avatar_url": "https://..."
    },
    "head": {
      "sha": "abc123def456...",
      "ref": "feature/login-endpoint",
      "repo": {
        "name": "api-service",
        "full_name": "myorg/api-service"
      }
    },
    "base": {
      "sha": "def456ghi789...",
      "ref": "main"
    },
    "created_at": "2026-05-31T10:30:00Z",
    "updated_at": "2026-05-31T10:30:00Z"
  },
  "repository": {
    "name": "api-service",
    "full_name": "myorg/api-service",
    "owner": {
      "login": "myorg"
    },
    "private": true
  },
  "sender": {
    "login": "jsmith"
  }
}
```

### What SecurePR AI Extracts

`IngestService.validateGithubPayload` (`services/ingest-service.ts`) pulls out
the four fields the pipeline needs, and throws `ValidationError` if any is
missing — a malformed payload is rejected with 400 rather than queued:

```typescript
const [owner, repoName, prNumber, headSha] =
  IngestService.validateGithubPayload(payload);

// owner     ← repository.full_name.split('/')[0]   e.g. "myorg"
// repoName  ← repository.full_name.split('/')[1]   e.g. "api-service"
// prNumber  ← pull_request.number ?? payload.number  e.g. 456
// headSha   ← pull_request.head.sha                  e.g. "abc123..."
```

The sending host is resolved separately, from `X-SecurePR-GitHub-Host` or the
repository URLs in the payload, and checked against `GITHUB_ALLOWED_HOSTS`.

---

## 📤 Export Functionality

### Export Scan Results

Users can export scan results in multiple formats:

#### 1. **JSON Export** (for API consumers)

```typescript
// Frontend: ResultViewerPage
function exportAsJSON(result: ScanResult) {
  const json = JSON.stringify(result, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `securepr-${result.repo}-${result.pr_number}-${Date.now()}.json`;
  a.click();
}
```

**Exported JSON:**
```json
{
  "scan_id": "scan-20260531-001",
  "repo": "myorg/api-service",
  "pr_number": 456,
  "pr_title": "Add user login endpoint",
  "author": "jsmith",
  "scanned_at": "2026-05-31T10:35:22Z",
  "verdict": "FAIL",
  "score": 32,
  "threshold": 15,
  "findings": [
    {
      "severity": "critical",
      "title": "SQL Injection Vulnerability",
      "file": "login.py",
      "line": 45,
      "owasp": "A03:2021 - Injection",
      "description": "...",
      "recommendation": "...",
      "vulnerable_code": "...",
      "safe_fix": "..."
    }
  ]
}
```

#### 2. **CSV Export** (for spreadsheets)

```typescript
function exportAsCSV(findings: Finding[]) {
  const headers = ['Severity', 'File', 'Line', 'Title', 'OWASP', 'Recommendation'];
  const rows = findings.map(f => [
    f.severity,
    f.file_path,
    f.line_start,
    f.title,
    f.owasp_category,
    f.recommendation
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadFile(blob, 'securepr-findings.csv');
}
```

**Exported CSV:**
```csv
Severity,File,Line,Title,OWASP,Recommendation
"critical","login.py","45","SQL Injection Vulnerability","A03:2021","Use parameterized queries"
"critical","auth.py","78","Authentication Bypass","A07:2021","Validate credentials properly"
```

#### 3. **PDF Report** (for management)

```typescript
// Uses jsPDF library
import { jsPDF } from 'jspdf';

function exportAsPDF(result: ScanResult) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('SecurePR AI Security Report', 20, 20);
  
  // Metadata
  doc.setFontSize(12);
  doc.text(`Repository: ${result.repo}`, 20, 40);
  doc.text(`PR #${result.pr_number}: ${result.pr_title}`, 20, 50);
  doc.text(`Verdict: ${result.verdict}`, 20, 60);
  doc.text(`Score: ${result.score} / ${result.threshold}`, 20, 70);
  
  // Findings
  let y = 90;
  result.findings.forEach((f, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${f.title} (${f.severity})`, 20, y);
    y += 10;
    doc.text(`   File: ${f.file_path}:${f.line_start}`, 20, y);
    y += 10;
  });
  
  doc.save(`securepr-report-${result.pr_number}.pdf`);
}
```

#### 4. **Markdown Export** (for documentation)

```typescript
function exportAsMarkdown(result: ScanResult) {
  const md = `
# Security Scan Report - PR #${result.pr_number}

**Repository:** ${result.repo}  
**Title:** ${result.pr_title}  
**Author:** ${result.author}  
**Scanned:** ${result.scanned_at}  
**Verdict:** ${result.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'}  
**Score:** ${result.score} / ${result.threshold}

---

## Findings (${result.findings.length})

${result.findings.map((f, i) => `
### ${i + 1}. ${f.title}

- **Severity:** ${f.severity.toUpperCase()}
- **File:** \`${f.file_path}\` line ${f.line_start}
- **OWASP:** ${f.owasp_category}

**Description:**  
${f.description}

**Recommendation:**  
${f.recommendation}

\`\`\`python
# Vulnerable Code
${f.vulnerable_code}

# Safe Fix
${f.safe_fix}
\`\`\`

---
`).join('\n')}

## Summary

Total findings: ${result.findings.length}
- Critical: ${result.findings.filter(f => f.severity === 'critical').length}
- High: ${result.findings.filter(f => f.severity === 'high').length}
- Medium: ${result.findings.filter(f => f.severity === 'medium').length}
- Low: ${result.findings.filter(f => f.severity === 'low').length}
`;
  
  const blob = new Blob([md], { type: 'text/markdown' });
  downloadFile(blob, `securepr-report-${result.pr_number}.md`);
}
```

---

## 🐛 Troubleshooting

### Issue 1: Webhook Not Receiving Events

**Symptoms:**
- No jobs appearing in queue
- GitHub shows "Recent Deliveries" but no response

**Check:**
```bash
# 1. Verify webhook URL is accessible
curl -X POST https://your-app.com/ingest/github-actions \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 401 (invalid signature) - means endpoint is reachable

# 2. Check GitHub webhook deliveries
# GitHub → Repo → Settings → Webhooks → Recent Deliveries
# Click each delivery to see:
# - Request headers
# - Request body
# - Response status
# - Response body
```

**Solutions:**
- Ensure app is publicly accessible (not localhost)
- Check firewall rules
- Verify SSL certificate (GitHub requires HTTPS in production)
- Use ngrok for local testing: `ngrok http 8000`

### Issue 2: Signature Validation Fails

**Symptoms:**
- Always returns `401 Unauthorized`
- Error: "Invalid signature"

**Check** — compute the expected digest over the same bytes and compare by hand:

```typescript
// Temporary debug inside the route, before verifyHmacSha256:
const expected = 'sha256=' + computeHmacSha256(settings.securePrIngestSecret, rawBody);
console.log('Received:', req.headers['x-hub-signature-256']);
console.log('Expected:', expected);
```

The most common cause is hashing the wrong bytes: `req.body` is the *parsed*
object, and re-serializing it will not reproduce GitHub's payload byte-for-byte.
`main.ts` stores the untouched buffer on `req.rawBody` for exactly this reason.

**Solutions:**
- Verify webhook secret matches in:
  - GitHub webhook settings
  - SecurePR AI `.env` file: `SECUREPR_INGEST_SECRET=your-secret`
- Ensure no whitespace in secret
- Header name: `X-Hub-Signature-256` (GitHub) or `X-SecurePR-Signature` (custom)

### Issue 3: Webhook Times Out

**Symptoms:**
- GitHub shows "Timeout" in Recent Deliveries
- Takes > 10 seconds to respond

**Problem:**
```typescript
// ❌ BAD - heavy work inside the webhook handler
router.post('/ingest/github-actions', async (req, res) => {
  verifySignature(req);

  // Far too slow — diff fetch + LLM analysis can take 30+ seconds
  const diff = await fetchDiff();
  const findings = await runLlmAnalysis(diff);
  await postResults(findings);

  res.json({ ok: true }); // Too late; GitHub already timed out
});
```

**Solution** — this is what the route actually does:
```typescript
// ✅ GOOD - enqueue and return immediately
router.post('/ingest/github-actions', async (req, res) => {
  verifySignature(req);

  // Fast path only: validate, create the job row, enqueue.
  const job = await IngestService.createJob(...);
  await IngestService.enqueueJob(job);

  res.json({ ok: true, queued: true, job_id: job.id });
});

// InProcQueue (queue/manager.ts) polls and runs the pipeline off the request path.
```

### Issue 4: Check Run Not Appearing

**Symptoms:**
- Scan completes but no check shows in GitHub PR

**Check** — try to create the check run directly:

```bash
curl -i -X POST "https://api.github.com/repos/$OWNER/$REPO/check-runs" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -d '{"name":"SecurePR AI","head_sha":"'"$HEAD_SHA"'","status":"in_progress"}'
```

**Solutions:**
- A 403 here is expected with a PAT: `POST /check-runs` is **GitHub App-only**,
  so no PAT scope will make it work. Either install a GitHub App and use its
  installation token, or set `STATUS_REPORTING_MODE=commit_status`, which uses
  the commit status API and works with a PAT. See
  [CHECK_RUN_STATUS.md](./CHECK_RUN_STATUS.md).
- Check rate limits: `curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/rate_limit`

---

## 🎯 Best Practices

### 1. Always Validate Signatures
There is no debug bypass, and there should not be one — an unsigned path is an
open door for forged findings. Verification is unconditional:
```typescript
if (!verifyHmacSha256(settings.securePrIngestSecret, rawBody, signature)) {
  res.status(401).json({ detail: 'Invalid signature' });
  return;
}
```

### 2. Return Quickly (< 10 seconds)
```typescript
const job = await IngestService.createJob(...);
await IngestService.enqueueJob(job);   // hands off to the queue
res.json({ ok: true, queued: true });  // responds in well under a second
```

### 3. Use Idempotency Keys
GitHub retries deliveries, so key on the commit rather than the delivery:
```typescript
// (owner, repo, pr_number, head_sha) identifies the work uniquely —
// a redelivery for the same head SHA should not queue a second scan.
const key = `${owner}/${repo}#${prNumber}@${headSha}`;
```

### 4. Log Everything
```typescript
console.log(`Webhook received: ${owner}/${repo} PR#${prNumber}`);
console.log(`Job queued: ${job.id}`);
console.error('Signature mismatch');  // never log the signature or the secret
```

### 5. Monitor Webhook Health
Not yet implemented — there is no metrics backend wired up. The table below is
the target shape if you add one.

---

## 📊 Webhook Monitoring Dashboard

Recommended metrics to track:

| Metric | Description | Alert If |
|--------|-------------|----------|
| `webhooks.received` | Total webhooks received | Drops to 0 |
| `webhooks.signature_invalid` | Failed signature checks | > 5% |
| `webhooks.processing_time` | Time to return 200 OK | > 5 seconds |
| `jobs.queued` | Jobs added to queue | Drops to 0 |
| `jobs.processed` | Jobs completed | < jobs.queued |

---

**Next Steps:**
1. Review current webhook implementation
2. Add export functionality to UI
3. Set up webhook monitoring
4. Configure GitHub webhooks for repos
5. Test end-to-end flow

