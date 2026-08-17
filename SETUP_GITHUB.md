# GitHub Setup Guide

Complete guide to set up this project on GitHub for team collaboration.

## 📝 Step-by-Step GitHub Setup

### 1. Initialize Git Repository (if not already done)

```bash
cd c:\projects\securepr-ai-repo

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: SecurePR AI codebase with refactored architecture"
```

### 2. Create GitHub Repository

**Option A: Via GitHub Web Interface**

1. Go to https://github.com/new
2. Repository name: `securepr-ai-repo`
3. Description: "AI-powered pull request security review system"
4. Visibility: Private (or Public)
5. **Don't initialize** with README, .gitignore, or license (we have them)
6. Click "Create repository"

**Option B: Via GitHub CLI**

```bash
# Install GitHub CLI if not already
# Windows: choco install gh
# Mac: brew install gh

# Authenticate
gh auth login

# Create repository
gh repo create securepr-ai-repo \
  --private \
  --description "AI-powered pull request security review system" \
  --source=. \
  --remote=origin \
  --push
```

### 3. Add Remote and Push

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_ORG/securepr-ai-repo.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4. Configure Repository Settings

#### a. Branch Protection

Go to: Settings → Branches → Add rule

**Main branch protection**:
- Branch name pattern: `main`
- ☑️ Require a pull request before merging
  - ☑️ Require approvals: 1
  - ☑️ Dismiss stale PR approvals
- ☑️ Require status checks to pass
  - Required checks: `Backend Tests`, `Frontend Tests`, `Security Scan`
- ☑️ Require conversation resolution
- ☑️ Do not allow bypassing the above settings

#### b. Set Default Branch

Settings → General → Default branch: `main`

#### c. Enable GitHub Actions

Settings → Actions → General:
- ☑️ Allow all actions and reusable workflows

### 5. Configure GitHub Secrets

Settings → Secrets and variables → Actions → New repository secret

**Required secrets**:

**For Azure Deployment**:
```
Name: AZURE_CREDENTIALS
Value: {
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}

Name: OPENAI_API_KEY
Value: your-llm-api-key

Name: OPENAI_BASE_URL
Value: https://your-resource.openai.azure.com/openai/v1
```

**For AWS Deployment**:
```
Name: AWS_ACCESS_KEY_ID
Value: AKIAIOSFODNN7EXAMPLE

Name: AWS_SECRET_ACCESS_KEY
Value: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

Name: AWS_REGION
Value: us-east-1
```

**Common Secrets**:
```
Name: GITHUB_TOKEN
Value: ghp_your_personal_access_token

Name: SECUREPR_INGEST_SECRET
Value: generate_random_32_char_string
```

### 6. Set Up Issue Labels

Settings → Issues → Labels

Create these labels:
- `bug` (red) - Bug reports
- `feature` (blue) - New features
- `enhancement` (green) - Improvements
- `documentation` (yellow) - Documentation updates
- `help wanted` (purple) - Good for new contributors
- `good first issue` (green) - Good for first-time contributors
- `priority: high` (red) - High priority
- `priority: medium` (orange) - Medium priority
- `priority: low` (yellow) - Low priority
- `backend` (gray) - Backend related
- `frontend` (gray) - Frontend related
- `ai-assisted` (blue) - Implemented with AI assistance

### 7. Create Project Board

Projects → New project → Board

**Columns**:
1. **Backlog** - Planned features
2. **To Do** - Ready to work on
3. **In Progress** - Currently being worked on
4. **In Review** - PR submitted, awaiting review
5. **Done** - Completed

### 8. Set Up Team Access

Settings → Collaborators and teams → Add people/teams

**Recommended structure**:
- **Admins**: Full access (2-3 people)
- **Maintainers**: Merge PRs, manage issues (3-5 people)
- **Contributors**: Create branches, submit PRs (all developers)

### 9. Configure Webhooks (Optional)

Settings → Webhooks → Add webhook

**For Slack notifications**:
- Payload URL: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
- Content type: `application/json`
- Events: Pull requests, Issues, Push

### 10. Enable Security Features

Settings → Security:
- ☑️ Dependency graph
- ☑️ Dependabot alerts
- ☑️ Dependabot security updates
- ☑️ Code scanning (use CodeQL)
- ☑️ Secret scanning

