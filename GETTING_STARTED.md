# Getting Started - Complete Guide

Your complete guide to setting up SecurePR AI for GitHub collaboration and cloud deployment.

## 🚀 Overview

This guide walks you through:
1. ✅ **Preparing your codebase** for GitHub
2. ✅ **Setting up GitHub** repository and team access
3. ✅ **Deploying to cloud** (Azure or AWS)
4. ✅ **Team collaboration** with AI assistants
5. ✅ **First deployment** checklist

## 📋 Phase 1: Prepare Codebase (10 minutes)

### Step 1: Review Current State

Your project has been **refactored** with:
- ✅ Clean architecture (interfaces, factories, services)
- ✅ Modular components (split diff viewer)
- ✅ Type safety (TypeScript types organized)
- ✅ Error handling (custom exceptions, error boundaries)
- ✅ Best practices (SOLID, design patterns)

### Step 2: Create .env File

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your actual credentials:
```bash
# Azure OpenAI (or use OpenAI)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# GitHub
GITHUB_TOKEN=ghp_your_personal_access_token
SECUREPR_INGEST_SECRET=$(openssl rand -hex 32)

# Optional
RAG_ENABLED=true
MERGE_GATE_MIN_SEVERITY=HIGH
```

### Step 3: Test Locally

**Backend**:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

## 📋 Phase 2: GitHub Setup (20 minutes)

### Step 1: Initialize Git (if not done)

```powershell
# In project root
git init
git add .
git commit -m "Initial commit: SecurePR AI with refactored architecture"
```

### Step 2: Create GitHub Repository

**Option A: GitHub Web**
1. Go to https://github.com/new
2. Name: `securepr-ai-repo`
3. Visibility: Private (recommended initially)
4. **Don't** initialize with README
5. Create

**Option B: GitHub CLI** (Recommended)
```bash
# Install: https://cli.github.com/
gh auth login
gh repo create securepr-ai-repo --private --source=. --remote=origin --push
```

### Step 3: Configure Repository

```bash
# If using Option A, add remote manually:
git remote add origin https://github.com/YOUR_ORG/securepr-ai-repo.git
git branch -M main
git push -u origin main
```

### Step 4: Set Up Secrets

Go to: `Settings → Secrets and variables → Actions`

**Required for Azure**:
- `AZURE_CREDENTIALS` - Service principal JSON
- `AZURE_OPENAI_KEY`
- `GITHUB_TOKEN` (PAT)
- `SECUREPR_INGEST_SECRET`

**Required for AWS**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `OPENAI_API_KEY` or Bedrock access
- `GITHUB_TOKEN` (PAT)
- `SECUREPR_INGEST_SECRET`

See [SETUP_GITHUB.md](SETUP_GITHUB.md) for detailed instructions.

### Step 5: Enable Branch Protection

`Settings → Branches → Add rule`:
- Branch name: `main`
- ☑️ Require pull request (1 approval)
- ☑️ Require status checks (CI tests)
- ☑️ Require conversation resolution

## 📋 Phase 3: Choose Deployment Platform (5 minutes)

### Quick Decision

**Choose Azure if**:
- ✅ Using Azure OpenAI
- ✅ Want simpler setup
- ✅ Microsoft ecosystem

**Choose AWS if**:
- ✅ Want AWS Bedrock (Claude 3)
- ✅ Existing AWS infrastructure  
- ✅ Need advanced control

**Not sure?** See [docs/DEPLOYMENT_COMPARISON.md](docs/DEPLOYMENT_COMPARISON.md)

## 📋 Phase 4A: Deploy to Azure (30-60 minutes)

### Prerequisites

```bash
# Install Azure CLI
# Windows: winget install Microsoft.AzureCLI
# Mac: brew install azure-cli

# Login
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

### Quick Deploy

```bash
# 1. Create resource group
az group create --name securepr-ai-rg --location eastus

# 2. Create Azure OpenAI (if not exists)
az cognitiveservices account create \
  --name your-openai-resource \
  --resource-group securepr-ai-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# 3. Deploy infrastructure (Terraform)
cd deployment/azure
terraform init
terraform apply

# 4. Or deploy manually
# Follow: docs/DEPLOYMENT_AZURE.md
```

### Verify Deployment

```bash
# Get API URL
az containerapp show \
  --name securepr-api \
  --resource-group securepr-ai-rg \
  --query properties.configuration.ingress.fqdn

# Test health endpoint
curl https://YOUR-APP.azurecontainerapps.io/health
```

## 📋 Phase 4B: Deploy to AWS (30-60 minutes)

### Prerequisites

```bash
# Install AWS CLI
# Windows: winget install Amazon.AWSCLI
# Mac: brew install awscli

# Configure
aws configure
```

### Quick Deploy

```bash
# 1. Enable Bedrock (if using)
# Go to AWS Console → Bedrock → Model access
# Enable: anthropic.claude-3-sonnet

# 2. Deploy infrastructure (Terraform)
cd deployment/aws
terraform init
terraform apply

# 3. Or deploy manually
# Follow: docs/DEPLOYMENT_AWS.md
```

### Verify Deployment

```bash
# Get load balancer DNS
aws elbv2 describe-load-balancers \
  --names securepr-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Test
