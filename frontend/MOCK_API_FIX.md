# Fix: Jobs API Keep Running Even with Fallback Mock API

## Problem
The `QueueMonitorPage` was continuously making API calls to the backend every 3 seconds, even when the backend wasn't running. Mock data only appeared *after* each failed request, causing:
- Network errors flooding the console
- Unnecessary API traffic
- Slower page load/refresh
- Confusion about whether backend is required

## Root Cause
- `QueueMonitorPage.tsx` used raw `fetch()` directly
- Mock data was only used as error fallback, not a primary mode
- No way to disable API calls for frontend-only development
- Auto-refresh interval (3s) kept retrying failed requests

## Solution
Added `VITE_USE_MOCK_API` environment variable to enable a true "mock mode" that **prevents** API calls entirely.

### Changes Made

#### 1. Environment Configuration
**Files**: `.env`, `.env.example`
```bash
VITE_USE_MOCK_API=true  # Set to 'true' to use mock data only
```

#### 2. Type Definitions
**File**: `src/vite-env.d.ts` (new)
- Added TypeScript types for Vite environment variables
- Fixes `import.meta.env` type errors

#### 3. Settings Storage
**File**: `src/ui/lib/storage.ts`
- Added `useMockApi: boolean` to `AppSettings` type
- Reads `VITE_USE_MOCK_API` from environment
- Stored in localStorage (user can toggle in Settings page)

#### 4. Settings Page UI
**File**: `src/ui/pages/SettingsPage.tsx`
- Added checkbox to toggle mock API mode
- Persists choice to localStorage
- User-friendly way to switch modes without editing `.env`

#### 5. Queue Monitor Page
**File**: `src/ui/pages/QueueMonitorPage.tsx`
- **Before**: Always calls `fetch()`, falls back to mock on error
- **After**: Checks `useMockApi` flag first, skips API call if enabled
- Mock data defined as `MOCK_JOBS` constant
- Clearer error message: "Failed to load jobs (using mock data)"

#### 6. Result Viewer Page
**File**: `src/ui/pages/ResultViewerPage.tsx`
- Added mock result data (`MOCK_RESULT`)
- Respects `useMockApi` flag
- Falls back to mock on error

#### 7. Finding Type
**File**: `src/ui/types/finding.ts`
- Added missing fields: `category`, `file`, `line_start`, `line_end`, `owasp`, `confidence`
- Fixes type errors in mock data

---

## Usage

### Development Mode (Frontend Only)
```bash
# In .env
VITE_USE_MOCK_API=true

# Start dev server
npm run dev
```
✅ No backend required  
✅ No API calls  
✅ No console errors  
✅ Mock data appears instantly

### Full-Stack Mode (Backend Running)
```bash
# In .env
VITE_USE_MOCK_API=false

# Start backend first
cd backend && npm run dev

# Start frontend
npm run dev
```
✅ Real API responses  
✅ Real-time job updates  
⚠️ Backend must implement `/jobs` endpoint

### Toggle at Runtime
1. Navigate to `/settings`
2. Check/uncheck "Use Mock API"
3. Click "Save"
4. Refresh pages

---

## Files Modified

| File | Change |
|------|--------|
| `.env` | Added `VITE_USE_MOCK_API=true` |
| `.env.example` | Added `VITE_USE_MOCK_API` example |
| `src/vite-env.d.ts` | Created (Vite env types) |
| `src/ui/lib/storage.ts` | Added `useMockApi` field |
| `src/ui/types/finding.ts` | Added missing fields |
| `src/ui/pages/SettingsPage.tsx` | Added mock toggle UI |
| `src/ui/pages/QueueMonitorPage.tsx` | Added mock mode check |
| `src/ui/pages/ResultViewerPage.tsx` | Added mock mode check |

**New files**:
- `DEVELOPMENT.md` - Developer guide for API modes
- `MOCK_API_FIX.md` - This document

---

## Testing

✅ **TypeScript**: All type errors resolved  
✅ **Mock Mode**: Pages load without backend  
✅ **Real Mode**: Pages work with backend running  
✅ **Settings UI**: Toggle persists to localStorage  
✅ **Auto-refresh**: No longer spams failed requests in mock mode

---

## Next Steps (Optional)

1. **Add mock mode to other pages**: RAG, Health, Webhook Simulator
2. **Visual indicator**: Show "MOCK MODE" badge in UI
3. **Mock data generator**: Richer mock data for testing edge cases
4. **Implement backend `/jobs` endpoint**: For real-mode testing

---

## Verification

```bash
# 1. Enable mock mode
echo "VITE_USE_MOCK_API=true" >> .env

# 2. Start frontend only (no backend)
npm run dev

# 3. Visit http://localhost:5173/queue
# Expected: Mock jobs appear immediately, no console errors

# 4. Disable mock mode
# In .env, change to: VITE_USE_MOCK_API=false

# 5. Restart dev server
# Expected: Real API calls (will fail if backend not running)
```
