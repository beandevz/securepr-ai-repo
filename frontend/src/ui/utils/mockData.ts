/**
 * Mock data generators for all SecurePR pages
 */

export const mockWebhookPayload = {
  action: "opened",
  pull_request: {
    number: 42,
    title: "Add user authentication feature",
    user: {
      login: "developer123"
    },
    head: {
      ref: "feature/user-auth",
      sha: "abc123def456"
    },
    base: {
      ref: "main",
      sha: "fedcba654321"
    }
  },
  repository: {
    owner: {
      login: "acme-corp"
    },
    name: "secure-app"
  }
};

export const mockHealthResponse = {
  status: "healthy",
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  services: {
    database: "connected",
    llm: "available",
    rag: "enabled",
    queue: "running"
  }
};

export const mockQueueJobs = [
  {
    id: "job-001",
    status: "completed",
    pr_number: 42,
    repo: "acme-corp/secure-app",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 1800000).toISOString(),
    severity: "High"
  },
  {
    id: "job-002",
    status: "in_progress",
    pr_number: 43,
    repo: "acme-corp/api-server",
    created_at: new Date(Date.now() - 600000).toISOString(),
    severity: "Medium"
  },
  {
    id: "job-003",
    status: "pending",
    pr_number: 44,
    repo: "acme-corp/frontend",
    created_at: new Date(Date.now() - 120000).toISOString(),
    severity: "Low"
  }
];

export const mockResultFindings = [
  {
    title: "SQL Injection vulnerability in user query",
    severity: "Critical",
    file_path: "src/database/users.py",
    line_start: 45,
    line_end: 48,
    description: "Direct string interpolation in SQL query without parameterization",
    recommendation: "Always use parameterized queries to avoid SQL Injection.",
    code_snippet: `def get_user(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return db.execute(query)`,
    owasp_category: "A03:2021 - Injection",
    confidence: 0.95
  },
  {
    title: "Hardcoded secret key detected",
    severity: "High",
    file_path: "config/settings.py",
    line_start: 12,
    line_end: 12,
    description: "Secret key is hardcoded in source code",
    recommendation: "Move secrets to environment variables or secure vault",
    code_snippet: `SECRET_KEY = "django-insecure-@k2v9x!m5#n8p7q4r"`,
    owasp_category: "A02:2021 - Cryptographic Failures",
    confidence: 1.0
  },
  {
    title: "Missing authentication on admin endpoint",
    severity: "High",
    file_path: "src/routes/admin.py",
    line_start: 23,
    line_end: 30,
    description: "Admin route is accessible without authentication",
    recommendation: "Add authentication decorator to admin routes",
    code_snippet: `@app.route('/admin/users')
def list_all_users():
    return jsonify(User.query.all())`,
    owasp_category: "A01:2021 - Broken Access Control",
    confidence: 0.88
  },
  {
    title: "XSS vulnerability in user profile",
    severity: "Medium",
    file_path: "templates/profile.html",
    line_start: 67,
    line_end: 67,
    description: "User input rendered without HTML escaping",
    recommendation: "Use proper template escaping or sanitization",
    code_snippet: `<div>{{ user.bio | safe }}</div>`,
    owasp_category: "A03:2021 - Injection",
    confidence: 0.82
  }
];

export const mockCheckRuns = [
  {
    id: 12345,
    name: "SecurePR Security Review",
    status: "completed",
    conclusion: "action_required",
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 1800000).toISOString(),
    output: {
      title: "Security Review: 4 issues found",
      summary: "Found 1 Critical, 2 High, 1 Medium severity issues",
      annotations_count: 4
    }
  },
  {
    id: 12346,
    name: "SecurePR Security Review",
    status: "in_progress",
    started_at: new Date(Date.now() - 600000).toISOString()
  }
];

