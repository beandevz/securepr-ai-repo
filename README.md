# SecurePR AI - Shift Left Security. Detect Early. Ship Secure.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)

AI-powered pull request security review system that detects vulnerabilities, insecure coding patterns, and misconfigurations **before code is merged**.

## 🚀 Features

- **🔍 Automated Security Analysis**: Detects SQLi, XSS, SSRF, IDOR, hardcoded secrets, broken auth
- **💬 Inline PR Comments**: Contextual feedback directly on vulnerable code lines
- **📊 Severity Classification**: CRITICAL, HIGH, MEDIUM, LOW with OWASP Top 10 mapping
- **🧠 RAG-Enhanced**: Knowledge base retrieval for context-aware analysis
- **⚡ Real-time Processing**: Webhook-triggered instant analysis
- **🎯 Merge Gating**: Configurable severity thresholds to block risky PRs
- **📈 Dashboard UI**: Monitor queue, view results, manage RAG knowledge base

## 📋 Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Team Collaboration](#team-collaboration)
- [Contributing](#contributing)
- [License](#license)

## 🏗️ Architecture

```
GitHub PR → Webhook → API → Queue → Security Analysis → LLM Review → PR Comments
                                ↓
                           RAG Retrieval (Knowledge Base)
```

**Components**:
- **Backend**: FastAPI (Python) - Webhook ingestion, analysis pipeline, LLM orchestration
- **Frontend**: React + TypeScript - Dashboard for monitoring and management
- **LLM**: Azure OpenAI / OpenAI GPT-4 - Contextual security analysis
- **Vector DB**: ChromaDB - RAG knowledge base for security patterns
- **Queue**: In-process or Azure Service Bus - Job processing
- **VCS**: GitHub integration (GitLab/Azure DevOps ready via adapter pattern)

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Azure OpenAI API key (or OpenAI key)
- GitHub Personal Access Token

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_ORG/securepr-ai-repo.git
cd securepr-ai-repo
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Run Application

**Backend**:
```bash
cd backend
uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm run dev
```

Access UI at: `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

Create `.env` in `backend/` directory:

```bash
# Required
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# GitHub
GITHUB_TOKEN=ghp_your_token_here
SECUREPR_INGEST_SECRET=change_me_to_random_string

# Optional
RAG_ENABLED=true
MERGE_GATE_MIN_SEVERITY=HIGH
MAX_INLINE_COMMENTS=12
```

See `backend/.env.example` for all options.

## 🚀 Deployment

### Azure Deployment

See [docs/DEPLOYMENT_AZURE.md](docs/DEPLOYMENT_AZURE.md) for:
- Azure Container Apps setup
- Azure Service Bus integration
- Azure OpenAI configuration
- CI/CD with GitHub Actions

**Quick Deploy**:
```bash
cd deployment/azure
terraform init
terraform apply
```

### AWS Deployment

See [docs/DEPLOYMENT_AWS.md](docs/DEPLOYMENT_AWS.md) for:
- ECS Fargate setup
- SQS integration
- Bedrock/OpenAI configuration
- CI/CD with GitHub Actions

**Quick Deploy**:
```bash
cd deployment/aws
terraform init
terraform apply
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 👥 Team Collaboration

### For Team Members

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/securepr-ai-repo.git
   cd securepr-ai-repo
   git remote add upstream https://github.com/YOUR_ORG/securepr-ai-repo.git
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes & Test**:
   ```bash
   # Backend tests
   cd backend && pytest

   # Frontend tests
   cd frontend && npm test

   # Type checking
   cd frontend && npm run type-check
   ```

4. **Submit PR**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Using AI Assistants (Claude/Copilot)

See [docs/AI_IMPLEMENTATION_GUIDE.md](docs/AI_IMPLEMENTATION_GUIDE.md) for:
- Task breakdown for AI pair programming
- Prompt templates for Claude Code
- GitHub Copilot integration
- Best practices for AI-assisted development

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Security Analysis Guide](docs/SECURITY_ANALYSIS.md)
- [RAG Knowledge Base](docs/RAG_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install development dependencies
cd backend && pip install -r requirements-dev.txt
cd frontend && npm install

# Run tests
pytest                    # Backend
npm test                  # Frontend

# Code formatting
black backend/app         # Python
npm run format           # Frontend
```

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- OWASP Top 10 for security categorization
- GitHub for VCS integration patterns
- Azure OpenAI for LLM capabilities

## 📞 Support

- 📧 Email: hoang.lephanminh@vn.bosch.com | trong.lecongnguyen@vn.bosch.com | huong.nguyenthi@vn.bosch.com
- 💬 Slack: #securepr-ai
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_ORG/securepr-ai-repo/issues)

---

**Built with ❤️ for secure software development**
