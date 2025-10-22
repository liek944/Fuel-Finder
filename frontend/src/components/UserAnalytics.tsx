import React, { useState, useEffect } from "react";
import { apiGet } from "../utils/api";
import "../styles/UserAnalytics.css";

// Get admin API key from localStorage (set by AdminPortal)
const getAdminApiKey = (): string => {
  return localStorage.getItem("admin_api_key") || "";
};

interface UserStats {
  activeUsers: number;
  timestamp: number;
  deviceBreakdown: {
    Mobile: number;
    Desktop: number;
    Tablet: number;
    Unknown: number;
  };
  locationBreakdown: {
    [region: string]: number;
  };
  featureUsage: {
    [feature: string]: number;
  };
  pageBreakdown: {
    [page: string]: number;
  };
  sessionStats: {
    averageDurationMinutes: number;
    longestSessionMinutes: number;
  };
  recentSessions: Array<{
    sessionId: string;
    device: string;
    location: string;
    duration: string;
    pageViews: number;
    currentPage: string;
  }>;
}

interface ActiveUser {
  sessionId: string;
  device: string;
  location: {
    lat: number;
    lng: number;
    display: string;
  } | null;
  duration: number;
  pageViews: number;
  currentPage: string;
  lastActive: string;
}

const UserAnalytics: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const apiKey = getAdminApiKey();
      console.log(
        "📊 Fetching user stats with API key:",
        apiKey ? "Present" : "Missing",
      );

      const response = await apiGet("/api/admin/users/stats", apiKey);

      console.log("📊 Stats response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Stats data:", data);

        if (data.success) {
          setStats(data.stats);
          setLastUpdated(new Date());
          setError(null);
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Stats fetch failed:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch user stats:", err);
      setError(err.message || "Failed to load statistics");
    }
  };

  // Fetch active users
  const fetchActiveUsers = async () => {
    try {
      const apiKey = getAdminApiKey();
      console.log(
        "👥 Fetching active users with API key:",
        apiKey ? "Present" : "Missing",
      );

      const response = await apiGet("/api/admin/users/active", apiKey);

      console.log("👥 Active users response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("👥 Active users data:", data);

        if (data.success) {
          setActiveUsers(data.users);
        }
      } else {
        console.error("❌ Active users fetch failed:", response.status);
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch active users:", err);
    }
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchActiveUsers()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
      fetchActiveUsers();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading user analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="no-data-container">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="user-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h2>👥 User Analytics</h2>
          {lastUpdated && (
            <div className="last-updated-info">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="analytics-controls">
          <label className="auto-refresh-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="auto-refresh-checkbox"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={() => {
              fetchStats();
              fetchActiveUsers();
            }}
            className="refresh-button"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Help message when no users */}
      {stats.activeUsers === 0 && (
        <div className="no-users-warning">
          <h3>ℹ️ No Active Users Detected</h3>
          <p>
            The dashboard shows users who have visited the main app in the last
            5 minutes.
          </p>
          <p>
            <strong>To test:</strong> Open the main Fuel Finder app in another
            browser tab or device, then return here. You should see at least 1
            active user (yourself!) within 60 seconds.
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#666" }}>
            💡 Check the browser console for heartbeat logs to verify tracking
            is working.
          </p>
        </div>
      )}

      {/* Active Users Overview */}
      <div className="stats-grid-container">
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon="👤"
          color="#4CAF50"
        />
        <StatCard
          title="Avg Session"
          value={`${stats.sessionStats.averageDurationMinutes}m`}
          icon="⏱️"
          color="#2196F3"
        />
        <StatCard
          title="Longest Session"
          value={`${stats.sessionStats.longestSessionMinutes}m`}
          icon="🏆"
          color="#FF9800"
        />
      </div>

      {/* Device Breakdown */}
      <div className="breakdown-section">
        <h3>📱 Device Breakdown</h3>
        <div className="breakdown-grid">
          {Object.entries(stats.deviceBreakdown).map(([device, count]) => (
            <div key={device} className="breakdown-item">
              <div className="breakdown-item-value">{count}</div>
              <div className="breakdown-item-label">
                {device === "Mobile" && "📱"}
                {device === "Desktop" && "💻"}
                {device === "Tablet" && "📲"}
                {device === "Unknown" && "❓"} {device}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Location Breakdown */}
      {Object.keys(stats.locationBreakdown).length > 0 && (
        <div className="breakdown-section">
          <h3>📍 Location Breakdown</h3>
          <div className="flex-wrap-container">
            {Object.entries(stats.locationBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([region, count]) => (
                <div key={region} className="location-item">
                  <strong>{count}</strong> user{count !== 1 ? "s" : ""} in{" "}
                  {region}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Page Breakdown */}
      {Object.keys(stats.pageBreakdown).length > 0 && (
        <div className="breakdown-section">
          <h3>📄 Current Pages</h3>
          <div className="breakdown-grid">
            {Object.entries(stats.pageBreakdown).map(([page, count]) => (
              <div key={page} className="page-item">
                <div className="page-item-value">{count}</div>
                <div className="page-item-label">{page}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Usage */}
      {Object.keys(stats.featureUsage).length > 0 && (
        <div className="breakdown-section">
          <h3>✨ Feature Usage</h3>
          <div className="flex-wrap-container">
            {Object.entries(stats.featureUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([feature, count]) => (
                <div key={feature} className="feature-item">
                  <strong>{count}</strong> × {feature}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {stats.recentSessions.length > 0 && (
        <div className="breakdown-section">
          <h3>🕐 Recent Sessions</h3>
          <div className="sessions-table-container">
            <table className="sessions-table">
              <thead className="sessions-table-header">
                <tr>
                  <th className="sessions-table-header-cell">Session</th>
                  <th className="sessions-table-header-cell">Device</th>
                  <th className="sessions-table-header-cell">Location</th>
                  <th className="sessions-table-header-cell">Duration</th>
                  <th className="sessions-table-header-cell">Page Views</th>
                  <th className="sessions-table-header-cell">Current Page</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSessions.map((session, index) => (
                  <tr key={session.sessionId}>
                    <td className="sessions-table-cell">
                      <code className="session-id-code">
                        {session.sessionId}
                      </code>
                    </td>
                    <td className="sessions-table-cell">{session.device}</td>
                    <td className="sessions-table-cell">{session.location}</td>
                    <td className="sessions-table-cell">{session.duration}</td>
                    <td className="sessions-table-cell">{session.pageViews}</td>
                    <td className="sessions-table-cell">
                      {session.currentPage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className="stat-card-item" style={{ borderLeft: `4px solid ${color}` }}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-value">{value}</div>
    <div className="stat-card-title">{title}</div>
  </div>
);

export default UserAnalytics;