## 👥 Team Onboarding

### For New Team Members

Send them this checklist:

```markdown
Welcome to SecurePR AI! 🎉

**Setup Checklist**:
- [ ] Fork the repository
- [ ] Clone your fork locally
- [ ] Add upstream remote
- [ ] Install backend dependencies
- [ ] Install frontend dependencies
- [ ] Copy .env.example to .env
- [ ] Request API keys from team lead
- [ ] Join #securepr-ai Slack channel
- [ ] Read CONTRIBUTING.md
- [ ] Set up Claude Code (optional)
- [ ] Complete first issue with "good first issue" label

**Resources**:
- 📚 README: https://github.com/YOUR_ORG/securepr-ai-repo
- 💬 Slack: #securepr-ai
- 📝 Docs: https://github.com/YOUR_ORG/securepr-ai-repo/tree/main/docs
- 🤖 AI agent instructions: CLAUDE.md
```

### Quick Start for Contributors

```bash
# 1. Fork on GitHub

# 2. Clone
git clone https://github.com/YOUR_USERNAME/securepr-ai-repo.git
cd securepr-ai-repo

# 3. Add upstream
git remote add upstream https://github.com/YOUR_ORG/securepr-ai-repo.git

# 4. Create branch
git checkout -b feature/my-feature

# 5. Make changes and commit
git add .
git commit -m "feat: add my feature"

# 6. Push to your fork
git push origin feature/my-feature

# 7. Create Pull Request on GitHub
```

## 📋 Issue Templates

Create `.github/ISSUE_TEMPLATE/` directory:

### Bug Report Template

File: `bug_report.md`
```markdown
---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
---

**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**:
- OS: [e.g., Windows 11]
- Python version: [e.g., 3.11.5]
- Node version: [e.g., 18.17.0]

**Additional context**
Any other context about the problem.
```

### Feature Request Template

File: `feature_request.md`
```markdown
---
name: Feature Request
about: Suggest a feature for SecurePR AI
title: '[FEATURE] '
labels: feature
---

**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features.

**Additional context**
Add any other context or screenshots.

**AI Assistant Prompt** (optional)
If you have a prompt for Claude/Copilot to implement this:
```

## 🔄 Workflow Examples

### Creating a Release

```bash
# 1. Update version in files
# - backend/pyproject.toml
# - frontend/package.json

# 2. Update CHANGELOG.md

# 3. Commit changes
git add .
git commit -m "chore: bump version to 1.0.0"

# 4. Create tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# 5. Push tag
git push origin v1.0.0

# 6. Create GitHub Release
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "Release notes here"
```

### Hotfix Workflow

```bash
# 1. Branch from main
git checkout main
git pull upstream main
git checkout -b hotfix/critical-bug

# 2. Fix and test
# ... make changes ...

# 3. Commit
git commit -m "fix: resolve critical security vulnerability"

# 4. Push and create PR
git push origin hotfix/critical-bug
gh pr create --title "Hotfix: Critical Security Fix" --base main

# 5. After merge, tag release
git checkout main
git pull
git tag -a v1.0.1 -m "Hotfix release"
git push origin v1.0.1
```

## 📊 Monitoring Repository Health

Weekly check:
- [ ] Review open PRs (target: < 5 open)
- [ ] Triage new issues
- [ ] Check CI/CD pipeline success rate
- [ ] Review security alerts
- [ ] Update dependencies
- [ ] Review team velocity

## 🎓 Training Resources

Share with team:
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)

## 🆘 Troubleshooting

### Common Issues

**Problem**: Push rejected
```bash
# Solution: Pull and rebase
git pull --rebase upstream main
git push origin your-branch
```

**Problem**: Merge conflicts
```bash
# Solution: Resolve conflicts
git fetch upstream
git rebase upstream/main
# Resolve conflicts in files
git add .
git rebase --continue
```

**Problem**: Forgot to branch from main
```bash
# Solution: Move commits to new branch
git branch feature/my-feature
git reset --hard upstream/main
git checkout feature/my-feature
```

---

**Next Steps**: After setup, share repository URL with team and start creating issues from the project backlog!
