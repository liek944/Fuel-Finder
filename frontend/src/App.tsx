import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import MainApp from "./components/MainApp";
import AdminPortal from "./components/AdminPortal";
import OwnerLogin from "./components/owner/OwnerLogin";
import OwnerDashboard from "./components/owner/OwnerDashboard";
import "./App.css";

/**
 * Extract subdomain from hostname
 * Examples:
 * - ifuel-dangay.fuelfinder.com -> "ifuel-dangay"
 * - localhost:3000 -> null
 * - fuelfinder.com -> null
 * - fuelfinderths.netlify.app -> null (hosting provider, not owner subdomain)
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Split by dots
  const parts = host.split('.');
  
  // Handle localhost or IP addresses
  if (parts.length <= 1 || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }
  
  // Ignore hosting provider domains (not owner subdomains)
  const hostingProviders = ['netlify.app', 'vercel.app', 'herokuapp.com', 'onrender.com'];
  const domain = parts.slice(-2).join('.');
  if (hostingProviders.includes(domain)) {
    return null; // Don't treat netlify/vercel subdomains as owner subdomains
  }
  
  // For DuckDNS: only detect if it matches owner pattern (owner-name.duckdns.org)
  // Main backend is fuelfinder.duckdns.org (no subdomain)
  if (host.includes('duckdns.org')) {
    if (parts.length === 3) {
      const subdomain = parts[0];
      // Only treat as owner subdomain if it's NOT the main backend domain
      if (subdomain !== 'fuelfinder') {
        return subdomain;
      }
    }
    return null;
  }
  
  // For production custom domain: subdomain.fuelfinder.com
  if (parts.length >= 3 && host.includes('fuelfinder.com')) {
    const subdomain = parts[0];
    
    // Ignore common prefixes that aren't owner subdomains
    if (subdomain === 'www' || subdomain === 'api' || subdomain === 'admin') {
      return null;
    }
    
    return subdomain;
  }
  
  return null;
}

function App() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [isOwnerPortal, setIsOwnerPortal] = useState(false);

  useEffect(() => {
    // Detect subdomain from hostname
    const hostname = window.location.hostname;
    const detectedSubdomain = extractSubdomain(hostname);
    
    console.log('🔍 Hostname:', hostname);
    console.log('🔍 Detected subdomain:', detectedSubdomain);
    
    setSubdomain(detectedSubdomain);
    setIsOwnerPortal(!!detectedSubdomain);
  }, []);

  // Owner subdomain detected - show owner portal
  if (isOwnerPortal && subdomain) {
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/owner/login" element={<OwnerLogin subdomain={subdomain} />} />
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="*" element={<Navigate to="/owner/login" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  // Main app routing (no subdomain or reserved subdomain)
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main user-facing app */}
          <Route path="/" element={<MainApp />} />

          {/* Admin portal */}
          <Route path="/admin" element={<AdminPortal />} />

          {/* Redirect any unknown routes to main app */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
