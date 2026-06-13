# Routing Fix - QueueMonitorPage Navigation

## Issue
When clicking on a job in the Queue Monitor page, the navigation was failing with:
```
No routes matched location "/result/job-001"
```

## Root Cause
**Route mismatch:** The QueueMonitorPage was navigating to `/result/:jobId` (singular), but the new route definition in App.tsx is `/results/:jobId` (plural).

## Fix Applied

### File: `frontend/src/ui/pages/QueueMonitorPage.tsx`

**Before (Line 58):**
```typescript
navigate(`/result/${jobId}`);
```

**After (Line 58):**
```typescript
navigate(`/results/${jobId}`);
```

## Verification

All navigation routes now use the correct `/results/:jobId` pattern:

| File | Line | Status |
|------|------|--------|
| `App.tsx` | 178 | ✅ `/results/:jobId` (route definition) |
| `DashboardPage.tsx` | 403 | ✅ `navigate(/results/${scan.id})` |
| `QueueMonitorPage.tsx` | 58 | ✅ `navigate(/results/${jobId})` (FIXED) |

## Testing

To verify the fix works:

1. Start the dev server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to Queue Monitor page (`/queue`)

3. Click on any job card

4. Should navigate to `/results/:jobId` successfully and show the ResultViewerPageEnhanced component

## Related Routes

Complete route structure:
```typescript
/                      → DashboardPage
/connect               → ConnectRepoPage
/queue                 → QueueMonitorPage
/results/:jobId        → ResultViewerPageEnhanced  ← This route
/github-pr/:jobId      → GitHubPRViewPage
/rag                   → RagManagerPage
```

## Status
✅ **Fixed and verified** - All navigation now uses consistent `/results/:jobId` pattern.