curl http://YOUR-ALB-DNS/health
```

## 📋 Phase 5: Team Onboarding (Ongoing)

### Invite Team Members

1. **Add to GitHub**:
   ```
   Settings → Collaborators → Add people
   ```

2. **Share Documentation**:
   - README.md - Project overview
   - CONTRIBUTING.md - Development guidelines
   - docs/AI_IMPLEMENTATION_GUIDE.md - AI tools

3. **Setup Slack/Teams**:
   ```
   Create channel: #securepr-ai
   Pin: README, deployment URLs, oncall rotation
   ```

### First Team Meeting Agenda

1. **Demo** (15 min):
   - Show deployed application
   - Demonstrate PR security review
   - Walk through dashboard

2. **Architecture** (15 min):
   - Review CLAUDE.md
   - Explain pipeline flow
   - Show key components

3. **Development** (15 min):
   - Fork & clone workflow
   - Using AI assistants (Claude/Copilot)
   - Code review process

4. **Q&A** (15 min):
   - Team questions
   - Assign first issues

## 📋 Phase 6: First Integration (30 minutes)

### Configure GitHub App

1. **Create GitHub App**:
   ```
   Settings → Developer settings → GitHub Apps → New
   ```

2. **Configure**:
   - Name: SecurePR AI
   - Webhook URL: `https://YOUR-DEPLOYMENT/ingest/github-actions`
   - Webhook secret: (from `SECUREPR_INGEST_SECRET`)
   - Permissions:
     - Pull requests: Read & write
     - Checks: Read & write
     - Contents: Read

3. **Subscribe to events**:
   - ☑️ Pull request
   - ☑️ Pull request review

4. **Install app** on your test repository

### Test Integration

1. **Create test PR**:
   ```bash
   # In a test repo
   echo "password='admin123'" > insecure.py
   git add insecure.py
   git commit -m "test: add insecure code"
   git push origin test-branch
   
   # Create PR via GitHub UI
   ```

2. **Check dashboard**:
   - Queue Monitor: Should show job
   - Result Viewer: Should show findings
   - GitHub PR: Should have comments

## 📋 Quick Reference Commands

### Development

```bash
# Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload

# Frontend  
cd frontend
npm run dev

# Tests
cd backend && pytest
cd frontend && npm test
```

### Deployment

```bash
# Azure
az containerapp update --name securepr-api --resource-group securepr-ai-rg --image ...

# AWS
aws ecs update-service --cluster securepr-cluster --service securepr-api --force-new-deployment

# Docker
docker-compose up -d
docker-compose logs -f
```

### Git Workflow

```bash
# Start feature
git checkout -b feature/my-feature

# Commit
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push origin feature/my-feature
gh pr create
```

## 📚 Next Steps by Role

### **Team Lead**
1. ✅ Set up GitHub repository
2. ✅ Configure branch protection
3. ✅ Deploy to cloud
4. ✅ Create project board
5. ✅ Assign first issues

### **Backend Developer**
1. ✅ Read CLAUDE.md
2. ✅ Review backend architecture
3. ✅ Set up local environment
4. ✅ Take "good first issue"
5. ✅ Learn AI tools (docs/AI_IMPLEMENTATION_GUIDE.md)

### **Frontend Developer**
1. ✅ Review component structure
2. ✅ Set up local environment
3. ✅ Explore UI components
4. ✅ Take UI enhancement issue
5. ✅ Test with mock data

### **DevOps Engineer**
1. ✅ Review deployment docs
2. ✅ Set up CI/CD pipelines
3. ✅ Configure monitoring
4. ✅ Set up alerts
5. ✅ Document runbooks

## 🆘 Troubleshooting

### Issue: Can't push to GitHub

```bash
# Check remote
git remote -v

# Should show your fork
# If not, add it:
git remote set-url origin https://github.com/YOUR_USERNAME/securepr-ai-repo.git
```

### Issue: Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Check .env file exists
ls backend/.env

# Reinstall dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

### Issue: Frontend build fails

```bash
# Clear node_modules
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

### Issue: Deployment fails

**Azure**:
```bash
# Check logs
az containerapp logs show --name securepr-api --resource-group securepr-ai-rg --follow
```

**AWS**:
```bash
# Check ECS tasks
aws ecs describe-tasks --cluster securepr-cluster --tasks TASK_ARN
```

## 📞 Get Help

- 📖 **Documentation**: [docs/](docs/)
- 💬 **Slack**: #securepr-ai
- 🐛 **Issues**: https://github.com/YOUR_ORG/securepr-ai-repo/issues
- 📧 **Email**: team-lead@yourcompany.com

## ✅ Success Checklist

Before considering setup complete:

- [ ] GitHub repository created
- [ ] Team members invited
- [ ] Branch protection enabled
- [ ] CI/CD pipeline running
- [ ] Deployed to cloud (Azure or AWS)
- [ ] Health endpoint returns 200
- [ ] Test PR triggers analysis
- [ ] Dashboard accessible
- [ ] Team has access to docs
- [ ] First team meeting completed
- [ ] At least 2 team members can run locally
- [ ] At least 1 successful PR review

---

**Congratulations! 🎉** You're ready to start securing PRs with AI!

**Recommended next actions**:
1. Integrate with first production repository
2. Create 2-3 RAG knowledge base articles
3. Run security analysis on existing PRs
4. Gather team feedback
5. Iterate and improve!
