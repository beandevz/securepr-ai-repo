# Getting Started with SecurePR AI

This guide walks you through setting up SecurePR AI for local development.

## 📋 Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |
| Git | Latest | `git --version` |

## 🚀 Quick Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/securepr-ai-repo.git
cd securepr-ai-repo

# Run setup script
chmod +x setup.sh
./setup.sh
```

Or set up manually:

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

## 🏃 Running the Application

### Start Backend (Port 8000)

```bash
cd backend
npm run dev
```

The backend runs with hot-reload using `tsx watch`.

### Start Frontend (Port 5173)

```bash
cd frontend
npm run dev
```

### Verify Everything Works

```bash
# Health check
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# List jobs
curl http://localhost:8000/jobs
# Expected: []
```

Access the dashboard at: **http://localhost:5173**

## 🔧 Configuration

### Required Environment Variables

Create `backend/.env` with:

```bash
# Webhook Security
SECUREPR_INGEST_SECRET=change_me_to_random_string

# GitHub
GITHUB_TOKEN=ghp_your_token_here

# LLM (set to 'none' for development without Azure)
LLM_PROVIDER=none

# Queue
QUEUE_PROVIDER=inproc
```

### Optional - Enable Azure OpenAI

```bash
LLM_PROVIDER=azure_openai
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-10-21
```

### Optional - Enable RAG

```bash
RAG_ENABLED=true
RAG_DB_PATH=rag.db
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

> **Note**: RAG works without Azure OpenAI using local hash-based embeddings (for testing). For production semantic search, configure Azure OpenAI embeddings.

See `backend/.env.example` for all options.

## 📁 Project Structure

```
securepr-ai-repo/
├── backend/                    # Node.js/Express + TypeScript backend
│   ├── src/
│   │   ├── api/routes/         # Express route handlers
│   │   ├── core/               # Settings, HMAC security
│   │   ├── domain/             # Type definitions (Finding, Severity, etc.)
│   │   ├── integrations/       # GitHub, Azure OpenAI clients
│   │   ├── interfaces/         # Provider interfaces
│   │   ├── queue/              # In-process queue + job store
│   │   ├── rag/                # SQLite-backed RAG vector store
│   │   ├── services/           # Business logic
│   │   │   ├── analyzers/      # Security analyzers (Strategy pattern)
│   │   │   └── pipeline/       # Pipeline stages (Chain of Responsibility)
│   │   ├── utils/              # Severity, formatters
│   │   ├── exceptions.ts       # Error hierarchy
│   │   └── main.ts             # Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # API client
│   │   ├── pages/              # Page components
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utilities
│   ├── package.json
│   └── vite.config.ts
├── deployment/docker/          # Dockerfiles + nginx config
├── docs/                       # Documentation
├── docker-compose.yml
├── CLAUDE.md                   # AI agent instructions
└── README.md
```

## 🧪 Development Commands

### Backend

```bash
cd backend

npm run dev         # Start with hot-reload (tsx watch)
npm run build       # Compile TypeScript to dist/
npm run start       # Run compiled production build
npm run typecheck   # Type check without emit
```

### Frontend

```bash
cd frontend

npm run dev         # Start Vite dev server
npm run build       # Production build
npm run preview     # Preview production build
```

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/ingest/github-actions` | Webhook ingest (HMAC verified) |
| `GET` | `/jobs` | List all jobs |
| `GET` | `/jobs/:jobId` | Get job details |
| `DELETE` | `/jobs/:jobId` | Delete a job |
| `GET` | `/github/status/:owner/:repo/:sha` | Get commit status |
| `POST` | `/rag/ingest/text` | Ingest text documents |
| `POST` | `/rag/ingest/files` | Upload files (PDF, text) |
| `POST` | `/rag/search` | Search RAG knowledge base |

## 🛠️ Troubleshooting

### Issue: Backend won't start

```bash
# Check Node.js version
node -v  # Should be 20+

# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

# Check .env exists
ls backend/.env
```

### Issue: TypeScript errors

```bash
cd backend
npm run typecheck  # Shows all type errors
```

### Issue: Frontend can't connect to backend

Check `frontend/.env`:
```
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8000
```

Ensure the backend is running on port 8000.

## 🎯 Next Steps

### **Backend Developer**
1. ✅ Set up local environment
2. ✅ Review backend architecture in `CLAUDE.md` §3.1
3. ✅ Explore `src/services/pipeline/` for the analysis pipeline
4. ✅ Add a new analyzer (see `CLAUDE.md` §6.1)

### **Frontend Developer**
1. ✅ Set up local environment
2. ✅ Review frontend architecture in `CLAUDE.md` §3.2
3. ✅ Explore `src/pages/` for existing pages
4. ✅ Add a new page (see `CLAUDE.md` §6.4)
