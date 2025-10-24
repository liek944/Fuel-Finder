# Owner Dashboard Implementation Plan

## Current Status ✅

**Backend (Complete):**
- ✅ Owner detection via subdomain (ifuel-dangay.duckdns.org)
- ✅ API key authentication
- ✅ Owner-specific API endpoints
- ✅ Data filtering by owner_id
- ✅ Audit logging

**Frontend (Needs Implementation):**
- ❌ Owner dashboard UI (not built yet)
- ❌ Owner login/authentication UI
- ❌ Owner station management interface

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DNS Configuration                        │
├─────────────────────────────────────────────────────────────┤
│ fuelfinder.duckdns.org      →  EC2 Server (All Stations)   │
│ ifuel-dangay.duckdns.org    →  EC2 Server (iFuel Only)     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Express Backend (EC2)                     │
│                                                             │
│  Middleware: detectOwner()                                  │
│  • Checks hostname                                          │
│  • If "ifuel-dangay" → sets req.owner                       │
│  • Filters all data by owner_id                             │
│                                                             │
│  API Endpoints:                                             │
│  • /api/owner/info          (public)                        │
│  • /api/owner/dashboard     (requires API key)              │
│  • /api/owner/stations      (requires API key)              │
│  • /api/owner/price-reports (requires API key)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Options                         │
├─────────────────────────────────────────────────────────────┤
│ Option 1: Separate Owner Dashboard App                     │
│ Option 2: Same Frontend with Role Detection                │
│ Option 3: Owner Portal in Existing Admin Panel             │
└─────────────────────────────────────────────────────────────┘
```

---

## Option 1: Separate Owner Dashboard (Recommended)

Create a dedicated owner dashboard that's simpler than the admin portal.

### File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── owner/                    # New owner components
│   │   │   ├── OwnerDashboard.tsx   # Main dashboard
│   │   │   ├── OwnerLogin.tsx       # API key login
│   │   │   ├── StationManager.tsx   # Manage own station
│   │   │   ├── PriceReportList.tsx  # Pending reports
│   │   │   └── StatsPanel.tsx       # Analytics
│   │   └── admin/                    # Existing admin (super admin)
│   │       └── AdminPortal.tsx
│   └── App.tsx                       # Route detection
```

### Implementation Steps

#### Step 1: Detect Domain and Show Appropriate UI

**Update `src/App.tsx`:**

```tsx
import { useEffect, useState } from 'react';
import MainApp from './MainApp';
import AdminPortal from './components/admin/AdminPortal';
import OwnerDashboard from './components/owner/OwnerDashboard';

function App() {
  const [userRole, setUserRole] = useState<'public' | 'owner' | 'admin'>('public');
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Detect owner subdomain
    if (hostname.includes('ifuel-dangay')) {
      setUserRole('owner');
    } 
    // Super admin portal (you can use /admin route or specific domain)
    else if (window.location.pathname.startsWith('/admin')) {
      setUserRole('admin');
    } 
    else {
      setUserRole('public');
    }
  }, []);

  // Render appropriate interface
  if (userRole === 'owner') {
    return <OwnerDashboard />;
  }
  
  if (userRole === 'admin') {
    return <AdminPortal />;
  }
  
  return <MainApp />;
}

export default App;
```

#### Step 2: Create Owner Dashboard Component

**Create `src/components/owner/OwnerDashboard.tsx`:**

```tsx
import { useState, useEffect } from 'react';

interface OwnerData {
  name: string;
  domain: string;
  total_stations: number;
  verified_reports: number;
  pending_reports: number;
}

const OwnerDashboard = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('owner_api_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [error, setError] = useState('');

  // API Base URL
  const API_URL = window.location.origin; // Uses current domain

  // Login with API key
  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/api/owner/dashboard`, {
        headers: {
          'x-api-key': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOwnerData(data);
        setIsAuthenticated(true);
        localStorage.setItem('owner_api_key', apiKey);
        setError('');
      } else {
        setError('Invalid API key');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  // Auto-login if API key exists
  useEffect(() => {
    if (apiKey) {
      handleLogin();
    }
  }, []);

  // Logout
  const handleLogout = () => {
    setApiKey('');
    setIsAuthenticated(false);
    localStorage.removeItem('owner_api_key');
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
            🏢 Owner Portal
          </h2>
          <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
            Enter your API key to access your station dashboard
          </p>
          
          <input
            type="password"
            placeholder="Enter API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          
          {error && (
            <div style={{ 
              color: '#e74c3c', 
              marginBottom: '15px',
              padding: '10px',
              background: '#ffe6e6',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{ownerData?.name}</h1>
          <p style={{ margin: '5px 0 0', color: '#666' }}>
            Domain: {ownerData?.domain}.duckdns.org
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <StatCard
          title="Total Stations"
          value={ownerData?.total_stations || 0}
          icon="🏢"
          color="#3498db"
        />
        <StatCard
          title="Verified Reports"
          value={ownerData?.verified_reports || 0}
          icon="✅"
          color="#2ecc71"
        />
        <StatCard
          title="Pending Reports"
          value={ownerData?.pending_reports || 0}
          icon="⏳"
          color="#f39c12"
        />
      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>🛠️ Quick Actions</h2>
        <p>More features coming soon: station management, price verification, analytics...</p>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }: any) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
    <h3 style={{ margin: '0 0 5px', color: '#666', fontSize: '14px' }}>
      {title}
    </h3>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color: color }}>
      {value}
    </div>
  </div>
);

export default OwnerDashboard;
```

#### Step 3: Configure DNS

In DuckDNS, add:
```
ifuel-dangay.duckdns.org → <your-ec2-ip>
```

#### Step 4: Deploy

```bash
cd frontend
npm run build
# Deploy to Vercel/Netlify
```

---

## Option 2: Use Admin Portal with Role Detection (Simpler)

Modify existing AdminPortal.tsx to detect owner vs super admin.

---

## Option 3: Quick Test Without Frontend

Test the owner API directly:

```bash
# Get owner info
curl https://ifuel-dangay.duckdns.org/api/owner/info

# Get dashboard (with API key)
curl -H "x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=" \
     https://ifuel-dangay.duckdns.org/api/owner/dashboard
```

---

## Summary

✅ **Backend is ready** - Owner API works  
❌ **Frontend needs building** - Create owner dashboard UI  
🎯 **Goal:** When owner visits `ifuel-dangay.duckdns.org`, they see a simple dashboard with:
- Station stats
- Price report management
- Limited editing (their station only)

Super admin (`fuelfinder.duckdns.org/admin`) has full control over everything.
