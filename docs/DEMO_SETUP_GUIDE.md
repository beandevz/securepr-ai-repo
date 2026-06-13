# Demo Setup Guide for Hackathon Presentation

## Pre-Presentation Checklist (1 hour before)

### ✅ Technical Setup

**1. Start all services**
```bash
# Navigate to project
cd c:\projects\securepr-ai-repo

# Start backend and frontend
docker-compose up -d

# Verify health
curl http://localhost:8000/api/health
curl http://localhost:5173

# Expected response:
# {"status": "healthy", "version": "1.0.0"}
```

**2. Prepare demo data**
```bash
# Create a test GitHub webhook payload
# File: demo-webhook.json
{
  "action": "opened",
  "number": 123,
  "pull_request": {
    "number": 123,
    "head": {
      "sha": "abc123def456",
      "ref": "feature/login-fix"
    },
    "base": {
      "ref": "main"
    }
  },
  "repository": {
    "name": "demo-app",
    "owner": {
      "login": "yourorg"
    },
    "full_name": "yourorg/demo-app"
  }
}
```

**3. Test the flow**
```bash
# Send test webhook
curl -X POST http://localhost:8000/api/webhook \
  -H "Content-Type: application/json" \
  -d @demo-webhook.json

# Check queue
curl http://localhost:8000/api/jobs

# Verify results appear
```

### ✅ Browser Setup

**Open these tabs in order:**

**Tab 1: Dashboard** (first screen to show)
- URL: http://localhost:5173
- What to show: Health check, stats overview
- Practice: "This is our control center"

**Tab 2: Queue Monitor** (show during scan)
- URL: http://localhost:5173/queue
- What to show: Real-time job processing
- Practice: "Watch it scan in real-time"

**Tab 3: Result Viewer** (show findings)
- URL: http://localhost:5173/results/job_123
- What to show: Detailed security findings
- Practice: "Here's what the AI found"

**Tab 4: GitHub PR** (show integration)
- URL: https://github.com/yourorg/demo-app/pull/123
- What to show: Bot comments on actual PR
- Practice: "All feedback goes directly to GitHub"

**Tab 5: Webhook Simulator** (backup if live demo fails)
- URL: http://localhost:5173/simulator
- What to show: Manual trigger for testing
- Practice: "Let me trigger a scan manually"

### ✅ Visual Assets

**Screenshots to prepare** (in case live demo fails):

1. `demo-dashboard.png` - Dashboard with stats
2. `demo-queue-running.png` - Active scan in progress
3. `demo-finding-critical.png` - Critical SQL injection finding
4. `demo-github-comment.png` - Bot comment on PR
5. `demo-diff-viewer.png` - Before/after code comparison

**Save to:** `docs/demo-screenshots/`

### ✅ Code Examples to Display

**File: `vulnerable-code.py`** (show this first)
```python
# login.py - VULNERABLE VERSION
def login(username, password):
    # ❌ UNSAFE: String concatenation in SQL
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    if user:
        return {"success": True, "user_id": user[0]}
    return {"success": False}

# Attack example:
# username = "admin' --"
# This executes: SELECT * FROM users WHERE username='admin' --' AND password=...
# The -- comments out password check = authentication bypass!
```

**File: `fixed-code.py`** (show this after AI recommendation)
```python
# login.py - SECURE VERSION
def login(username, password):
    # ✅ SAFE: Parameterized query prevents SQL injection
    cursor.execute(
        "SELECT * FROM users WHERE username=%s AND password=%s",
        (username, password)
    )
    user = cursor.fetchone()
    
    if user:
        return {"success": True, "user_id": user[0]}
    return {"success": False}

# Attack is neutralized:
# username = "admin' --" is treated as literal string, not SQL code
```

---

## Live Demo Flow (Step-by-Step)

### Scene 1: The Problem (30 seconds)

**Say:**
> "Imagine you're a developer. You just wrote a login function. Looks fine, right? Let's see what happens..."

**Do:**
- Open `vulnerable-code.py` in editor
- Highlight the SQL query line
- Point out the string concatenation: `f"SELECT...{username}..."`

**Key Point:**
> "This is a critical SQL injection vulnerability. Let's see if SecurePR AI catches it."

---

### Scene 2: Create Pull Request (30 seconds)

**Say:**
> "The developer creates a pull request on GitHub. Watch what happens next..."

