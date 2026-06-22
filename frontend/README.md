# SecurePR Frontend (Vite + React + TypeScript)

A lightweight developer UI for SecurePR backend.

## Features
- Health check against /health
- Webhook simulator for /ingest/github-actions
- Browser-side HMAC SHA-256 signature generator

## Requirements
- Node.js 20+ and npm

## Setup
1) Go to the frontend folder:

   cd frontend

2) Install dependencies:

   npm install

3) Create .env from template:

   cp .env.example .env

4) Start dev server:

   npm run dev

The UI runs on http://localhost:5173

## Backend CORS note
Recommended: use proxy mode:
- VITE_API_BASE_URL=/api
- VITE_PROXY_TARGET=http://localhost:8000

Then requests to /api/* are proxied to backend.

## Test flow (end-to-end)

**Step 1** — Start backend:
```bash
cd backend && npm run dev
```

**Step 2** — Start frontend:
```bash
npm run dev
```

**Step 3** — Open: http://localhost:5173/rag

**Step 4** — Paste content:
```
Always use parameterized queries to avoid SQL Injection.
Never trust user input.
Validate and sanitize all inputs.
```

**Step 5** — Click "Ingest"