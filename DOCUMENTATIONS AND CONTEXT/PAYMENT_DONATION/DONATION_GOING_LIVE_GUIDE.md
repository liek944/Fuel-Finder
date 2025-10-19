# 🚀 Fuel Donation System - Going Live Guide

**Current Status**: ✅ Test Mode Active  
**Target**: 💳 Live Payments with Real Money  
**Timeline**: 1-2 Weeks (including verification)  
**Last Updated**: October 15, 2025

---

## 📋 Table of Contents

1. [Current Status Check](#current-status-check)
2. [PayMongo Business Verification](#paymongo-business-verification)
3. [Legal & Compliance Requirements](#legal-compliance-requirements)
4. [Switching to Live Mode](#switching-to-live-mode)
5. [Frontend Integration](#frontend-integration)
6. [Testing Live Payments](#testing-live-payments)
7. [Launch Checklist](#launch-checklist)
8. [Post-Launch Monitoring](#post-launch-monitoring)

---

## ✅ Current Status Check

### What's Working (Test Mode)

- ✅ Database migration completed
- ✅ PayMongo test keys configured
- ✅ All 8 API endpoints functional
- ✅ Webhook receiving test payments
- ✅ Payment links generated successfully
- ✅ Test payments processing correctly
- ✅ Stats and leaderboard working
- ✅ HTTPS enabled (fuelfinder.duckdns.org)

### What's Using Test Mode

- ⚠️ API Keys: `sk_test_...` and `pk_test_...`
- ⚠️ No real money being charged
- ⚠️ Test payment methods only (test GCash, test cards)

### To Go Live, You Need:

- [ ] PayMongo business verification approved
- [ ] Live API keys obtained
- [ ] Legal documents prepared (Terms, Privacy Policy)
- [ ] LGU partnership confirmed (for fund distribution)
- [ ] Frontend widget integrated
- [ ] Live payment tested successfully

---

## 🏦 PayMongo Business Verification

### Step 1: Prepare Required Documents

#### For Individual/Sole Proprietorship:

**1. Government-Issued ID** (any one):
- ✅ Philippine Passport
- ✅ Driver's License
- ✅ UMID
- ✅ National ID (PhilSys)
- ✅ Postal ID
- ✅ PRC ID

**2. Business Registration**:
- ✅ **DTI Certificate of Registration** (for sole proprietorship)
  - Register at: https://bnrs.dti.gov.ph/web/guest/register
  - Cost: ₱200-500
  - Processing: Same day to 1 week
  - Valid: 5 years

**3. Mayor's Permit** (Business Permit):
- Obtain from your city/municipality
- Cost: Varies by location (₱500-3,000)
- Renewable annually

**4. Proof of Address**:
- Recent utility bill (PLDT, Meralco, water)
- Bank statement (last 3 months)
- Government-issued document with address

#### For Corporation:

- ✅ SEC Certificate of Registration
- ✅ Articles of Incorporation
- ✅ Board Resolution authorizing online transactions
- ✅ Valid ID of authorized representative
- ✅ Mayor's Permit
- ✅ Proof of business address

---

### Step 2: Submit for Verification

**Timeline: 1-3 business days**

1. **Login to PayMongo Dashboard**
   - URL: https://dashboard.paymongo.com
   - Use your registered account

2. **Navigate to Business Information**
   - Click **Settings** (gear icon)
   - Go to **Business Information**
   - Click **Submit for Verification**

3. **Fill Out Business Details**

   ```
   Business Name: Fuel Finder
   (or your registered DTI/SEC name)
   
   Business Type: Software/Technology
   
   Nature of Business: 
   "Web-based fuel station locator with integrated 
   community donation system for public services"
   
   Business Address:
   [Your registered business address]
   
   Expected Monthly Transaction Volume:
   "₱5,000 - ₱50,000" (conservative estimate)
   
   Expected Average Transaction:
   "₱50 - ₱500"
   
   Website URL:
   https://fuelfinder.duckdns.org
   
   Products/Services:
   "Community donations for fuel funding (ambulances,
   public transport, emergency services)"
   ```

4. **Upload Documents**
   - Valid ID (clear photo, all corners visible)
   - DTI/SEC Certificate (PDF or clear photo)
   - Mayor's Permit (PDF or clear photo)
   - Proof of Address (PDF or clear photo)

5. **Submit and Wait**
   - Review your submission
   - Click **Submit for Review**
   - Check email for updates
   - PayMongo may request additional info

---

### Step 3: During Verification

**What PayMongo Checks:**
- ✅ Document authenticity
- ✅ Business legitimacy
- ✅ ID verification
- ✅ Address verification
- ✅ Compliance with regulations

**Common Rejection Reasons:**
- ❌ Blurry or incomplete documents
- ❌ Expired IDs or permits
- ❌ Mismatched information
- ❌ Suspicious business activity

**If Rejected:**
1. Read rejection email carefully
2. Fix the issues mentioned
3. Resubmit with corrections
4. Contact support: developers@paymongo.com

---

### Step 4: After Approval

You'll receive an email: **"Your PayMongo account is now verified!"**

**Next Steps:**
1. Login to dashboard
2. Access live API keys
3. Update production environment
4. Configure live webhooks
5. Test with real small amount (₱10)

---

## 📄 Legal & Compliance Requirements

### 1. Terms of Service for Donations

Create a document covering:

**File**: `frontend/public/terms-of-service.html`

**Must Include:**
- Purpose of donations
- How funds are used
- Payment processing terms
- Refund policy
- Liability limitations
- Age requirements (18+)
- Privacy statement reference

**Sample Key Points:**
```
DONATION TERMS OF SERVICE

1. PURPOSE
   Donations fund fuel for community services in Oriental Mindoro:
   - Emergency ambulances
   - Public transport cooperatives
   - Emergency response teams

2. PAYMENT PROCESSING
   - Processed by PayMongo (PCI-DSS compliant)
   - Fees: 3.5% + ₱15 per transaction
   - Non-refundable except for processing errors

3. FUND DISTRIBUTION
   - Funds distributed to verified LGUs and organizations
   - Transparent reporting published monthly
   - 100% goes to stated cause (app absorbs fees)

4. DONOR INFORMATION
   - Name is optional (can be anonymous)
   - Email for receipt only
   - See Privacy Policy for data handling
```

---

### 2. Privacy Policy

**File**: `frontend/public/privacy-policy.html`

**Must Include:**
- What data is collected (name, email, IP, amount)
- How data is used (receipts, impact reports)
- Data storage and security
- Third-party sharing (PayMongo only)
- User rights (access, deletion)
- Contact information

**Sample Key Points:**
```
PRIVACY POLICY - FUEL FINDER DONATIONS

INFORMATION WE COLLECT:
- Donation amount
- Optional: Name, email address
- Technical: IP address, timestamp
- Payment method (via PayMongo)

HOW WE USE YOUR DATA:
- Process donations
- Send email receipts (if provided)
- Calculate impact metrics
- Prevent fraud and abuse

DATA SHARING:
- PayMongo: For payment processing only
- Public display: Name (if provided) and amount in leaderboard
- Never sold or shared for marketing

YOUR RIGHTS:
- Request data deletion
- Opt-out of public display (anonymous donations)
- Contact: support@fuelfinder.com
```

---

### 3. Refund Policy

**Recommended Policy:**

```
REFUND POLICY

Non-Refundable: Donations are generally non-refundable.

Exceptions:
1. Processing errors (duplicate charges)
2. Unauthorized transactions
3. Technical glitches

Refund Process:
1. Contact support within 7 days
2. Provide proof of issue
3. Refunds processed within 10 business days
4. Transaction fees non-refundable

Contact: support@fuelfinder.com
```

---

### 4. Compliance Checklist

- [ ] **BIR Registration** (if accepting donations as income)
- [ ] **Data Privacy Act Compliance** (register with NPC if needed)
- [ ] **Terms of Service** published and accessible
- [ ] **Privacy Policy** published and accessible
- [ ] **Cookie Notice** (if tracking users)
- [ ] **Contact Email** for inquiries set up
- [ ] **Transparency Reports** mechanism established

---

## 🔄 Switching to Live Mode

### Step 1: Obtain Live API Keys

After PayMongo verification:

1. Login to https://dashboard.paymongo.com
2. Toggle to **Live Mode** (top-right corner, currently shows "Test")
3. Go to **Developers** → **API Keys**
4. Copy your keys:
   - `sk_live_...` (Secret Key - **KEEP SECRET!**)
   - `pk_live_...` (Public Key)

---

### Step 2: Configure Live Webhooks

1. In PayMongo Dashboard (Live Mode):
   - Go to **Developers** → **Webhooks**
   - Click **Create webhook**

2. Configure:
   ```
   URL: https://fuelfinder.duckdns.org/api/webhooks/paymongo
   
   Events to Listen:
   ☑️ link.payment.paid
   ☑️ link.payment.failed  
   ☑️ payment.paid
   ☑️ payment.failed
   
   Description: Fuel Finder Live Donations
   ```

3. Click **Create**
4. Copy the **Webhook Signing Secret** (`whsec_...`)

---

### Step 3: Update Production Environment

**On Your EC2 Instance:**

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to backend
cd ~/Fuel-FInder/backend

# Backup current .env
cp .env .env.backup.test

# Edit .env file
nano .env

# Replace test keys with live keys:
# BEFORE (Test):
PAYMONGO_SECRET_KEY=sk_test_voUQ8yT1gNdisuAr1eBJdGpR
PAYMONGO_PUBLIC_KEY=pk_test_WJ7KijNjvzkkWSMQD8yt3hBd
PAYMONGO_WEBHOOK_SECRET=whsk_r5L2H5pkr3c8LEftaxPbWVqW

# AFTER (Live):
PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY_HERE
PAYMONGO_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE

# Save and exit (Ctrl+X, then Y, then Enter)

# Restart server
pm2 restart all

# Verify live mode is active
pm2 logs --lines 30 | grep "Fuel Donations"
# Should still show: 💝 Fuel Donations: Enabled (PayMongo)
```

---

### Step 4: Update Frontend (If Needed)

**No code changes needed!** The frontend already uses the backend API, which now uses live keys.

**Optional: Add disclaimers**

In `DonationWidget.tsx`, you can add:

```typescript
<div className="live-mode-notice">
  ⚡ Live payments enabled - Real money will be charged
</div>
```

---

### Step 5: Verify Configuration

```bash
# Test API is still working
curl https://fuelfinder.duckdns.org/api/donations/stats

# Check PM2 logs for any errors
pm2 logs fuel-finder --lines 50
```

---

## 🧪 Testing Live Payments

### ⚠️ Important: These are REAL TRANSACTIONS

**Cost**: ₱10 minimum + ₱15 PayMongo fee = ₱25 total will be charged

### Test Procedure

1. **Create Test Donation**

```bash
curl -X POST https://fuelfinder.duckdns.org/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "donor_name": "Live Test",
    "donor_email": "your@email.com",
    "cause": "ambulance",
    "notes": "Testing live payments"
  }'
```

2. **Open Payment URL**
   - Copy the `payment_url` from response
   - Open in browser
   - Use **REAL** payment method:
     - Your GCash account
     - Your credit/debit card
     - Your bank account

3. **Complete Payment**
   - Enter real payment details
   - Confirm transaction
   - **You will be charged ₱10**

4. **Verify Webhook**
   ```bash
   # Check EC2 logs
   pm2 logs --lines 50 | grep "payment"
   
   # Should see:
   # ✅ Donation payment succeeded: [payment_id] (₱10.00)
   ```

5. **Check Database**
   ```bash
   # SSH to EC2
   # Connect to database and check
   ```

   Or query via API:
   ```bash
   curl https://fuelfinder.duckdns.org/api/donations/stats
   # Should show total_donations: 1, total_amount: 10
   ```

6. **Verify in PayMongo Dashboard**
   - Login to dashboard
   - Go to **Payments** (in Live mode)
   - Should see your ₱10 payment listed
   - Check status is "succeeded"

---

### Test Checklist

After live test, verify:

- [ ] Payment link generates successfully
- [ ] Payment page loads (PayMongo checkout)
- [ ] Real payment method works (GCash/card)
- [ ] Webhook fires and logs show success
- [ ] Database updates (status = 'succeeded')
- [ ] Stats API shows updated totals
- [ ] PayMongo dashboard shows payment
- [ ] Donor receives confirmation (if email provided)

---

## ✅ Launch Checklist

### Pre-Launch (Do These First)

**Documentation**
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Refund Policy documented
- [ ] FAQ section created

**Legal/Compliance**
- [ ] Business registered (DTI/SEC)
- [ ] Mayor's Permit obtained
- [ ] PayMongo business verified ✅
- [ ] Data privacy compliance checked

**Technical**
- [ ] Live API keys configured
- [ ] Webhooks configured for live mode
- [ ] HTTPS working correctly
- [ ] Database backup created
- [ ] Monitoring set up

**Partnerships**
- [ ] LGU contacted and agreed to partnership
- [ ] Fund distribution process defined
- [ ] Transparency reporting plan created
- [ ] Beneficiaries verified

---

### Launch Day

**Phase 1: Soft Launch (Week 1)**

- [ ] Enable live mode
- [ ] Test with real ₱10 donation
- [ ] Monitor logs continuously
- [ ] Share with 5-10 trusted users
- [ ] Collect feedback
- [ ] Fix any issues immediately

**Phase 2: Limited Launch (Week 2)**

- [ ] Announce to 50-100 users
- [ ] Monitor for 24-48 hours
- [ ] Check webhook success rate
- [ ] Verify all donations process correctly
- [ ] Review PayMongo dashboard daily

**Phase 3: Public Launch (Week 3+)**

- [ ] Full public announcement
- [ ] Social media promotion
- [ ] Press release (if applicable)
- [ ] Monitor continuously
- [ ] Publish first transparency report

---

### Post-Launch

**Daily Tasks**
- Check PM2 logs for errors
- Review PayMongo dashboard
- Monitor donation stats
- Respond to donor inquiries

**Weekly Tasks**
- Generate donation report
- Update impact metrics
- Check webhook success rate
- Review refund requests

**Monthly Tasks**
- Publish transparency report
- Distribute funds to LGUs
- Update impact dashboard
- Calculate fees and net amounts
- Review and optimize

---

## 📊 Post-Launch Monitoring

### Key Metrics to Track

**Donation Metrics**
```sql
-- Daily donations
SELECT 
  DATE(created_at) as date,
  COUNT(*) as donations,
  SUM(amount) as total,
  AVG(amount) as average
FROM donations
WHERE status = 'succeeded'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Success Rate**
```sql
-- Payment success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM donations
GROUP BY status;
```

**Webhook Health**
```bash
# Check webhook logs
pm2 logs | grep "Webhook received"
pm2 logs | grep "payment succeeded"
pm2 logs | grep "payment failed"
```

---

### Alert Thresholds

Set up alerts for:

- ⚠️ **Failed payment rate > 10%**
- ⚠️ **Webhook not received in 1 hour** (during active hours)
- ⚠️ **Server downtime > 5 minutes**
- ⚠️ **Database connection errors**
- ⚠️ **PayMongo API errors**

---

### Monthly Transparency Report Template

```markdown
# Fuel Finder Donation Report - [Month Year]

## Summary
- Total Donations: [X]
- Total Amount: ₱[Y]
- Unique Donors: [Z]
- Average Donation: ₱[A]

## By Cause
- 🚑 Ambulance: ₱[amount] ([X] donations)
- 🚌 Public Transport: ₱[amount] ([X] donations)
- 🚨 Emergency Services: ₱[amount] ([X] donations)
- 💙 General Fund: ₱[amount] ([X] donations)

## Impact
- Liters Funded: [X]L
- Ambulance Trips Enabled: [X]
- Buses Supported: [X]

## Fund Distribution
- Oriental Mindoro Provincial Hospital: ₱[amount]
- [Transport Cooperative Name]: ₱[amount]
- [Emergency Response Team]: ₱[amount]

## Financials
- Gross Donations: ₱[total]
- Payment Processing Fees: ₱[fees]
- Net to Beneficiaries: ₱[net]

## Top Donors (Anonymous)
1. [Donor 1]: ₱[amount]
2. [Donor 2]: ₱[amount]
3. [Donor 3]: ₱[amount]

Thank you to all donors! 💝
```

---

## 🆘 Emergency Procedures

### If Webhook Stops Working

```bash
# 1. Check webhook URL is accessible
curl -X POST https://fuelfinder.duckdns.org/api/webhooks/paymongo \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 2. Check PayMongo webhook logs
# Login to dashboard → Developers → Webhooks → View Logs

# 3. Verify webhook secret matches
grep PAYMONGO_WEBHOOK_SECRET ~/Fuel-FInder/backend/.env

# 4. Restart server
pm2 restart all
```

---

### If Payments Aren't Processing

```bash
# 1. Check PayMongo is enabled
pm2 logs | grep "Fuel Donations"

# 2. Verify API keys are live (not test)
grep PAYMONGO_SECRET_KEY ~/Fuel-FInder/backend/.env
# Should start with sk_live_ not sk_test_

# 3. Check PayMongo dashboard for API errors

# 4. Test endpoint manually
curl -X POST https://fuelfinder.duckdns.org/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "cause": "ambulance"}'
```

---

### If Database Issues

```bash
# Check database connection
curl https://fuelfinder.duckdns.org/api/health

# View recent errors
pm2 logs --err --lines 100

# Restart server
pm2 restart all
```

---

## 🎓 For Your Thesis

### Mention in Chapter 4 - Results

```
4.X Community Donation System Implementation

The system successfully integrated PayMongo payment gateway to enable 
community-funded donations for fuel subsidies. After completing business 
verification requirements, the system was deployed in live mode and 
achieved the following results:

- Total donations received: ₱[X,XXX] over [Y] months
- Number of transactions: [Z] donations
- Payment success rate: [XX]%
- Average donation amount: ₱[XX]
- Unique donors: [X] individuals

The system demonstrated reliable webhook processing with [XX]% uptime 
and successfully distributed funds to [X] verified beneficiaries including
the Oriental Mindoro Provincial Hospital and local transport cooperatives.

Impact metrics calculated:
- Liters of fuel funded: [X,XXX]L
- Ambulance trips enabled: [XX] trips
- Public transport vehicles supported: [X] buses
```

---

## 📞 Support Contacts

**PayMongo Support**
- Email: developers@paymongo.com
- Dashboard: https://dashboard.paymongo.com
- Docs: https://developers.paymongo.com/docs
- Community: https://community.paymongo.com

**Emergency Contacts**
- Technical Issues: [Your email]
- Business Inquiries: [Your email]
- Donor Support: [Support email]

---

## 🎯 Success Milestones

Track your progress:

- [ ] **Week 1**: PayMongo business verified
- [ ] **Week 2**: Live mode enabled and tested
- [ ] **Week 3**: First 10 real donations received
- [ ] **Month 1**: ₱1,000 raised
- [ ] **Month 2**: ₱5,000 raised, first transparency report
- [ ] **Month 3**: ₱10,000+ raised, LGU partnership active
- [ ] **Month 6**: Sustained monthly donations, thesis completed

---

**Good luck with your launch! 🚀**

Remember: Start small, test thoroughly, monitor closely, and scale gradually.

---

*Last Updated: October 15, 2025*  
*Version: 1.0*  
*Status: Ready for Verification*