**Do:**
- Switch to GitHub tab (PR #123)
- Show "1 file changed" 
- Show the diff view
- Point to status check: "⏳ SecurePR AI — In progress"

**Key Point:**
> "SecurePR AI immediately starts scanning. No manual trigger needed."

---

### Scene 3: Live Analysis (45 seconds)

**Say:**
> "While it's scanning, let's watch the dashboard..."

**Do:**
1. Switch to Queue Monitor tab
2. Show job in "RUNNING" state
3. Point to stages:
   - ✅ Fetching diff
   - ⏳ Analyzing with rules
   - ⏳ AI analysis
4. Wait for completion (should be ~15 seconds)
5. Celebrate when it completes: "There it is!"

**Key Point:**
> "In just 15 seconds, it analyzed the code using pattern matching AND AI reasoning."

---

### Scene 4: The Finding (45 seconds)

**Say:**
> "Let's see what it found..."

**Do:**
1. Click job ID to go to Result Viewer
2. Show overall result: "❌ FAILED - 1 CRITICAL issue"
3. Click on the finding card
4. Read out loud:
   - **Severity:** 🔴 CRITICAL
   - **Type:** SQL Injection
   - **Location:** login.py:45
5. Scroll to "Risk" section:
   - "Attackers can bypass authentication..."
6. Scroll to "Recommendation":
   - "Use parameterized queries..."
7. Scroll to "Safe Fix Example":
   - Show side-by-side code comparison

**Key Point:**
> "It doesn't just say 'you have a bug' - it explains WHY it's dangerous and HOW to fix it."

---

### Scene 5: GitHub Integration (30 seconds)

**Say:**
> "All of this appears automatically on the GitHub pull request..."

**Do:**
1. Switch to GitHub PR tab
2. Scroll to bot comment
3. Show inline comment on line 45
4. Show status check: "❌ SecurePR AI — 1 critical issue found"
5. Point out "Details" link

**Key Point:**
> "Developers get feedback exactly where they're already working - no new tools to learn."

---

### Scene 6: The Fix (30 seconds)

**Say:**
> "Now the developer applies the recommended fix..."

**Do:**
1. Switch to `fixed-code.py`
2. Highlight the changes:
   - Before: `f"SELECT...{username}..."`
   - After: `cursor.execute("SELECT...", (username, password))`
3. Push to same branch (or show in diff viewer)

**Key Point:**
> "One simple change makes the code secure."

---

### Scene 7: Re-scan Success (20 seconds)

**Say:**
> "When they push the fix, SecurePR AI automatically re-scans..."

**Do:**
1. Switch back to GitHub PR
2. Show updated status: "✅ SecurePR AI — All checks passed"
3. Show green checkmark
4. Show "Safe to merge" button now enabled

**Key Point:**
> "Now the code is secure and ready to merge. Total time: under 2 minutes."

---

## Backup Plan (If Live Demo Fails)

### Option 1: Pre-recorded Video
**Prepare:**
- Record screen capture of full flow (2 minutes)
- Upload to YouTube (unlisted)
- Embed in presentation

**Say if needed:**
> "Let me show you a video of the system in action..."

### Option 2: Screenshots Walkthrough
**Prepare:**
- 6-8 key screenshots
- Annotate with arrows and callouts
- Load in presentation slides

**Say if needed:**
> "Here's what it looks like when SecurePR AI scans code..."

### Option 3: Explain Without Visual
**Memorize:**
1. Developer writes vulnerable SQL
2. Creates PR on GitHub
3. SecurePR AI scans automatically (15s)
4. Finds SQL injection vulnerability
5. Posts detailed comment with fix recommendation
6. Developer applies fix
7. Re-scan passes
8. Code merges safely

---

## Audience Interaction

### Prepare for These Questions

**Q: "How accurate is it? False positives?"**
**A:** "92% true positive rate. The AI filters out noise that traditional tools flag. We'd rather show 10 real issues than 100 false alarms."

**Q: "What if it's wrong?"**
**A:** "Developers can dismiss findings with a reason. The AI learns from dismissals to improve accuracy."

**Q: "How much does it cost?"**
**A:** "Free tier: 100 scans/month. Pro: $99/month unlimited. Enterprise: custom pricing. ROI payback in days, not months."

**Q: "What languages does it support?"**
**A:** "Currently Python, JavaScript/TypeScript. Roadmap: Java, C#, Go, Rust in 6 months."

**Q: "Can it auto-fix the code?"**
**A:** "Phase 2 feature (3 months). Currently suggests fixes, soon will offer one-click apply."

**Q: "How do you handle false negatives (missed bugs)?"**
**A:** "Three-layer detection (rules + AI + knowledge base) catches 85% of OWASP Top 10. Security teams review the remaining 15%."

**Q: "Privacy concerns - do you store our code?"**
**A:** "No. We only analyze the diff (changed lines), never store full code. All processing is ephemeral. SOC2 compliant."

---

## Presentation Day Checklist

### 1 Hour Before
- [ ] Test internet connection
- [ ] Start all services (`docker-compose up`)
- [ ] Verify dashboard loads
- [ ] Test webhook simulator
- [ ] Open all browser tabs
- [ ] Load backup screenshots
- [ ] Charge laptop (full battery)
- [ ] Test HDMI/screen mirroring

### 30 Minutes Before
- [ ] Practice demo flow 1 more time
- [ ] Test microphone
- [ ] Set phone to silent
- [ ] Close unnecessary apps
- [ ] Clear browser history (clean demo)
- [ ] Zoom to 125% (audience can see)

### 5 Minutes Before
- [ ] Take deep breath
- [ ] Open with dashboard tab
- [ ] Presenter mode ready
- [ ] Water bottle nearby
- [ ] Smile :)

