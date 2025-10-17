import React, { useState, useEffect } from "react";
import { apiGet } from "../utils/api";

// Get admin API key from localStorage (set by AdminPortal)
const getAdminApiKey = (): string => {
  return localStorage.getItem('admin_api_key') || '';
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
      console.log('📊 Fetching user stats with API key:', apiKey ? 'Present' : 'Missing');
      
      const response = await apiGet("/api/admin/users/stats", apiKey);
      
      console.log('📊 Stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Stats data:', data);
        
        if (data.success) {
          setStats(data.stats);
          setLastUpdated(new Date());
          setError(null);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Stats fetch failed:', response.status, errorText);
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
      console.log('👥 Fetching active users with API key:', apiKey ? 'Present' : 'Missing');
      
      const response = await apiGet("/api/admin/users/active", apiKey);
      
      console.log('👥 Active users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Active users data:', data);
        
        if (data.success) {
          setActiveUsers(data.users);
        }
      } else {
        console.error('❌ Active users fetch failed:', response.status);
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
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>Loading user analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "#f44336" }}>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 20 }}>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>👥 User Analytics</h2>
          {lastUpdated && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 14 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: 5 }}
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={() => {
              fetchStats();
              fetchActiveUsers();
            }}
            style={{
              padding: "6px 12px",
              background: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Help message when no users */}
      {stats.activeUsers === 0 && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", color: "#856404" }}>
            ℹ️ No Active Users Detected
          </h3>
          <p style={{ margin: "0 0 12px 0", fontSize: 14 }}>
            The dashboard shows users who have visited the main app in the last 5 minutes.
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>To test:</strong> Open the main Fuel Finder app in another browser tab or device,
            then return here. You should see at least 1 active user (yourself!) within 60 seconds.
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#666" }}>
            💡 Check the browser console for heartbeat logs to verify tracking is working.
          </p>
        </div>
      )}

      {/* Active Users Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 15,
          marginBottom: 20,
        }}
      >
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
      <div style={{ marginBottom: 20 }}>
        <h3>📱 Device Breakdown</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          {Object.entries(stats.deviceBreakdown).map(([device, count]) => (
            <div
              key={device}
              style={{
                background: "#f5f5f5",
                padding: "12px 16px",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: "bold" }}>{count}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
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
        <div style={{ marginBottom: 20 }}>
          <h3>📍 Location Breakdown</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(stats.locationBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([region, count]) => (
                <div
                  key={region}
                  style={{
                    background: "#e3f2fd",
                    padding: "8px 16px",
                    borderRadius: 16,
                    fontSize: 14,
                  }}
                >
                  <strong>{count}</strong> user{count !== 1 ? "s" : ""} in {region}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Page Breakdown */}
      {Object.keys(stats.pageBreakdown).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3>📄 Current Pages</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            {Object.entries(stats.pageBreakdown).map(([page, count]) => (
              <div
                key={page}
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: "bold" }}>{count}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{page}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Usage */}
      {Object.keys(stats.featureUsage).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3>✨ Feature Usage</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(stats.featureUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([feature, count]) => (
                <div
                  key={feature}
                  style={{
                    background: "#e8f5e9",
                    padding: "8px 16px",
                    borderRadius: 16,
                    fontSize: 14,
                  }}
                >
                  <strong>{count}</strong> × {feature}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {stats.recentSessions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3>🕐 Recent Sessions</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                borderRadius: 8,
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={tableHeaderStyle}>Session</th>
                  <th style={tableHeaderStyle}>Device</th>
                  <th style={tableHeaderStyle}>Location</th>
                  <th style={tableHeaderStyle}>Duration</th>
                  <th style={tableHeaderStyle}>Page Views</th>
                  <th style={tableHeaderStyle}>Current Page</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSessions.map((session, index) => (
                  <tr
                    key={session.sessionId}
                    style={{
                      borderBottom:
                        index < stats.recentSessions.length - 1
                          ? "1px solid #e0e0e0"
                          : "none",
                    }}
                  >
                    <td style={tableCellStyle}>
                      <code style={{ fontSize: 11 }}>{session.sessionId}</code>
                    </td>
                    <td style={tableCellStyle}>{session.device}</td>
                    <td style={tableCellStyle}>{session.location}</td>
                    <td style={tableCellStyle}>{session.duration}</td>
                    <td style={tableCellStyle}>{session.pageViews}</td>
                    <td style={tableCellStyle}>{session.currentPage}</td>
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
  <div
    style={{
      background: "white",
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      borderLeft: `4px solid ${color}`,
    }}
  >
    <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 4 }}>
      {value}
    </div>
    <div style={{ fontSize: 14, color: "#666" }}>{title}</div>
  </div>
);

// Table styles
const tableHeaderStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 14,
  fontWeight: 600,
  color: "#666",
};

const tableCellStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
};

export default UserAnalytics;
