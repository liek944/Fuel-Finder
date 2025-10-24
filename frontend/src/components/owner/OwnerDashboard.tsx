import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OwnerDashboard.css';

interface DashboardStats {
  owner_name: string;
  domain: string;
  total_stations: number;
  verified_reports: number;
  pending_reports: number;
  total_actions: number;
  last_activity: string | null;
}

interface Station {
  id: number;
  name: string;
  brand: string | null;
  address: string;
  latitude: number;
  longitude: number;
  operating_hours: { open: string; close: string } | null;
}

interface PriceReport {
  id: number;
  station_id: number;
  station_name: string;
  fuel_type: string;
  price: number | string;
  reporter_name: string;
  notes: string | null;
  is_verified: boolean;
  created_at: string;
}

const OwnerDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [pendingReports, setPendingReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'reports'>('overview');
  const navigate = useNavigate();

  const getApiKey = () => localStorage.getItem('owner_api_key');
  const getSubdomain = () => localStorage.getItem('owner_subdomain');

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      navigate('/owner/login');
      return;
    }

    fetchData(apiKey);
  }, []);

  const fetchData = async (apiKey: string) => {
    const subdomain = getSubdomain();
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    try {
      // Fetch dashboard stats
      const statsRes = await fetch(`${apiUrl}/api/owner/dashboard`, {
        headers: {
          'x-api-key': apiKey,
          'x-owner-domain': subdomain || ''
        }
      });

      if (!statsRes.ok) throw new Error('Failed to fetch dashboard');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch stations
      const stationsRes = await fetch(`${apiUrl}/api/owner/stations`, {
        headers: {
          'x-api-key': apiKey,
          'x-owner-domain': subdomain || ''
        }
      });

      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        setStations(stationsData);
      }

      // Fetch pending reports
      const reportsRes = await fetch(`${apiUrl}/api/owner/price-reports/pending`, {
        headers: {
          'x-api-key': apiKey,
          'x-owner-domain': subdomain || ''
        }
      });

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setPendingReports(reportsData);
      }

    } catch (error) {
      console.error('Dashboard error:', error);
      navigate('/owner/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('owner_api_key');
    localStorage.removeItem('owner_subdomain');
    navigate('/owner/login');
  };

  const handleVerifyReport = async (reportId: number, action: 'verify' | 'reject') => {
    const apiKey = getApiKey();
    const subdomain = getSubdomain();
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/api/owner/price-reports/${reportId}/${action}`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey!,
          'x-owner-domain': getSubdomain() || '',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh data
        fetchData(apiKey!);
        alert(`Price report ${action === 'verify' ? 'approved' : 'rejected'} successfully!`);
      } else {
        alert(`Failed to ${action} report`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="owner-dashboard loading">
        <div className="spinner-large"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="owner-dashboard error">
        <p>Failed to load dashboard</p>
        <button onClick={() => navigate('/owner/login')}>Return to Login</button>
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>{stats.owner_name}</h1>
            <p className="domain-badge">{stats.domain}.fuelfinder.com</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={activeTab === 'stations' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('stations')}
        >
          🏪 Stations ({stations.length})
        </button>
        <button
          className={activeTab === 'reports' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('reports')}
        >
          ⏳ Pending Reports ({pendingReports.length})
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <StatCard
                title="Total Stations"
                value={stats.total_stations}
                icon="🏪"
                color="blue"
              />
              <StatCard
                title="Pending Reports"
                value={stats.pending_reports}
                icon="⏳"
                color="orange"
              />
              <StatCard
                title="Verified Reports"
                value={stats.verified_reports}
                icon="✅"
                color="green"
              />
              <StatCard
                title="Total Actions"
                value={stats.total_actions}
                icon="📈"
                color="purple"
              />
            </div>

            {stats.last_activity && (
              <div className="last-activity">
                <p>
                  <strong>Last Activity:</strong>{' '}
                  {new Date(stats.last_activity).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stations' && (
          <div className="stations-tab">
            <h2>Your Stations</h2>
            {stations.length === 0 ? (
              <div className="empty-state">
                <p>No stations assigned yet</p>
              </div>
            ) : (
              <div className="stations-list">
                {stations.map((station) => (
                  <div key={station.id} className="station-card">
                    <div className="station-header">
                      <h3>{station.name}</h3>
                      {station.brand && <span className="brand-badge">{station.brand}</span>}
                    </div>
                    <p className="station-address">📍 {station.address}</p>
                    {station.operating_hours && (
                      <p className="station-hours">
                        🕐 {station.operating_hours.open} - {station.operating_hours.close}
                      </p>
                    )}
                    <div className="station-coords">
                      <small>
                        {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="reports-tab">
            <h2>Pending Price Reports</h2>
            {pendingReports.length === 0 ? (
              <div className="empty-state">
                <p>✅ No pending reports to review</p>
              </div>
            ) : (
              <div className="reports-list">
                {pendingReports.map((report) => (
                  <div key={report.id} className="report-card">
                    <div className="report-header">
                      <h3>{report.station_name}</h3>
                      <span className="fuel-type-badge">{report.fuel_type}</span>
                    </div>
                    <div className="report-price">
                      ₱{Number(report.price).toFixed(2)}
                    </div>
                    <div className="report-details">
                      <p>
                        <strong>Reporter:</strong> {report.reporter_name || 'Anonymous'}
                      </p>
                      {report.notes && (
                        <p>
                          <strong>Notes:</strong> {report.notes}
                        </p>
                      )}
                      <p className="report-time">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="report-actions">
                      <button
                        onClick={() => handleVerifyReport(report.id, 'verify')}
                        className="verify-button"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleVerifyReport(report.id, 'reject')}
                        className="reject-button"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'orange' | 'green' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  </div>
);

export default OwnerDashboard;
