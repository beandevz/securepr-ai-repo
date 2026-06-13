# SecurePR AI - New UI Quick Start Guide

## 🚀 Getting Started

### 1. Start the Development Server

```bash
cd frontend
npm install  # If first time
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 📖 Page-by-Page Guide

### 🏠 Dashboard (`/`)

**What you see:**
- 4 stat cards at the top (PRs scanned, issues detected, fixed today, pass rate)
- Recent scans table in the middle
- Weekly issues chart on the right
- Live activity feed below chart

**What you can do:**
- Click any row in "Recent Scans" to view full PR results
- Click "View Queue →" to see all jobs
- Monitor system status in top-right pill

**Example flow:**
```
1. Land on Dashboard
2. See "api-service #456" in recent scans with "3 CRITICAL" tag
3. Click the row
4. → Navigates to Result Detail page
```

---

### 🔗 Connect Repos (`/connect`)

**What you see:**
- Left side: List of connected repositories
- Right side: "Add New Repository" form

**How to connect a repo:**
1. Enter GitHub repository URL (e.g., `https://github.com/myorg/myrepo`)
2. Paste your GitHub Personal Access Token
   - Token needs `repo` and `webhook` permissions
   - Generate at: https://github.com/settings/tokens
3. Click "Connect Repository"
4. Webhook is auto-configured
5. Repository appears in left panel

**Managing connected repos:**
- Click "Configure Webhook" if not set up
- Click "Disconnect" to remove repo
- Check "Last Sync" to see activity

---

### ⏳ Queue (`/queue`)

**What you see:**
- Queue stats at top (Running, Pending, Completed)
- Job cards showing:
  - Repository + PR number
  - Status (running/pending/completed/failed)
  - Progress bar (for running jobs)
  - Result tags (PASS/FAIL with severity)

**What you can do:**
- Click any job card to view results
- Monitor real-time progress
- See queue position for pending jobs

**Status indicators:**
- 🔵 **Running:** Currently scanning (with progress %)
- 🟢 **Completed:** Scan finished (shows result)
- 🔴 **Failed:** Issues found (shows severity)
- ⚪ **Pending:** Waiting in queue (shows position)

---

### 🔍 Result Detail (`/results/:jobId`)

**What you see:**
1. **PR Header:**
   - Repo name, PR title, author
   - PASS/FAIL verdict
   - Merge status (MERGE BLOCKED or READY TO MERGE)

2. **Scoring Breakdown** (if failed):
   ```
   Score Calculation:
     3 Critical × 10 = 30 pts
     1 Medium   × 2  = 2 pts
     Total: 32 pts

   Gate Decision:
     ✅ PASS if: score < 15 AND no CRITICAL
     ❌ FAIL if: any CRITICAL OR score ≥ 15

     → 3 CRITICAL issues found
   ```

3. **Fix All Button:**
   - Applies all auto-fixes at once
   - Shows "⏳ Fixing All..." while processing
   - Changes to "✓ All Fixed" when done

4. **Severity Filters:**
   - All (3)
   - 🔴 Critical (3)
   - 🟡 Medium (0)
   - 🟢 Low (0)

5. **Finding Cards** (expandable):
   - Severity tag
   - Title + file:line
   - Click to expand:
     - What's Wrong (explanation)
     - Vulnerable Code (with syntax highlighting)
     - Safe Fix (recommended code)
     - **"Fix This Issue"** button

**Example flow:**
```
1. Click finding card to expand
2. Read "What's Wrong" explanation
3. See vulnerable code in red
4. See safe fix in green
5. Click "🔧 Fix This Issue"
6. Button changes to "✓ Fixed"
```

**Understanding the score:**
- Each severity has a weight (Critical=10, High=5, Medium=2, Low=1)
- Total score = sum of (count × weight)
- Gate fails if score ≥ 15 OR any CRITICAL exists
- This explains WHY the PR failed, not just that it failed

---

### 💬 GitHub PR View (`/github-pr/:jobId`)

