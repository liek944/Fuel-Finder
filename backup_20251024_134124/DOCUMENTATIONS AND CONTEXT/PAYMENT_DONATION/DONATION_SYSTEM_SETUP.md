# 💝 Fuel Donation System - Setup Guide

**Version**: 1.0  
**Date**: October 15, 2025  
**Status**: Production Ready  
**Estimated Setup Time**: 30-60 minutes

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [PayMongo Account Setup](#paymongo-account-setup)
3. [Database Migration](#database-migration)
4. [Environment Configuration](#environment-configuration)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before starting, ensure you have:

- ✅ Node.js v14+ installed
- ✅ PostgreSQL database running
- ✅ Backend server accessible
- ✅ Admin access to your database
- ✅ Valid business registration (for live PayMongo account)

---

## 🏦 PayMongo Account Setup

### Step 1: Create PayMongo Account

1. Visit https://dashboard.paymongo.com/signup
2. Fill in your details:
   - Email address
   - Password
   - Business name: "Fuel Finder"
   - Business type: "Software/Technology"
3. Verify your email address

### Step 2: Complete Business Verification (for Live Mode)

**For Testing (Sandbox Mode):**
- You can start immediately with test keys
- No verification needed

**For Production (Live Mode):**
1. Login to PayMongo Dashboard
2. Go to Settings → Business Information
3. Upload required documents:
   - Valid ID (Government-issued)
   - Business Registration (DTI/SEC)
   - Proof of address
4. Wait 1-3 business days for approval

### Step 3: Get API Keys

1. Login to https://dashboard.paymongo.com
2. Go to **Developers** → **API Keys**
3. Copy your keys:
   - **Test Secret Key**: `sk_test_...` (for development)
   - **Test Public Key**: `pk_test_...` (for development)
   - **Live Secret Key**: `sk_live_...` (for production, after verification)
   - **Live Public Key**: `pk_live_...` (for production)

### Step 4: Set Up Webhooks

1. In PayMongo Dashboard, go to **Developers** → **Webhooks**
2. Click **Add webhook endpoint**
3. Configure:
   - **URL**: `https://your-backend-url.com/api/webhooks/paymongo`
   - **Events to listen**: 
     - `link.payment.paid`
     - `link.payment.failed`
     - `payment.paid`
     - `payment.failed`
   - **Description**: "Fuel Finder donation webhooks"
4. Copy the **Webhook Secret** (starts with `whsec_...`)

---

## 🗄️ Database Migration

### Option 1: Using Node.js Script (Recommended)

```bash
# Navigate to backend directory
cd backend

# Run migration script
node database/apply_migration.js database/migrations/002_add_donations.sql
```

### Option 2: Using psql Command

```bash
# If your database is local
psql -U postgres -d fuel_finder -f backend/database/migrations/002_add_donations.sql

# If using Supabase or remote database
psql -h your-host -U your-user -d your-database -f backend/database/migrations/002_add_donations.sql
```

### Option 3: Manual SQL Execution

1. Open your database management tool (pgAdmin, DBeaver, Supabase Dashboard)
2. Connect to your `fuel_finder` database
3. Open `backend/database/migrations/002_add_donations.sql`
4. Execute the entire SQL script

### Verify Migration

Run this query to verify tables were created:

```sql
-- Check if donations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('donations', 'donation_impacts');

-- Check if view was created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'donation_statistics';
```

You should see 2 tables and 1 view.

---

## ⚙️ Environment Configuration

### Backend Configuration

Edit `backend/.env` and add the following variables:

```bash
# PayMongo API Keys (TEST MODE - for development)
PAYMONGO_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
PAYMONGO_PUBLIC_KEY=pk_test_YOUR_TEST_PUBLIC_KEY_HERE
PAYMONGO_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# For production, use live keys:
# PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
# PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY_HERE
```

**Example:**
```bash
PAYMONGO_SECRET_KEY=sk_test_AbCd1234EfGh5678IjKl9012MnOp3456
PAYMONGO_PUBLIC_KEY=pk_test_QrSt9876UvWx5432YzAb1098CdEf7654
PAYMONGO_WEBHOOK_SECRET=whsec_1234567890abcdef1234567890abcdef1234567890abcdef
```

### Verify Configuration

Restart your backend server:

```bash
cd backend
npm start
```

Look for this line in the logs:
```
💝 Fuel Donations: Enabled (PayMongo)
```

If you see:
```
💝 Fuel Donations: Disabled (Configure PayMongo)
```

This means your API keys are not configured correctly. Double-check your `.env` file.

---

## 🧪 Testing

### Test 1: Check API Endpoints

```bash
# Test donation stats endpoint (should return zeros initially)
curl http://localhost:3001/api/donations/stats

# Expected response:
# {
#   "total_donations": 0,
#   "total_amount": 0,
#   "donations_this_month": 0,
#   "amount_this_month": 0,
#   ...
# }
```

### Test 2: Create Test Donation

Use PayMongo's test mode to simulate a donation without real money.

**Option A: Using Frontend**

1. Add the DonationWidget to your frontend (see Integration section below)
2. Click "Donate" button
3. Select an amount (e.g., ₱50)
4. Submit the form
5. You'll be redirected to PayMongo test checkout

**Test Payment Credentials:**
- **GCash Test Number**: `09123456789`
- **Test OTP**: `123456`
- **Test Cards**: See https://developers.paymongo.com/docs/testing

**Option B: Using curl**

```bash
curl -X POST http://localhost:3001/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "donor_name": "Test Donor",
    "donor_email": "test@example.com",
    "cause": "ambulance",
    "notes": "Test donation"
  }'
```

Copy the `payment_url` from the response and open it in your browser.

### Test 3: Verify Webhook

1. Complete a test payment in PayMongo checkout
2. Check your backend logs for:
   ```
   📬 Webhook received: link.payment.paid
   ✅ Donation payment succeeded: [payment_id] (₱50.00)
   ```

3. Query the database to verify:
   ```sql
   SELECT * FROM donations WHERE status = 'succeeded';
   ```

### Test 4: Check Donation Stats

```bash
curl http://localhost:3001/api/donations/stats

# Should now show:
# {
#   "total_donations": 1,
#   "total_amount": 50,
#   ...
# }
```

---

## 🚀 Deployment

### Production Checklist

Before going live:

- [ ] Switch to PayMongo **Live Keys** in production `.env`
- [ ] Update webhook URL in PayMongo Dashboard to production URL
- [ ] Test webhook with live endpoint
- [ ] Set up SSL certificate (HTTPS required for webhooks)
- [ ] Create backup of database before migration
- [ ] Monitor logs for first few donations
- [ ] Test all payment methods (GCash, card, online banking)

### Environment Variables for Production

```bash
# Production .env
PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY
PAYMONGO_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Make sure to use HTTPS
NODE_ENV=production
```

### Deploy to AWS EC2 (Your Current Setup)

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd fuel_finder/backend

# Pull latest changes
git pull origin main

# Install dependencies (if any new packages)
npm install

# Run migration
node database/apply_migration.js database/migrations/002_add_donations.sql

# Update environment variables
nano .env
# Add PayMongo keys

# Restart PM2
pm2 restart all

# Check logs
pm2 logs
```

---

## 🔗 Frontend Integration

### Add DonationWidget to MainApp

Edit `frontend/src/components/MainApp.tsx`:

```typescript
import DonationWidget from './DonationWidget';

// Inside your component
const [showDonations, setShowDonations] = useState(false);

// Add a button to open donations (in your UI)
<button 
  className="donate-button"
  onClick={() => setShowDonations(true)}
>
  💝 Support Community
</button>

// Add the widget (renders as overlay)
{showDonations && (
  <DonationWidget onClose={() => setShowDonations(false)} />
)}
```

### Add Floating Donation Button (Optional)

Create a floating button in your main app:

```css
/* Add to your main CSS file */
.floating-donate-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 50px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  z-index: 999;
  transition: all 0.3s;
}

.floating-donate-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}
```

---

## 🐛 Troubleshooting

### Issue: "Payment system not configured" error

**Cause**: PayMongo API keys not set or invalid

**Solution**:
1. Check `backend/.env` file has correct keys
2. Ensure keys start with `sk_test_` or `sk_live_`
3. No extra spaces or quotes around keys
4. Restart backend server after changes

---

### Issue: Webhook not receiving events

**Causes**:
- Incorrect webhook URL
- Backend not accessible from internet
- Webhook secret mismatch

**Solutions**:
1. Verify webhook URL in PayMongo Dashboard
2. Ensure URL is HTTPS (required by PayMongo)
3. Test webhook manually:
   ```bash
   curl -X POST https://your-backend.com/api/webhooks/paymongo \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
4. Check backend logs for webhook errors
5. Use PayMongo Dashboard → Developers → Webhooks → View logs

---

### Issue: Donation created but status stuck on "pending"

**Cause**: Webhook not processed or payment not completed

**Solution**:
1. Check if payment was actually completed in PayMongo Dashboard
2. Manually trigger webhook or update status:
   ```sql
   UPDATE donations 
   SET status = 'succeeded', 
       paid_at = CURRENT_TIMESTAMP 
   WHERE payment_intent_id = 'your_payment_id';
   ```

---

### Issue: Database migration fails

**Error**: "relation already exists"

**Solution**: Migration was already run. Skip or drop existing tables:
```sql
-- CAUTION: This deletes all donation data
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS donation_impacts CASCADE;
DROP VIEW IF EXISTS donation_statistics CASCADE;

-- Then re-run migration
```

---

### Issue: Payment succeeds but impact metrics not updating

**Cause**: Trigger function not working

**Solution**:
1. Check if trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_update_donation_impact';
   ```

2. Manually update metrics:
   ```sql
   -- Recalculate for all causes
   UPDATE donation_impacts di
   SET total_amount = subq.total,
       impact_metrics = jsonb_set(
         di.impact_metrics,
         '{liters_funded}',
         to_jsonb(ROUND(subq.total / 58.50, 2))
       )
   FROM (
     SELECT cause, SUM(amount) as total
     FROM donations
     WHERE status = 'succeeded'
     GROUP BY cause
   ) subq
   WHERE di.cause = subq.cause;
   ```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```sql
-- Today's donations
SELECT COUNT(*), SUM(amount) 
FROM donations 
WHERE DATE(created_at) = CURRENT_DATE 
AND status = 'succeeded';

-- Failed payments today
SELECT COUNT(*) 
FROM donations 
WHERE DATE(created_at) = CURRENT_DATE 
AND status = 'failed';
```

### Weekly Reports

```sql
-- Weekly donation report
SELECT 
  cause,
  COUNT(*) as donations,
  SUM(amount) as total_amount,
  AVG(amount) as avg_donation
FROM donations
WHERE created_at >= NOW() - INTERVAL '7 days'
AND status = 'succeeded'
GROUP BY cause
ORDER BY total_amount DESC;
```

### Admin Dashboard Queries

```bash
# Get all pending donations
curl -H "x-api-key: YOUR_ADMIN_API_KEY" \
  http://localhost:3001/api/admin/donations?status=pending

# Get donations by cause
curl -H "x-api-key: YOUR_ADMIN_API_KEY" \
  http://localhost:3001/api/admin/donations?cause=ambulance&limit=50
```

---

## 🎯 Success Criteria

You'll know the system is working when:

✅ Backend logs show "Fuel Donations: Enabled (PayMongo)"  
✅ Test donation creates payment link  
✅ Payment completion triggers webhook  
✅ Donation status updates from "pending" to "succeeded"  
✅ Stats endpoint shows correct totals  
✅ Impact metrics auto-update  
✅ Recent donations display in widget  

---

## 📞 Support Resources

- **PayMongo Documentation**: https://developers.paymongo.com/docs
- **PayMongo Support**: developers@paymongo.com
- **Test Cards**: https://developers.paymongo.com/docs/testing
- **Webhook Guide**: https://developers.paymongo.com/docs/webhooks

---

## 🎉 You're All Set!

The donation system is now ready to accept contributions for your community programs!

**Next Steps:**
1. Promote the feature to users
2. Set up monthly transparency reports
3. Partner with local LGUs for fund distribution
4. Monitor donation trends and optimize

---

**Setup Date**: _______________  
**Configured By**: _______________  
**Production Launch**: _______________  

---

*For questions or issues, refer to the troubleshooting section or contact the development team.*
