# 🧪 Donation System Testing & Troubleshooting Guide

**Last Updated**: October 16, 2025  
**Status**: Test Mode Active

---

## 🔧 Recent Fixes Applied

### 1. ✅ API URL Fixed
**Issue**: Donation button showed `undefined/api/donations/create`  
**Cause**: Used wrong environment variable `REACT_APP_API_URL` instead of `REACT_APP_API_BASE_URL`  
**Solution**: Updated `DonationWidget.tsx` to use API utilities from `utils/api.ts`

### 2. ✅ Minimum Amount Updated to ₱100
**Issue**: PayMongo rejects transactions below ₱100  
**Cause**: Widget allowed ₱10 minimum (old validation)  
**Solution**: Updated all validation to enforce ₱100 minimum:
- Default amount: ₱100
- Preset amounts: ₱100, ₱200, ₱500, ₱1000, ₱2000, ₱5000
- Input validation: ₱100 - ₱10,000
- Error messages updated
- Database constraint updated

### 3. ✅ Webhook Type Casting Fixed (October 16, 2025)
**Issue**: Payments succeeded but stats didn't update - "inconsistent types deduced for parameter $1"  
**Cause**: PostgreSQL type inference error in `updateDonationStatus()` function  
**Error**: `code: '42P08', detail: 'text versus character varying'`  
**Solution**: Added explicit `::VARCHAR` type casting to all SQL parameters in `db.js:943-955`
- `$1::VARCHAR(50)` for status
- `$2::VARCHAR(50)` for payment_method  
- `$3::VARCHAR(255)` for payment_intent_id
- Now webhooks process successfully and donations auto-update to 'succeeded'
- **See**: `PAYMONGO_WEBHOOK_TYPE_CASTING_FIX.md` for full details

---

## ❓ Why Stats Show 0 and Donors Don't Appear

### Root Cause
The donation stats and recent donors only show donations with **status = 'succeeded'**.

When you create a donation:
1. ✅ Donation is created with `status = 'pending'`
2. ✅ You're redirected to PayMongo checkout
3. ✅ You complete the test payment
4. ❌ **PayMongo webhook doesn't fire** (not configured yet)
5. ❌ Donation stays as 'pending' instead of 'succeeded'
6. ❌ Stats don't update (only count succeeded donations)

### How Donations Should Work

```
┌─────────────┐
│ User clicks │
│ "Donate"    │
└──────┬──────┘
       │
       ▼
┌────────────────────────────┐
│ Frontend creates donation  │
│ Status: PENDING            │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ User completes payment on  │
│ PayMongo checkout page     │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ PayMongo sends webhook     │
│ to backend                 │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Backend updates donation   │
│ Status: SUCCEEDED ✅       │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Stats update automatically │
│ (database trigger)         │
└────────────────────────────┘
```

---

## 🔧 Solution 1: Configure PayMongo Webhooks (Recommended)

### Step 1: Access PayMongo Dashboard
```
1. Go to https://dashboard.paymongo.com
2. Login with your credentials
3. Navigate to: Developers > Webhooks
```

### Step 2: Create Webhook
```
Click "Add Webhook"

Webhook URL: https://fuelfinder.duckdns.org/api/webhooks/paymongo

Events to listen:
☑️ link.payment.paid
☑️ payment.paid
☑️ link.payment.failed
☑️ payment.failed

Description: Fuel Finder Donation Status Updates

Click "Create Webhook"
```

### Step 3: Test Webhook
```bash
# After creating webhook, make a test donation
# Check backend logs:
ssh your-server
pm2 logs | grep "Webhook"

# Should see:
📬 Webhook received: link.payment.paid
✅ Donation payment succeeded: link_xxx (₱100.00)
```

### Step 4: Verify Stats Update
```bash
curl https://fuelfinder.duckdns.org/api/donations/stats

# Should show:
{
  "total_donations": "1",
  "total_amount": "100",
  ...
}
```

---

## 🔧 Solution 2: Manually Mark Donations as Succeeded (Testing)

If webhooks aren't configured yet, use this admin endpoint to manually update donations:

### Step 1: Get Your Admin API Key
```bash
# On your backend server
ssh your-server
cd ~/Fuel-FInder/backend
grep ADMIN_API_KEY .env
```

### Step 2: Check Pending Donations
```bash
curl -H "x-api-key: YOUR_API_KEY_HERE" \
  "https://fuelfinder.duckdns.org/api/admin/donations?status=pending"
```

**Example Response**:
```json
[
  {
    "id": 1,
    "amount": "50.00",
    "donor_name": "Anonymous",
    "status": "pending",
    "payment_intent_id": "link_xxx",
    "cause": "ambulance",
    "created_at": "2025-10-16T03:24:00.000Z"
  }
]
```

### Step 3: Mark Donation as Succeeded
```bash
# Replace {id} with the donation ID from Step 2
# Replace YOUR_API_KEY_HERE with your actual API key

curl -X PATCH \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"status": "succeeded", "payment_method": "gcash"}' \
  "https://fuelfinder.duckdns.org/api/admin/donations/1/status"
```

**Example Response**:
```json
{
  "success": true,
  "donation": {
    "id": 1,
    "amount": "50.00",
    "status": "succeeded",
    "payment_method": "gcash"
  },
  "message": "Donation status updated to succeeded"
}
```

### Step 4: Verify Stats Updated
```bash
curl https://fuelfinder.duckdns.org/api/donations/stats
```

**Should now show**:
```json
{
  "total_donations": "1",
  "total_amount": "50",
  "donations_this_month": "1",
  "amount_this_month": "50",
  ...
}
```

### Step 5: Check Recent Donors
```bash
curl https://fuelfinder.duckdns.org/api/donations/recent
```

