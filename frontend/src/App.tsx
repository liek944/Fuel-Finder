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
  
  // For development: ifuel-dangay.localhost or ifuel-dangay.duckdns.org
  if (parts.length === 2 && (parts[1] === 'localhost' || host.includes('duckdns'))) {
    return parts[0];
  }
  
  // For production: subdomain.fuelfinder.com
  if (parts.length >= 3) {
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
