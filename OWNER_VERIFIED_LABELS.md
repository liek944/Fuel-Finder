# Owner-Verified vs Community-Verified Price Labels

## Overview

Differentiated price verification labels to distinguish between:
1. **Owner/Manager verification** → Shows **(verified by owner)** in blue
2. **Community/Admin verification** → Shows **(community)** in gray

## Changes Made

### Backend Changes

#### 1. ownerController.js - Line 391-399
Changed from `price_updated_by = 'community'` to `price_updated_by = 'owner'`

**Before:**
```javascript
INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, ...)
VALUES ($1, $2, $3, TRUE, 'community', ...)
ON CONFLICT (station_id, fuel_type) 
DO UPDATE SET 
  price = EXCLUDED.price,
  is_community = TRUE,
  price_updated_by = 'community',
  ...
```

**After:**
```javascript
INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, ...)
VALUES ($1, $2, $3, FALSE, 'owner', ...)
ON CONFLICT (station_id, fuel_type) 
DO UPDATE SET 
  price = EXCLUDED.price,
  is_community = FALSE,
  price_updated_by = 'owner',
  ...
```

**Rationale:**
- Owner-verified prices are more authoritative than community reports
- `is_community = FALSE` because it's verified by the actual station owner/manager
- `price_updated_by = 'owner'` for frontend display logic

#### 2. priceRepository.js - Unchanged
Admin verification still uses `price_updated_by = 'community'` since admins verify community-submitted reports.

```javascript
// Admin verification keeps 'community' label
price_updated_by = 'community',
is_community = TRUE
```

### Frontend Changes

#### 1. MainApp.tsx - Line 1290-1311
Added conditional rendering for owner-verified prices:

```tsx
₱{Number(fp.price).toFixed(2)}/L
{fp.price_updated_by === "owner" && (
  <span style={{
    fontSize: 10,
    color: "#2563eb",      // Blue color
    marginLeft: 4,
    fontWeight: 500,       // Semi-bold
  }}>
    (verified by owner)
  </span>
)}
{fp.price_updated_by === "community" && (
  <span style={{
    fontSize: 10,
    color: "#666",         // Gray color
    marginLeft: 4,
  }}>
    (community)
  </span>
)}
```

#### 2. AdminPortal.tsx - Line 1908-1929
Same changes as MainApp.tsx for consistency.

## Visual Comparison

### Before (All showed "community")
```
Regular:  ₱65.50/L (community)
Premium:  ₱70.20/L (community)
Diesel:   ₱60.80/L (community)
```

### After

**Owner-verified (Blue, semi-bold):**
```
Regular:  ₱65.50/L (verified by owner)
Premium:  ₱70.20/L (verified by owner)
Diesel:   ₱60.80/L (verified by owner)
```

**Community-verified (Gray, normal):**
```
Regular:  ₱65.50/L (community)
Premium:  ₱70.20/L (community)
Diesel:   ₱60.80/L (community)
```

## Verification Flow

### Owner Portal Verification
```
User submits report → fuel_price_reports (pending)
                     ↓
Owner clicks "Approve" → fuel_price_reports.is_verified = TRUE
                       → fuel_prices.price_updated_by = 'owner' ✅
                       → fuel_prices.is_community = FALSE ✅
                       ↓
                  Map shows: "₱65.50/L (verified by owner)" [BLUE]
```

### Admin Portal Verification
```
User submits report → fuel_price_reports (pending)
                     ↓
Admin clicks "Verify" → fuel_price_reports.is_verified = TRUE
                      → fuel_prices.price_updated_by = 'community' ✅
                      → fuel_prices.is_community = TRUE ✅
                      ↓
                 Map shows: "₱65.50/L (community)" [GRAY]
```

## Database Schema

### fuel_prices Table
```sql
price_updated_by VARCHAR(50)  -- Values: 'owner', 'community', 'admin'
is_community BOOLEAN          -- FALSE for owner, TRUE for community
```

### Possible Values

| price_updated_by | is_community | Display Label           | Color | Source              |
|------------------|--------------|-------------------------|-------|---------------------|
| 'owner'          | FALSE        | (verified by owner)     | Blue  | Owner Portal        |
| 'community'      | TRUE         | (community)             | Gray  | Admin Portal        |
| 'admin'          | FALSE        | (none shown)            | -     | Admin manual update |

## Files Modified

1. **backend/controllers/ownerController.js**
   - Line 391-399: Changed `price_updated_by` from 'community' to 'owner'
   - Changed `is_community` from TRUE to FALSE

2. **frontend/src/components/MainApp.tsx**
   - Line 1290-1311: Added conditional rendering for owner-verified label

3. **frontend/src/components/AdminPortal.tsx**
   - Line 1908-1929: Added conditional rendering for owner-verified label

## Deployment

### Backend
```bash
cd /home/keil/fuel_finder/backend
./deploy-owner-verified-labels.sh
```

Or manually:
```bash
pm2 restart fuel-finder-backend
```

### Frontend
```bash
cd /home/keil/fuel_finder/frontend
npm run build
# Deploy to Netlify
```

## Testing

### Test Owner Verification
1. Go to MainApp → Submit price report for iFuel Dangay
2. Go to Owner Dashboard (ifuel-dangay-portal.netlify.app)
3. Click "Approve" on the pending report
4. Return to MainApp → Check station marker
5. **Expected:** Price shows **(verified by owner)** in blue ✅

### Test Admin Verification
1. Go to MainApp → Submit price report for any station
2. Go to Admin Portal → Price Reports Management
3. Click "Verify" on the pending report
4. Return to MainApp → Check station marker
5. **Expected:** Price shows **(community)** in gray ✅

## Design Rationale

### Why "verified by owner" instead of just "owner"?
- More descriptive and professional
- Clearly indicates verification action
- Builds trust with users

### Why blue for owner vs gray for community?
- **Blue (#2563eb)** = Official, authoritative, trustworthy
- **Gray (#666)** = Community-sourced, less authoritative
- Color psychology: Blue conveys reliability and trust
- Helps users quickly identify most reliable prices

### Why is_community = FALSE for owners?
- Owner prices are official, not community-sourced
- Logical distinction: Owner = authoritative, Community = crowdsourced
- Database queries can filter by is_community for analytics

## Benefits

1. **User Trust** - Users can distinguish official owner prices from community reports
2. **Owner Incentive** - Owners feel valued when their verification is highlighted
3. **Data Quality** - Encourages owners to maintain accurate prices
4. **Transparency** - Clear source attribution for price data
5. **Analytics** - Can track owner engagement vs community contribution

## Future Enhancements

Potential improvements:
- Add "(verified by manager)" option for staff accounts
- Show owner verification timestamp on hover
- Add verification badge icon instead of text
- Allow owners to set official prices directly (not just verify reports)
- Track owner response time to reports
