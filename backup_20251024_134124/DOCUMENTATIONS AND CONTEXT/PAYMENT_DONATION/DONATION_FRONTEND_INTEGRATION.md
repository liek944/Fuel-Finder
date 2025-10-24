# 💻 Donation Widget - Frontend Integration Guide

**Widget**: DonationWidget.tsx  
**Status**: ✅ Ready to Integrate  
**Time**: 15-30 minutes  
**Difficulty**: Easy

---

## 📋 Table of Contents

1. [Quick Integration](#quick-integration)
2. [Placement Options](#placement-options)
3. [Customization](#customization)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Integration

### Option 1: Add to MainApp (Recommended)

**File**: `frontend/src/components/MainApp.tsx`

```typescript
// 1. Import the widget
import DonationWidget from './DonationWidget';
import { useState } from 'react';

// 2. Inside your component, add state
const [showDonations, setShowDonations] = useState(false);

// 3. Add a button to open the widget (place in your header/menu)
<button 
  className="donate-button"
  onClick={() => setShowDonations(true)}
  style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  }}
>
  💝 Donate
</button>

// 4. Add the widget (renders as full-screen overlay)
{showDonations && (
  <DonationWidget onClose={() => setShowDonations(false)} />
)}
```

---

### Option 2: Floating Action Button (FAB)

Add a persistent floating button in the corner:

**File**: `frontend/src/components/MainApp.tsx`

```typescript
// Add this CSS in MainApp.css or DonationWidget.css
.floating-donate-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  z-index: 999;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.floating-donate-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 28px rgba(102, 126, 234, 0.5);
}

@media (max-width: 768px) {
  .floating-donate-button {
    bottom: 16px;
    right: 16px;
    padding: 12px 20px;
    font-size: 14px;
  }
}
```

```typescript
// In MainApp.tsx
<button 
  className="floating-donate-button"
  onClick={() => setShowDonations(true)}
>
  💝 Support Community
</button>

{showDonations && (
  <DonationWidget onClose={() => setShowDonations(false)} />
)}
```

---

### Option 3: Navigation Menu Item

Add to your navigation menu:

```typescript
// In your navigation component
<nav className="navbar">
  <a href="/">Home</a>
  <a href="/stations">Stations</a>
  <a href="/about">About</a>
  <button 
    onClick={() => setShowDonations(true)}
    className="nav-donate-btn"
  >
    💝 Donate
  </button>
</nav>

{showDonations && (
  <DonationWidget onClose={() => setShowDonations(false)} />
)}
```

---

## 📍 Placement Options

### Best Practices

**✅ Recommended Placements:**
- Floating action button (bottom-right corner)
- Header navigation bar
- Homepage hero section
- About page / Community section
- Station detail pages

**❌ Avoid:**
- Blocking critical UI elements
- Auto-opening on page load (annoying)
- Multiple donation buttons on same page
- During navigation flows

---

### Example: Homepage Hero Section

```typescript
// In your homepage
<div className="hero-section">
  <h1>Find Fuel Stations in Oriental Mindoro</h1>
  <p>Real-time prices, navigation, and community support</p>
  
  <div className="hero-buttons">
    <button className="primary-btn">Find Stations</button>
    <button 
      className="secondary-btn"
      onClick={() => setShowDonations(true)}
    >
      💝 Support Our Community
    </button>
  </div>
</div>
```

---

### Example: Station Detail Page

```typescript
// In station detail view
<div className="station-actions">
  <button onClick={navigateToStation}>Navigate</button>
  <button onClick={reportPrice}>Report Price</button>
  <button onClick={() => setShowDonations(true)}>
    💝 Donate
  </button>
</div>
```

---

## 🎨 Customization

### Change Default Cause

```typescript
// Modify DonationWidget.tsx line ~27
const [cause, setCause] = useState<string>('ambulance'); // Change default
```

### Change Preset Amounts

```typescript
// Modify DonationWidget.tsx line ~34
const presetAmounts = [10, 20, 50, 100, 200, 500]; // Customize amounts
```

### Change Default Amount

```typescript
// Modify DonationWidget.tsx line ~26
const [amount, setAmount] = useState<number>(50); // Change default
```

### Add Custom Cause

```typescript
// Modify DonationWidget.tsx lines ~36-41
const causes = [
  { value: 'ambulance', label: '🚑 Ambulance Services', description: '...' },
  { value: 'public_transport', label: '🚌 Public Transport', description: '...' },
  { value: 'emergency', label: '🚨 Emergency Services', description: '...' },
  { value: 'general', label: '💙 General Fund', description: '...' },
  // Add new cause:
  { value: 'education', label: '📚 Education Support', description: 'School fuel support' },
];
```

**Don't forget to update backend** (`server.js` line 2301):
```javascript
const validCauses = ['ambulance', 'public_transport', 'emergency', 'general', 'education'];
```

---

### Custom Styling

Override styles in your main CSS:

```css
/* Change primary color */
.donation-widget .donate-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

/* Change header color */
.donation-widget .donation-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

/* Smaller max width */
.donation-widget {
  max-width: 400px;
}

/* Custom animation */
.donation-widget {
  animation: slideInRight 0.4s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
```

---

## 🧪 Testing

### Test Checklist

After integration:

**Visual Tests:**
- [ ] Button appears in correct location
- [ ] Button is clickable
- [ ] Widget opens as overlay
- [ ] Widget centers on screen
- [ ] Close button works
- [ ] Form fields are accessible
- [ ] Preset buttons are clickable
- [ ] Tabs switch correctly (Donate Now / Recent Donors)

**Functional Tests:**
- [ ] Amount validation works (min ₱10, max ₱10,000)
- [ ] Cause selector works
- [ ] Optional fields work (name, email, notes)
- [ ] Donate button enabled/disabled correctly
- [ ] API call succeeds
- [ ] Payment URL opens in new tab/window
- [ ] Stats display correctly
- [ ] Recent donations load

**Mobile Tests:**
- [ ] Widget is responsive on mobile
- [ ] Button is tap-friendly
- [ ] Form is usable on small screens
- [ ] Overlay scrolls if needed
- [ ] Close button accessible on mobile

**Browser Tests:**
- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓
- [ ] Mobile Chrome ✓
- [ ] Mobile Safari ✓

---

### Manual Test Procedure

1. **Open your frontend**
   ```bash
   cd frontend
   npm start
   ```

2. **Click donate button**
   - Widget should open smoothly
   - No console errors

3. **Try form interactions**
   - Select different preset amounts
   - Type custom amount
   - Change cause
   - Enter name and email
   - Type notes

4. **Submit test donation** (in test mode)
   - Click "Donate ₱50" button
   - Should see "Processing..."
   - Should redirect to PayMongo checkout
   - Complete test payment
   - Return to app
   - Check stats updated

---

## 🐛 Troubleshooting

### Issue: Widget doesn't appear

**Check:**
```typescript
// 1. Import is correct
import DonationWidget from './DonationWidget';

// 2. State is declared
const [showDonations, setShowDonations] = useState(false);

// 3. Conditional rendering is correct
{showDonations && <DonationWidget onClose={() => setShowDonations(false)} />}

// 4. Button sets state
onClick={() => setShowDonations(true)}
```

**Debug:**
```typescript
// Add console logs
const [showDonations, setShowDonations] = useState(false);

useEffect(() => {
  console.log('showDonations:', showDonations);
}, [showDonations]);
```

---

### Issue: Styles not loading

**Check:**
```typescript
// CSS import is present
import './DonationWidget.css';
```

**Check file location:**
```
frontend/src/components/
  ├── DonationWidget.tsx ✓
  ├── DonationWidget.css ✓
  └── MainApp.tsx
```

---

### Issue: API calls fail

**Check backend URL:**
```typescript
// In DonationWidget.tsx
const response = await fetch(`${process.env.REACT_APP_API_URL}/api/donations/stats`);
```

**Verify environment variable:**
```bash
# In frontend/.env
REACT_APP_API_URL=https://fuelfinder.duckdns.org

# Or for local testing:
REACT_APP_API_URL=http://localhost:3001
```

**Check CORS:**
Backend must allow frontend origin in `server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://fuelfinder.duckdns.org',
  'https://your-frontend-domain.com'
];
```

---

### Issue: TypeScript errors

**Common fixes:**
```typescript
// If React import error
import React, { useState, useEffect } from 'react';

// If CSS import error (add type declaration)
// Create: frontend/src/custom.d.ts
declare module '*.css';

// If environment variable error
// Create: frontend/src/react-app-env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_API_URL: string;
  }
}
```

---

### Issue: Payment URL doesn't open

**Check for popup blockers:**
```typescript
// Alternative: Open in same tab
window.location.href = data.payment_url;

// Or force new window
window.open(data.payment_url, '_blank', 'noopener,noreferrer');
```

---

## 📱 Mobile Considerations

### Ensure Mobile Responsiveness

The widget is already responsive, but test:

```css
/* These breakpoints are already in DonationWidget.css */
@media (max-width: 600px) {
  .donation-widget {
    max-width: 100%;
    width: 100%;
    border-radius: 16px 16px 0 0;
  }
}
```

### Mobile Payment Methods

PayMongo checkout automatically:
- ✅ Detects mobile device
- ✅ Shows mobile-optimized UI
- ✅ Enables mobile wallets (GCash, PayMaya)
- ✅ Works with in-app browsers

---

## 🎯 Best Practices

### User Experience

**Do:**
- ✅ Make donate button prominent but not intrusive
- ✅ Show impact metrics clearly
- ✅ Allow anonymous donations
- ✅ Provide receipt option (email)
- ✅ Show recent donors for social proof

**Don't:**
- ❌ Auto-open donation widget
- ❌ Require account/login to donate
- ❌ Hide close button
- ❌ Use misleading button text
- ❌ Make donation mandatory

---

### Performance

```typescript
// Lazy load widget if needed
const DonationWidget = React.lazy(() => import('./DonationWidget'));

// Use with Suspense
<Suspense fallback={<div>Loading...</div>}>
  {showDonations && <DonationWidget onClose={() => setShowDonations(false)} />}
</Suspense>
```

---

### Analytics (Optional)

Track donation funnel:

```typescript
// When donate button clicked
onClick={() => {
  setShowDonations(true);
  // Track event
  if (window.gtag) {
    window.gtag('event', 'donation_widget_opened');
  }
}}

// When donation created
if (data.success) {
  // Track conversion
  if (window.gtag) {
    window.gtag('event', 'donation_created', {
      value: amount,
      cause: cause
    });
  }
  window.location.href = data.payment_url;
}
```

---

## ✅ Integration Checklist

Before considering integration complete:

**Setup**
- [ ] DonationWidget.tsx exists in components/
- [ ] DonationWidget.css exists in components/
- [ ] Import added to MainApp.tsx
- [ ] State declared for showDonations
- [ ] Environment variable REACT_APP_API_URL set

**UI**
- [ ] Donate button added and styled
- [ ] Button placement decided and implemented
- [ ] Widget opens on button click
- [ ] Widget closes on close button
- [ ] Widget closes on overlay click (optional)

**Functionality**
- [ ] Form validation works
- [ ] API calls succeed
- [ ] Payment URL redirects work
- [ ] Stats load correctly
- [ ] Recent donations display

**Testing**
- [ ] Desktop browsers tested
- [ ] Mobile browsers tested
- [ ] Test donation completed successfully
- [ ] No console errors
- [ ] No TypeScript errors

**Polish**
- [ ] Styling matches app design
- [ ] Animations smooth
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Mobile responsive

---

## 🚀 Quick Start Commands

```bash
# 1. Ensure files exist
ls frontend/src/components/DonationWidget.*
# Should show: DonationWidget.tsx, DonationWidget.css

# 2. Check environment variables
cat frontend/.env
# Should show: REACT_APP_API_URL=...

# 3. Start frontend
cd frontend
npm start

# 4. Open browser
# http://localhost:3000

# 5. Click donate button and test!
```

---

## 📚 Related Documentation

- **Setup Guide**: `DONATION_SYSTEM_SETUP.md`
- **Going Live Guide**: `DONATION_GOING_LIVE_GUIDE.md`
- **Implementation Summary**: `DONATION_IMPLEMENTATION_SUMMARY.md`
- **E-Payment Guide**: `E_PAYMENT_INTEGRATION_GUIDE.md`

---

**Happy integrating! 💝**

*If you encounter any issues, check the troubleshooting section or refer to the React/TypeScript documentation.*

---

*Last Updated: October 15, 2025*  
*Version: 1.0*
