# Contributing to SecurePR AI

Thank you for your interest in contributing to SecurePR AI! This guide will help you get started.

## 📋 Prerequisites

- Node.js 20+
- npm 10+
- Git

## 🚀 Development Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Edit with your API keys
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 🔄 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow the project structure:

```
backend/src/
├── api/routes/         # Express route handlers
├── core/               # Settings, security
├── domain/             # Types, models
├── integrations/       # External service clients
├── interfaces/         # Provider interfaces
├── queue/              # Queue management
├── rag/                # RAG vector store
├── services/           # Business logic
│   ├── analyzers/      # Security analyzers (Strategy pattern)
│   └── pipeline/       # Pipeline stages (Chain of Responsibility)
├── utils/              # Helpers (severity, formatters)
├── exceptions.ts       # Error hierarchy
└── main.ts             # Entry point
```

### 3. Verify Your Changes

```bash
# Type checking
cd backend && npm run typecheck

# Build
cd backend && npm run build
```

### 4. Submit a Pull Request

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

## 📝 Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 🧪 PR Checklist

Before submitting a PR, ensure:

- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Code follows project patterns (interfaces, factories, pipeline stages)
- [ ] New files use `.ts` extension with proper types
- [ ] Environment variables documented in `.env.example`
- [ ] No hardcoded secrets or credentials

## 🏗️ Architecture Guidelines

### TypeScript (Backend)

- Use strict TypeScript (`strict: true`)
- Define interfaces in `src/interfaces/`
- Use dependency injection at boundaries
- Keep pure functions in `src/utils/`
- Put IO (API calls, DB) in `src/integrations/`

### React (Frontend)

- Keep components thin and presentational
- Business logic goes in hooks (`ui/hooks/`)
- API calls through `ApiClient` class
- Types in `ui/types/`

### Backend Tests

```bash
cd backend && npm run typecheck    # Type checking
cd backend && npm run build        # Full build
```
