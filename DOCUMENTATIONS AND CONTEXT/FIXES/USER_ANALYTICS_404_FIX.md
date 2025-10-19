# User Analytics 404 Error Fix

## Problem

The User Analytics feature was returning 404 errors when trying to fetch user statistics:

```
GET https://fuelfinder.duckdns.org/admin/users/stats 404 (Not Found)
GET https://fuelfinder.duckdns.org/admin/users/active 404 (Not Found)
```

## Root Causes

### 1. Missing `/api` Prefix
The API endpoints were being called without the `/api` prefix:
- ❌ Called: `/admin/users/stats`
- ✅ Should be: `/api/admin/users/stats`

### 2. Incorrect Response Parsing
The `apiGet()` function returns a `Response` object, not parsed JSON:
- ❌ `const response = await apiGet(...); response.success`
- ✅ `const response = await apiGet(...); const data = await response.json(); data.success`

### 3. Incorrect localStorage Key
The component was looking for the wrong key name:
- ❌ Used: `'fuel_finder_admin_key'`
- ✅ Should be: `'admin_api_key'` (matches AdminPortal)

## Solution

Updated `frontend/src/components/UserAnalytics.tsx`:

### Change 1: Fixed localStorage Key Name
```typescript
// Before
const getAdminApiKey = (): string => {
  return localStorage.getItem('fuel_finder_admin_key') || '';
};

// After
const getAdminApiKey = (): string => {
  return localStorage.getItem('admin_api_key') || '';
};
```

### Change 2: Fixed API Endpoint Paths
```typescript
// Before
const response = await apiGet("/admin/users/stats");

// After
const apiKey = getAdminApiKey();
const response = await apiGet("/api/admin/users/stats", apiKey);
```

### Change 3: Fixed Response Parsing
```typescript
// Before
const response = await apiGet("/admin/users/stats");
if (response.success) {
  setStats(response.stats);
}

// After
const response = await apiGet("/api/admin/users/stats", apiKey);
if (response.ok) {
  const data = await response.json();
  if (data.success) {
    setStats(data.stats);
  }
}
```

## Testing

After this fix, the User Analytics dashboard should:
1. ✅ Successfully fetch user statistics from `/api/admin/users/stats`
2. ✅ Successfully fetch active users from `/api/admin/users/active`
3. ✅ Display real-time analytics data
4. ✅ Auto-refresh every 10 seconds

## Files Modified

- `frontend/src/components/UserAnalytics.tsx`

## Prevention

This type of error can be prevented by:
1. **Consistent API patterns**: Always check how other components use `apiGet()` (see `AdminPortal.tsx`, `PriceReportsManagement.tsx` for reference)
2. **Type checking**: The `Response` object type should have caught the parsing issue
3. **Shared constants**: Consider creating a constants file for localStorage key names