export const mockRagDocuments = [
  {
    text: `SQL Injection Prevention:
Always use parameterized queries or prepared statements. Never concatenate user input directly into SQL queries.

Example (SAFE):
cursor.execute("SELECT * FROM users WHERE username = ?", (username,))

Example (UNSAFE):
cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")`,
    source: "OWASP-SQL-Injection-Prevention"
  },
  {
    text: `Cross-Site Scripting (XSS) Prevention:
1. Escape all user-controlled data before rendering in HTML
2. Use Content Security Policy headers
3. Validate and sanitize input on both client and server
4. Use frameworks with auto-escaping enabled by default`,
    source: "OWASP-XSS-Prevention"
  },
  {
    text: `Authentication Best Practices:
- Use strong password hashing (bcrypt, Argon2)
- Implement multi-factor authentication
- Use secure session management
- Never store passwords in plain text
- Implement rate limiting on login endpoints`,
    source: "Secure-Coding-Guide-Auth"
  }
];

export const mockRagSearchResults = {
  ok: true,
  query: "parameterized queries",
  top_k: 4,
  hits: [
    {
      source: "OWASP-SQL-Injection-Prevention",
      score: 0.943,
      text: "Always use parameterized queries or prepared statements. Never concatenate user input directly into SQL queries."
    },
    {
      source: "Secure-Coding-Guide-Database",
      score: 0.821,
      text: "Parameterized queries separate SQL code from data, preventing injection attacks by treating user input as data only."
    },
    {
      source: "Python-Security-Patterns",
      score: 0.756,
      text: "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))"
    }
  ]
};

export const mockPipelineFlow = {
  job_id: "job-001",
  pr_number: 42,
  repo: "acme-corp/secure-app",
  stages: [
    {
      stage: "PR Webhook Received",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "completed",
      data: {
        action: "opened",
        pr_number: 42,
        files_changed: 5
      }
    },
    {
      stage: "Diff Extraction",
      timestamp: new Date(Date.now() - 3540000).toISOString(),
      status: "completed",
      data: {
        files: ["src/database/users.py", "config/settings.py", "src/routes/admin.py"],
        total_lines_added: 123,
        total_lines_removed: 45
      }
    },
    {
      stage: "RAG Retrieval",
      timestamp: new Date(Date.now() - 3480000).toISOString(),
      status: "completed",
      data: {
        query_count: 3,
        relevant_chunks: 8,
        top_sources: ["OWASP-SQL-Injection-Prevention", "Secure-Coding-Guide-Auth"]
      }
    },
    {
      stage: "LLM Analysis",
      timestamp: new Date(Date.now() - 3420000).toISOString(),
      status: "completed",
      data: {
        model: "gpt-4",
        findings_detected: 4,
        tokens_used: 2847,
        analysis_time_ms: 4523
      }
    },
    {
      stage: "PR Comment Published",
      timestamp: new Date(Date.now() - 3360000).toISOString(),
      status: "completed",
      data: {
        comment_id: 987654,
        review_id: 456789,
        findings_reported: 4
      }
    }
  ],
  diff_preview: `diff --git a/src/database/users.py b/src/database/users.py
index 1234567..abcdefg 100644
--- a/src/database/users.py
+++ b/src/database/users.py
@@ -42,7 +42,7 @@ class UserDatabase:

     def get_user(self, username):
-        return self.users.get(username)
+        query = f"SELECT * FROM users WHERE username = '{username}'"
+        return db.execute(query)`,
  rag_context: mockRagSearchResults.hits,
  llm_findings: mockResultFindings,
  final_comment: `## 🔒 SecurePR Security Review

**Overall Severity: Critical** ⚠️

Found **4 security issues** in this PR:
- 🔴 1 Critical
- 🟠 2 High
- 🟡 1 Medium

### Critical Issues
1. **SQL Injection vulnerability in user query** (src/database/users.py:45-48)
   - Always use parameterized queries to avoid SQL Injection.

See detailed findings below.`
};

export const mockSettings = {
  apiBaseUrl: "http://localhost:8000/api",
  githubToken: "ghp_xxxxxxxxxxxxxxxxxxxx",
  webhookSecret: "your-webhook-secret-here",
  enableCheckRuns: true,
  autoPublishReviews: true,
  minSeverityLevel: "Medium"
};
