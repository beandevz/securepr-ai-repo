# Frontend Development Guide

## Development Modes

### Mode 1: Mock API (Frontend-only development)
**Use when**: Backend is not running, or you want to work on UI without API calls.

```bash
# In .env, set:
VITE_USE_MOCK_API=true
```

- ✅ No API calls made
- ✅ Mock data used immediately
- ✅ No network errors in console
- ✅ Fast UI iteration

### Mode 2: Real API with Proxy (Full-stack development)
**Use when**: Backend is running on `http://localhost:8000`.

```bash
# In .env, set:
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8000
VITE_USE_MOCK_API=false
```

- ✅ Vite dev server proxies `/api/*` to backend
- ✅ No CORS issues
- ✅ Real API responses
- ⚠️ Backend must be running

### Mode 3: Direct API (Backend with CORS enabled)
**Use when**: Backend enables CORS for your origin.

```bash
# In .env, set:
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=false
```

- ⚠️ Backend must have CORS configured
- ✅ Simpler setup (no proxy)

---

## Current Pages Supporting Mock Mode

✅ **QueueMonitorPage** - Shows mock jobs when `VITE_USE_MOCK_API=true`  
✅ **ResultViewerPage** - Shows mock result when `VITE_USE_MOCK_API=true`

**Other pages** (RAG, Webhook Simulator, Health) still make real API calls regardless of mock flag.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | Backend API base URL |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Proxy target (Vite config) |
| `VITE_USE_MOCK_API` | `false` | Enable mock data mode |

---

## Troubleshooting

### Issue: Still seeing API errors in console
**Solution**: Check `.env` has `VITE_USE_MOCK_API=true` and restart Vite dev server.

### Issue: Mock data not appearing
**Solution**: 
1. Verify `VITE_USE_MOCK_API=true` in `.env`
2. Restart dev server (`npm run dev`)
3. Clear browser localStorage and refresh

### Issue: Backend returns 404 for `/api/jobs`
**Solution**: Backend `/jobs` endpoint not implemented yet. Use mock mode or implement backend endpoint.

---

## Adding Mock Support to New Pages

```typescript
// 1. Define mock data
const MOCK_DATA = { ... };

// 2. Load settings with useMockApi
const { apiBaseUrl, useMockApi } = loadSettings();

// 3. Skip API call if mock enabled
if (useMockApi) {
  setData(MOCK_DATA);
  return;
}

// 4. Fallback to mock on error
fetch(url)
  .then(...)
  .catch(() => setData(MOCK_DATA));
```