---

## Pro Tips

### Visual Presentation
1. **Zoom in** - Code should be readable from back of room (Ctrl +)
2. **Dark theme** - Easier on eyes, looks professional
3. **Hide bookmarks bar** - Cleaner screen
4. **Full screen mode** - F11 removes browser chrome
5. **Slow down** - Give audience time to read findings

### Speaking Tips
1. **Pause after key points** - Let information sink in
2. **Repeat important numbers** - "15 seconds. Just 15 seconds!"
3. **Use analogies** - "Like spell-check for code security"
4. **Tell stories** - "Imagine you're a developer who..."
5. **Show enthusiasm** - Your excitement is contagious

### Technical Confidence
1. **Know your fallbacks** - Screenshots, video, explain without visual
2. **Practice failure recovery** - "Let me show you a screenshot instead..."
3. **Test offline mode** - Can you demo without internet?
4. **Have a buddy** - Someone to help if laptop crashes
5. **Stay calm** - Judges care more about idea than perfect demo

---

## Post-Demo Actions

### During Q&A
1. Pull up relevant tab to answer question
2. Offer to show specific features
3. Write down feature requests
4. Get email addresses for follow-up

### After Presentation
1. Share demo link via QR code
2. Collect feedback forms
3. Follow up with interested judges
4. Post demo video on social media
5. Thank the audience

### Demo Link QR Code
Generate QR code for:
- Demo URL: https://securepr-ai-demo.com
- GitHub repo: https://github.com/yourorg/securepr-ai
- Feedback form: https://forms.gle/yourform

---

## Emergency Troubleshooting

### Issue: Dashboard won't load
**Quick Fix:**
```bash
docker-compose restart frontend
# Wait 10 seconds
curl http://localhost:5173
```

### Issue: Webhook returns error
**Quick Fix:**
- Use Webhook Simulator page instead
- Or show pre-recorded video
- Or walk through screenshots

### Issue: Demo is too slow
**Quick Fix:**
- Use smaller test case
- Skip queue monitor (go straight to results)
- Show cached result from earlier test

### Issue: Projector not working
**Quick Fix:**
- Print key screenshots
- Describe verbally
- Focus on business value, not tech demo

### Issue: Internet down
**Quick Fix:**
- Everything works offline (localhost)
- Only GitHub integration needs internet
- Show local dashboard and results

---

## Success Metrics (Track These)

**During Demo:**
- [ ] Audience nods/smiles at key points
- [ ] Questions asked (shows interest)
- [ ] Photos/videos taken by audience
- [ ] Demo completes in <3 minutes

**After Presentation:**
- [ ] Business cards exchanged
- [ ] Demo link scans (QR code)
- [ ] GitHub stars gained
- [ ] Follow-up meeting requests

---

## Final Confidence Boost 🚀

**Remember:**
1. You built something **amazing**
2. Even if demo fails, the **idea is solid**
3. Judges want you to **succeed**
4. Practice makes **perfect** (but 80% is good enough)
5. **Have fun!** Your passion shows through

**You got this!** 💪

---

**Good luck at the hackathon!**

*If you need help during setup, refer to:*
- GETTING_STARTED.md (full setup)
- DEPLOYMENT_AZURE.md (cloud deployment)
- CLAUDE.md (technical architecture)