**What you see:**
- Simulated GitHub PR interface
- Top bar with repo breadcrumb
- PR title and metadata (author, files changed, +/-)
- Check run banner (SecurePR AI status)
- Diff files with inline bot comments

**Bot comments show:**
- Severity tag (e.g., "🔴 CRITICAL")
- Risk explanation
- Fix recommendation
- Safe code snippet in green box

**Purpose:**
This page shows developers **exactly how SecurePR AI appears in their GitHub PR**, including:
- Where comments appear (inline on diff lines)
- What the bot avatar looks like
- How fix suggestions are formatted

**Navigation:**
- Click "← Back to Results" to return to Result Detail page

---

### 📚 RAG Manager (`/rag`)

**What you see:**
Three tabs consolidating all RAG functionality:

#### **📤 Upload Tab**
- Drag-and-drop area for files
- Supported formats: PDF, Markdown, Text
- Click to browse files
- Guidelines section explains best practices

**How to upload:**
1. Drag PDF/MD/TXT files to the drop area
2. OR click the area to browse
3. Files auto-process and appear in "Ingest Jobs" tab

**Recommended uploads:**
- OWASP Top 10 guides
- CWE database exports
- Language-specific security guides
- Your team's coding standards

#### **🔍 Search Tab**
- Search input box
- Results show:
  - Content snippet
  - Source (file name + page/line)
  - Relevance score (%)

**How to search:**
1. Enter query (e.g., "SQL injection prevention")
2. Click "🔍 Search" or press Enter
3. Review results sorted by relevance

**Example queries:**
- "XSS mitigation techniques"
- "OWASP A03 injection"
- "secure password hashing"

#### **⚙️ Ingest Jobs Tab**
- List of processing jobs
- Shows:
  - Filename
  - Status (pending/processing/completed/failed)
  - Progress bar (for processing)
  - Chunk count (when completed)

**Job statuses:**
- 🔵 **Processing:** Currently chunking and embedding (with %)
- 🟢 **Completed:** Ready for search (shows chunk count)
- 🔴 **Failed:** Error occurred (shows error)
- ⚪ **Pending:** Waiting in queue

---

## 🎯 Common Workflows

### Workflow 1: First-Time Setup
```
1. Go to "Connect Repos"
2. Enter your first repository URL
3. Generate GitHub token with repo + webhook permissions
4. Paste token and click "Connect Repository"
5. Wait for webhook configuration
6. Go to Dashboard → see first scans appear
```

### Workflow 2: Review a Failing PR
```
1. Dashboard → Click PR row (e.g., "api-service #456")
2. See scoring breakdown (why it failed)
3. Review findings (expand cards)
4. Click "Fix All" or fix individual issues
5. Click "View on GitHub →" to see how it looks
6. Return to Queue to monitor other PRs
```

### Workflow 3: Upload Security Knowledge
```
1. Go to "RAG Manager"
2. Click "Upload" tab
3. Drag OWASP PDF into drop area
4. Switch to "Ingest Jobs" tab
5. Monitor processing (wait for 100%)
6. Switch to "Search" tab
7. Test search: "SQL injection"
8. Verify relevant content appears
```

### Workflow 4: Monitor Active Scans
```
1. Go to "Queue"
2. See running jobs with progress bars
3. Click a running job to view partial results
4. Return to Queue to check others
5. When job completes → notification appears
6. Click completed job to see final results
```

---

## 🎨 Visual Guide

### Color Coding Reference

**Severity:**
- 🔴 **Red:** Critical (score × 10)
- 🟠 **Orange:** High (score × 5)
- 🟡 **Amber:** Medium (score × 2)
- 🟢 **Green:** Low (score × 1)

**Status:**
- 🟢 **Green:** PASS / Active / Completed
- 🔴 **Red:** FAIL / Blocked / Critical
- 🔵 **Blue:** Running / Processing
- ⚪ **Gray:** Pending / Inactive