**Should now show**:
```json
[
  {
    "id": 1,
    "amount": "50.00",
    "donor_name": "Your Name",
    "cause": "ambulance",
    "notes": null,
    "created_at": "2025-10-16T03:24:00.000Z"
  }
]
```

---

## 🧪 Complete Testing Checklist

### Frontend Testing

**1. Rebuild Frontend**
```bash
cd ~/fuel_finder/frontend
npm run build
```

**2. Deploy Updated Build**
```bash
# If using Netlify CLI
netlify deploy --prod --dir=build

# Or drag-and-drop build folder to Netlify dashboard
```

**3. Test Minimum Amount Validation**
- ✅ Default amount is ₱100
- ✅ Preset buttons show: ₱100, ₱200, ₱500, ₱1000, ₱2000, ₱5000
- ✅ Custom input below ₱100 shows error: "Minimum: ₱100 (PayMongo requirement)"
- ✅ Donate button is disabled when amount < ₱100

**4. Test Donation Flow**
```
1. Click "💝 Support Community" button
2. Select cause: "Ambulance Services"
3. Amount: ₱100 (default)
4. Name: "Test Donor"
5. Click "Donate ₱100"
6. Redirected to PayMongo
7. Select GCash
8. Phone: 09123456789
9. OTP: 123456
10. Click Pay
11. Payment completes ✅
```

### Backend Testing

**5. Check Donation Was Created**
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://fuelfinder.duckdns.org/api/admin/donations?status=pending" \
  | jq
```

**6. Manually Mark as Succeeded** (if webhook not configured)
```bash
# Get the donation ID from previous step
curl -X PATCH \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "succeeded", "payment_method": "gcash"}' \
  "https://fuelfinder.duckdns.org/api/admin/donations/{ID}/status"
```

**7. Verify Stats Update**
```bash
# Public endpoint - no auth needed
curl https://fuelfinder.duckdns.org/api/donations/stats | jq
```

Expected output:
```json
{
  "total_donations": "1",
  "total_amount": "100",
  "donations_this_month": "1",
  "amount_this_month": "100",
  "donations_this_week": "1",
  "amount_this_week": "100",
  "average_donation": "100",
  "unique_donors": "1"
}
```

**8. Verify Recent Donors**
```bash
curl https://fuelfinder.duckdns.org/api/donations/recent | jq
```

Expected output:
```json
[
  {
    "id": 1,
    "amount": "100.00",
    "donor_name": "Test Donor",
    "cause": "ambulance",
    "notes": null,
    "created_at": "2025-10-16T03:30:00.000Z"
  }
]
```

### Frontend Verification

**9. Refresh Donation Widget**
```
1. Go to https://fuelfinderths.netlify.app
2. Click "💝 Support Community"
3. Check "Recent Donors" tab
4. Should see: "Test Donor" with ₱100
5. Stats should show: "₱100.00 Total Raised" and "1 Donations"
```

---

## 🐛 Common Issues

### Issue: Stats Still Show 0
**Cause**: Donation not marked as 'succeeded'  
**Fix**: Use the manual update endpoint (Solution 2)

### Issue: Webhook Not Firing
**Cause**: Webhook not configured in PayMongo dashboard  
**Fix**: Configure webhook (Solution 1)

### Issue: "Minimum donation is ₱100" Alert
**Cause**: PayMongo requirement (this is correct!)  
**Fix**: This is expected behavior. Use ₱100 or higher.

### Issue: Payment Fails Below ₱100
**Cause**: PayMongo rejects transactions < ₱100  
**Fix**: Widget now enforces ₱100 minimum

### Issue: Name Doesn't Appear in Recent Donors
**Possible Causes**:
1. Donation still 'pending' (not 'succeeded')
2. Name was left as "Anonymous"
3. Frontend hasn't refreshed stats

**Fix**: 
```bash
# Check if donation succeeded
curl https://fuelfinder.duckdns.org/api/donations/recent

# If empty, donation is still pending
# Manually mark as succeeded (see Solution 2)
```

---

## 📊 Database Queries (For Advanced Debugging)

### Check All Donations
```sql
SELECT id, amount, donor_name, status, payment_method, cause, created_at 
FROM donations 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Only Succeeded Donations
```sql
SELECT id, amount, donor_name, status, cause, created_at 
FROM donations 
WHERE status = 'succeeded'
ORDER BY created_at DESC;
```

### Check Donation Stats View
```sql
SELECT * FROM donation_statistics;
```

### Manually Update Donation Status (Emergency)
```sql
UPDATE donations 
SET status = 'succeeded', 
    payment_method = 'gcash',
    paid_at = NOW()
WHERE id = 1;
```

---

## ✅ Success Criteria

Donation system is working correctly when:

- ✅ Minimum amount is ₱100
- ✅ Donation button creates payment link
- ✅ Payment completes on PayMongo
- ✅ Webhook updates donation to 'succeeded' (or manual update works)
- ✅ Stats show correct totals
- ✅ Recent donors show names and amounts
- ✅ No console errors
- ✅ Database triggers update impact metrics

---

## 🚀 Next Steps

### Immediate (Test Mode)
1. ✅ Update frontend minimum to ₱100
2. ✅ Add admin endpoint to manually update donations
3. ⏳ Configure PayMongo webhook
4. ⏳ Test complete donation flow
5. ⏳ Verify stats update automatically

### Before Going Live
1. Configure PayMongo webhook in production
2. Test webhook with real ₱100 donation
3. Verify auto-update works
4. Remove manual update endpoint (security)
5. Update test mode banner
6. Switch to live PayMongo keys

---

**Questions?** Check backend logs: `pm2 logs | grep "Donation"`  
**Emergency?** Use manual update endpoint documented above.

---

*Last Updated: October 16, 2025*  
*Status: Testing with ₱100 minimum*
