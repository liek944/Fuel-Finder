import React, { useEffect, useState } from "react";
import { apiGet } from "../../utils/api";
import StationsTabContainer from "./stations/StationsTabContainer.tsx";
import { ReviewsManagement } from "../ReviewsManagement.tsx";
import UserAnalytics from "../UserAnalytics.tsx";
import "../../styles/AdminPortal.css";

const AdminPortalContainer: React.FC = () => {
  const [adminApiKey, setAdminApiKey] = useState<string>("");
  const [adminValidated, setAdminValidated] = useState<boolean>(false);
  const [adminValidating, setAdminValidating] = useState<boolean>(false);
  const [currentAdminView, setCurrentAdminView] = useState<
    "map" | "user-analytics" | "reviews"
  >("map");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("admin_api_key") || "";
      if (savedKey) {
        setAdminApiKey(savedKey);
        validateAdminKey(savedKey).then((ok) => {
          if (ok) setAdminValidated(true);
          else localStorage.removeItem("admin_api_key");
        });
      }
    } catch (_) {}
  }, []);

  const validateAdminKey = async (keyToTest: string) => {
    if (!keyToTest.trim()) return false;
    setAdminValidating(true);
    try {
      const response = await apiGet("/api/admin/debug", keyToTest.trim());
      if (response.ok) {
        const data = await response.json();
        return !!data?.keyMatch;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setAdminValidating(false);
    }
  };

  const handleEnable = async () => {
    const ok = await validateAdminKey(adminApiKey);
    if (ok) {
      try {
        localStorage.setItem("admin_api_key", adminApiKey.trim());
      } catch {}
      setAdminValidated(true);
    } else {
      alert("Invalid API key. Please check your key and try again.");
    }
  };

  const handleDisable = () => {
    try {
      localStorage.removeItem("admin_api_key");
    } catch {}
    setAdminApiKey("");
    setAdminValidated(false);
  };

  const isAdminEnabled = adminValidated;

  return (
    <div className="admin-portal">
      <div
        className={`mobile-menu-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      {/* Navigation */}
      <div className="admin-portal-navigation">
        <a href="/" className="back-to-map-button">
          ← Back to Map
        </a>
        <div className="admin-portal-header">
          <img src="/logo.jpeg" alt="Fuel Finder Logo" className="admin-portal-logo" />
          <h1 className="admin-portal-title">Admin Portal</h1>
        </div>

        {isAdminEnabled && (
          <button
            className="hamburger-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={mobileMenuOpen ? "open" : ""}></span>
            <span className={mobileMenuOpen ? "open" : ""}></span>
            <span className={mobileMenuOpen ? "open" : ""}></span>
          </button>
        )}

        {/* View Switcher */}
        {isAdminEnabled && (
          <div className={`view-switcher ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <button
              onClick={() => {
                setCurrentAdminView("map");
                setMobileMenuOpen(false);
              }}
              className={`view-switcher-button ${currentAdminView === "map" ? "active" : ""}`}
            >
              🗺️ Map View
            </button>
            <button
              onClick={() => {
                setCurrentAdminView("user-analytics");
                setMobileMenuOpen(false);
              }}
              className={`view-switcher-button ${currentAdminView === "user-analytics" ? "active" : ""}`}
            >
              👥 User Analytics
            </button>
            <button
              onClick={() => {
                setCurrentAdminView("reviews");
                setMobileMenuOpen(false);
              }}
              className={`view-switcher-button ${currentAdminView === "reviews" ? "active" : ""}`}
            >
              📝 Reviews
            </button>
          </div>
        )}
        <div className={`admin-status ${isAdminEnabled ? "enabled" : "disabled"}`}>
          {isAdminEnabled ? "✅ Admin Enabled" : "❌ Admin Disabled"}
        </div>
      </div>

      {/* Content */}
      {currentAdminView === "user-analytics" ? (
        <div className="user-analytics-container">
          <UserAnalytics />
        </div>
      ) : currentAdminView === "reviews" ? (
        <div className="admin-content">
          <div className="admin-content-offset" />
          <ReviewsManagement adminApiKey={adminApiKey} />
        </div>
      ) : (
        <StationsTabContainer
          adminApiKey={adminApiKey}
          isAdminEnabled={isAdminEnabled}
          adminValidating={adminValidating}
          onChangeApiKey={setAdminApiKey}
          onEnableAdmin={handleEnable}
          onDisableAdmin={handleDisable}
        />
      )}
    </div>
  );
};

export default AdminPortalContainer;
