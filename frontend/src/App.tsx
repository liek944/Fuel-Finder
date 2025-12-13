import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import MainApp from "./components/MainApp";
import AdminPortalContainer from "./components/admin/AdminPortalContainer";
import OwnerLogin from "./components/owner/OwnerLogin";
import OwnerDashboard from "./components/owner/OwnerDashboard";
import About from "./components/About";
import Contact from "./components/Contact";
import NearbyStations from "./components/NearbyStations";
import { OwnerThemeProvider } from "./contexts/OwnerThemeContext";
import "./App.css";

/**
 * Extract subdomain from hostname
 * Examples:
 * - ifuel-dangay.fuelfinder.com -> "ifuel-dangay"
 * - ifuel-dangay-portal.netlify.app -> "ifuel-dangay" (Netlify deployment)
 * - localhost:3000 -> null
 * - fuelfinder.com -> null
 * - fuelfinderths.netlify.app -> null (main app)
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

  // SPECIAL: Detect Netlify/Vercel owner portal deployments
  // Pattern: owner-name-portal.netlify.app or owner-name-portal.vercel.app
  const hostingProviders = ['netlify.app', 'vercel.app', 'herokuapp.com', 'onrender.com'];
  const domain = parts.slice(-2).join('.');
  if (hostingProviders.includes(domain)) {
    const siteName = parts[0]; // e.g., "ifuel-dangay-portal" or "fuelfinderths"

    // Check if this is an owner portal (contains "-portal" in the name)
    if (siteName.includes('-portal')) {
      // Extract owner name: "ifuel-dangay-portal" -> "ifuel-dangay"
      const ownerName = siteName.replace('-portal', '');
      console.log('🔍 Detected Netlify owner portal:', ownerName);
      return ownerName;
    }

    // Otherwise, it's the main app deployment
    return null;
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
      <OwnerThemeProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/owner/login" element={<OwnerLogin subdomain={subdomain} />} />
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="*" element={<Navigate to="/owner/login" replace />} />
            </Routes>
          </div>
        </Router>
      </OwnerThemeProvider>
    );
  }

  // Main app routing (no subdomain or reserved subdomain)
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main user-facing app */}
          <Route path="/" element={<MainApp />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/nearby-stations" element={<NearbyStations />} />

          {/* Admin portal */}
          <Route path="/admin" element={<AdminPortalContainer />} />

          {/* Redirect any unknown routes to main app */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer style={{ textAlign: "center", padding: "8px 0", fontSize: 12 }}>
          <Link to="/about" style={{ color: "#1976D2", textDecoration: "none", fontWeight: 600 }}>
            About
          </Link>
        </footer>
      </div>
    </Router>
  );
}

export default App;