**Action Buttons:**
- **Blue:** Primary action (Connect, Search, Fix All)
- **Gray outline:** Secondary action (Disconnect, Back)
- **Green:** Success state (✓ Fixed)

---

## 🔧 Troubleshooting

### "Why don't I see any PRs on the Dashboard?"
1. Check "Connect Repos" → ensure repos are connected
2. Verify webhook is configured (green ✓)
3. Open a new PR in your repo to trigger scan
4. Wait 10-30 seconds for scan to appear

### "Fix All button is disabled"
- Already clicked and fixes are applied
- All findings are already fixed
- Refresh the page to reset state

### "RAG search returns no results"
1. Go to "Ingest Jobs" tab
2. Ensure at least one job is "Completed"
3. Wait for processing to finish (100%)
4. Try broader search terms

### "Connected repo shows 'Webhook Not Configured'"
1. Click "Configure Webhook" button
2. Ensure your GitHub token has `webhook` permission
3. Check repo settings → Webhooks → SecurePR AI should appear

---

## 📊 Understanding the Scoring System

### How Scores Work

Each finding has a severity that maps to points:

| Severity | Weight | Example |
|----------|--------|---------|
| Critical | 10 pts | SQL Injection, Hardcoded Secrets |
| High     | 5 pts  | XSS, CSRF vulnerabilities |
| Medium   | 2 pts  | Information Disclosure, Weak Crypto |
| Low      | 1 pt   | Missing Input Validation, Code Quality |

**Total Score = Σ (count × weight)**

Example:
```
2 Critical findings → 2 × 10 = 20 pts
1 High finding     → 1 × 5  = 5 pts
3 Medium findings  → 3 × 2  = 6 pts
Total Score = 31 points
```

### Gate Decision Logic

```
if (any_critical_exists OR total_score >= 15):
    verdict = "FAIL"
    merge_status = "BLOCKED"
else:
    verdict = "PASS"
    merge_status = "READY TO MERGE"
```

**Why threshold = 15?**
- 2 Critical issues = 20 pts → FAIL
- 3 High issues = 15 pts → FAIL
- 7 Medium issues = 14 pts → PASS
- Any Critical = instant FAIL (regardless of score)

You can adjust this threshold in `frontend/src/ui/theme.ts`:
```typescript
export const GATE_THRESHOLD = 15;  // Change this value
```

---

## 🚀 Advanced Tips

### Keyboard Shortcuts
- `Ctrl + K` → Focus search (in RAG Search tab)
- `←` `→` → Navigate between findings
- `Esc` → Close expanded finding card

### Filtering Results
- Use severity filters to focus on critical issues first
- Click "All (X)" to see everything
- Click "🔴 Critical (X)" to see only critical findings

### Batch Operations
- "Fix All" applies all fixes in one transaction
- Fixes are applied in order (Critical → High → Medium → Low)
- If one fix fails, the transaction rolls back

### RAG Best Practices
- Upload multiple sources for better coverage
- Use specific filenames (e.g., `owasp-top10-2021.pdf`)
- Search with specific keywords (e.g., "A03 injection" vs "injection")
- Monitor "Ingest Jobs" to ensure processing completed

---

## 📚 Related Documentation

- [UI Simplification Summary](./UI_SIMPLIFICATION_SUMMARY.md)
- [Before/After Comparison](./BEFORE_AFTER_COMPARISON.md)
- [CLAUDE.md](../CLAUDE.md) - Full project documentation

---

## 🆘 Getting Help

**Issue:** UI doesn't load / white screen
- Check browser console (F12)
- Ensure `npm run dev` is running
- Clear browser cache

**Issue:** Changes not appearing
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Stop dev server and restart
- Clear Vite cache: `rm -rf frontend/node_modules/.vite`

**Issue:** API errors (500, 404)
- Ensure backend is running (`python -m app.main`)
- Check backend logs for errors
- Verify `frontend/src/lib/storage.ts` has correct API URL

---

**Ready to start? Open http://localhost:5173 and explore the new UI! 🎉**
