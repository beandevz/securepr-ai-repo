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

**Backend implementation:**
```python
# backend/app/api/routes/repos.py
@router.post('/connect')
async def connect_repo(repo_data: RepoConnectionRequest):
    # 1. Extract owner/repo from URL
    owner, repo = parse_github_url(repo_data.repo_url)
    
    # 2. Create webhook via GitHub API
    webhook = await github_client.create_webhook(
        owner=owner,
        repo=repo,
        token=repo_data.token,
        url=f"{settings.webhook_base_url}/ingest/github-actions",
        secret=settings.webhook_secret,
        events=["pull_request", "pull_request_review"]
    )
    
    # 3. Store in database
    db.repos.insert({
        'owner': owner,
        'repo': repo,
        'webhook_id': webhook['id'],
        'webhook_secret': settings.webhook_secret,
        'token': repo_data.token  # encrypted
    })
    
    return {'webhook_id': webhook['id'], 'configured': True}
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

```python
# GitHub generates signature
secret = "your-webhook-secret"
payload = '{"action": "opened", ...}'
signature = hmac.sha256(secret, payload).hexdigest()
# signature = "sha256=abc123def456..."

# Sends in header:
# X-Hub-Signature-256: sha256=abc123def456...

# SecurePR AI verifies
def verify_signature(secret, payload, received_signature):
    expected = "sha256=" + hmac.sha256(secret, payload).hexdigest()
    return hmac.compare_digest(expected, received_signature)
    # compare_digest prevents timing attacks
```

### Current Implementation

```python
# backend/app/core/security.py
import hmac
import hashlib

def verify_hmac_sha256(secret: str, body: bytes, signature: str | None) -> bool:
    """Verify GitHub webhook signature."""
    if not signature:
        return False
    
    # Compute expected signature
    mac = hmac.new(secret.encode(), body, hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    
    # Timing-safe comparison
    return hmac.compare_digest(expected, signature)

# backend/app/api/routes/ingest.py
@router.post('/github-actions')
async def ingest_github_actions(
    req: Request,
    x_securepr_signature: str | None = Header(default=None)
):
    raw = await req.body()
    
    # Verify signature
    if not verify_hmac_sha256(settings.securepr_ingest_secret, raw, x_securepr_signature):
        raise HTTPException(status_code=401, detail='Invalid signature')
    
    # Continue processing...
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

```python
# From payload
owner = payload['repository']['owner']['login']  # "myorg"
repo_name = payload['repository']['name']         # "api-service"
pr_number = payload['pull_request']['number']    # 456
head_sha = payload['pull_request']['head']['sha'] # "abc123..."
author = payload['pull_request']['user']['login'] # "jsmith"
title = payload['pull_request']['title']          # "Add user login..."
```

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

**Check:**
```python
# Print received vs expected signature
@router.post('/github-actions')
async def ingest_github_actions(req: Request, x_hub_signature_256: str | None = Header(default=None)):
    raw = await req.body()
    expected = "sha256=" + hmac.new(
        settings.webhook_secret.encode(),
        raw,
        hashlib.sha256
    ).hexdigest()
    
    print(f"Received: {x_hub_signature_256}")
    print(f"Expected: {expected}")
    # Should match exactly
```

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
```python
# ❌ BAD - Doing heavy work in webhook handler
@router.post('/github-actions')
async def ingest(payload):
    verify_signature()
    
    # This is TOO SLOW (can take 30+ seconds)
    diff = fetch_diff_from_github()
    findings = run_llm_analysis(diff)
    post_results_to_github(findings)
    
    return {"ok": True}  # Too late - GitHub already timed out!
```

**Solution:**
```python
# ✅ GOOD - Queue and return immediately
@router.post('/github-actions')
async def ingest(payload):
    verify_signature()
    
    # Fast operations only (< 1 second)
    job = create_job(payload)
    await queue.enqueue(job)
    
    return {"ok": True, "job_id": job.id}  # Returns in < 1 second
    
# Background worker picks up job and does heavy work
```

### Issue 4: Check Run Not Appearing

**Symptoms:**
- Scan completes but no check shows in GitHub PR

**Check:**
```python
# Verify GitHub token has correct permissions
# Token needs: repo, checks:write

# Test check run creation
response = requests.post(
    f"https://api.github.com/repos/{owner}/{repo}/check-runs",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json"
    },
    json={
        "name": "SecurePR AI",
        "head_sha": head_sha,
        "status": "in_progress"
    }
)
print(response.status_code, response.json())
```

**Solutions:**
- Regenerate GitHub token with `checks:write` permission
- Use GitHub App instead of Personal Access Token (recommended)
- Check rate limits: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`

---

## 🎯 Best Practices

### 1. Always Validate Signatures
```python
# NEVER skip signature validation in production
if not settings.debug_mode:
    if not verify_signature(...):
        raise HTTPException(401)
```

### 2. Return Quickly (< 10 seconds)
```python
# Queue heavy work, don't block webhook response
job = create_job(payload)
await queue.enqueue(job)  # Async, non-blocking
return {"queued": True}   # Fast response
```

### 3. Use Idempotency Keys
```python
# Avoid duplicate processing if webhook retries
job_id = f"{owner}-{repo}-{pr_number}-{head_sha}"
if await queue.exists(job_id):
    return {"already_queued": True, "job_id": job_id}
```

### 4. Log Everything
```python
logger.info(f"Webhook received: {owner}/{repo} PR#{pr_number}")
logger.info(f"Job queued: {job_id}")
logger.error(f"Signature mismatch: {x_hub_signature_256}")
```

### 5. Monitor Webhook Health
```python
# Track metrics
metrics.increment('webhooks.received')
metrics.increment('webhooks.signature_valid')
metrics.timing('webhook.response_time', duration_ms)
```

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

