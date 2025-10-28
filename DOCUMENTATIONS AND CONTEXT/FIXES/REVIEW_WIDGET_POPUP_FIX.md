# Review Widget Popup Fix

## Issues Fixed

### 1. TypeError: Cannot read properties of undefined (reading 'startsWith')

**Error Location:**
- `api.ts:52` - In `getApiUrl()` function
- Called from `ReviewWidget.tsx:63, 78, 115`

**Root Cause:**
The `getApiUrl()` function expects a path argument, but ReviewWidget was calling it without any path:
```typescript
// BROKEN
`${getApiUrl()}/reviews/summary?...`  // path is undefined!

// FIXED
`${getApiUrl('/api')}/reviews/summary?...`  // path is '/api'
```

**Error Details:**
```typescript
// api.ts line 50-53
export const getApiUrl = (path: string): string => {
  // Ensure path starts with /
  const cleanPath = path.startsWith("/") ? path : `/${path}`;  // ❌ ERROR: path is undefined
  return `${API_BASE_URL}${cleanPath}`;
};
```

### 2. Review Widget Disappearing When Clicked

**Issue:**
When clicking any button in the ReviewWidget (View Reviews, Write a Review, Submit, Cancel, Close), the entire popup would immediately close. Users had to click the station/POI marker again to see the widget.

**Root Cause:**
Same as the Edit Button Popup Fix - button click events were bubbling up to the Leaflet map/marker, triggering the default behavior to close popups.

**Solution:**
Added event propagation prevention to all interactive buttons, following the same pattern from `EDIT_BUTTON_POPUP_FIX.md`:

```tsx
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  // ... button action
}}
```

## Changes Made

### File: `frontend/src/components/ReviewWidget.tsx`

**API URL Fixes (3 locations):**

1. **Line 63** - Fetch review summary:
```typescript
// Before
const response = await fetch(
  `${getApiUrl()}/reviews/summary?targetType=${targetType}&targetId=${targetId}`
);

// After
const response = await fetch(
  `${getApiUrl('/api')}/reviews/summary?targetType=${targetType}&targetId=${targetId}`
);
```

2. **Line 78** - Fetch reviews list:
```typescript
// Before
const response = await fetch(
  `${getApiUrl()}/reviews?targetType=${targetType}&targetId=${targetId}&...`
);

// After
const response = await fetch(
  `${getApiUrl('/api')}/reviews?targetType=${targetType}&targetId=${targetId}&...`
);
```

3. **Line 115** - Submit review:
```typescript
// Before
const response = await fetch(`${getApiUrl()}/reviews`, {

// After
const response = await fetch(`${getApiUrl('/api')}/reviews`, {
```

**Event Propagation Fixes (5 buttons):**

1. **View Reviews Button** (line ~200):
```tsx
<button
  className="view-reviews-btn"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReviews(!showReviews);
  }}
>
```

2. **Write a Review Button** (line ~239):
```tsx
<button
  className="write-review-btn"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowForm(true);
  }}
>
```

3. **Close Form Button** (line ~254):
```tsx
<button
  className="close-form-btn"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowForm(false);
  }}
>
```

4. **Cancel Button** (line ~297):
```tsx
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowForm(false);
  }}
  disabled={submitting}
  className="cancel-btn"
>
```

5. **Submit Button** (line ~308):
```tsx
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  }}
  disabled={submitting || rating === 0}
  className="submit-btn"
>
```

## Testing Steps

### Test 1: API Calls Work
1. Open browser console (F12)
2. Click on a station marker
3. Look for review summary in ReviewWidget
4. **Expected:** No TypeError in console
5. **Expected:** Reviews load successfully

### Test 2: Popup Stays Open
1. Click on a station/POI marker with the ReviewWidget
2. Click "▼ View All Reviews" button
3. **Expected:** Popup stays open, reviews list appears
4. Click "✍️ Write a Review" button
5. **Expected:** Popup stays open, review form appears
6. Click stars to rate
7. **Expected:** Popup stays open, rating selected
8. Click "Submit Review" or "Cancel"
9. **Expected:** Popup stays open, form closes/submits
10. Click "✕" close button on form
11. **Expected:** Popup stays open, form closes

### Test 3: End-to-End Review Flow
1. Click station marker
2. Click "Write a Review"
3. Select 5 stars
4. Type a comment: "Great station!"
5. Enter name: "Test User"
6. Click "Submit Review"
7. **Expected:** Success message appears
8. **Expected:** Popup stays open
9. **Expected:** Review count increases
10. Click "View All Reviews"
11. **Expected:** New review appears in list

## Related Fixes

This fix follows the same pattern as:
- **EDIT_BUTTON_POPUP_FIX.md** - Edit buttons closing popups
- Station upload button (AdminPortal.tsx line 1814-1820)
- POI edit button (AdminPortal.tsx line 2108-2112)

## Deployment

**Frontend Only** - No backend changes required

```bash
cd /home/keil/fuel_finder/frontend
npm run build
# Deploy to Netlify or hosting platform
```

Or use the deployment script:
```bash
./deploy-review-widget-fix.sh
```

## API Endpoints Used

All review endpoints now correctly called:
- `GET /api/reviews/summary?targetType=station&targetId=123`
- `GET /api/reviews?targetType=station&targetId=123&pageSize=10&sortBy=created_at&sortOrder=DESC`
- `POST /api/reviews` (with body: targetType, targetId, rating, comment, displayName)

## Date Fixed
October 28, 2024

## Related Documentation
- `REVIEWS_SYSTEM_DOCUMENTATION.md` - Full reviews system architecture
- `EDIT_BUTTON_POPUP_FIX.md` - Original popup fix for edit buttons
