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

interface FuelPrice {
  id: number;
  fuel_type: string;
  price: number | string;
  is_community: boolean;
  updated_at: string;
}

interface Station {
  id: number;
  name: string;
  brand: string | null;
  address: string;
  phone: string | null;
  location: {
    lat: number;
    lng: number;
  };
  operating_hours: { open: string; close: string } | null;
  services: string[];
  fuel_prices: FuelPrice[];
  images: any[];
  primaryImage: any;
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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'reports'>('overview');
  const [processingReportId, setProcessingReportId] = useState<number | null>(null);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
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
      setError(null);
      setLoading(true);

      // Fetch dashboard stats
      const statsRes = await fetch(`${apiUrl}/api/owner/dashboard`, {
        headers: {
          'x-api-key': apiKey,
          'x-owner-domain': subdomain || ''
        }
      });

      if (!statsRes.ok) {
        const errorData = await statsRes.json();
        throw new Error(errorData.message || 'Failed to fetch dashboard');
      }
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
      } else {
        console.warn('Failed to fetch stations:', stationsRes.status);
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
        // Backend returns { count, reports } format
        setPendingReports(reportsData.reports || []);
      } else {
        console.warn('Failed to fetch pending reports:', reportsRes.status);
      }

    } catch (error: any) {
      console.error('Dashboard error:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('owner_api_key');
    localStorage.removeItem('owner_subdomain');
    navigate('/owner/login');
  };

  const handleEditStation = (station: Station) => {
    setEditingStation(station);
    setShowEditModal(true);
  };

  const handleUpdateStation = async (updatedData: Partial<Station>) => {
    const apiKey = getApiKey();
    const subdomain = getSubdomain();
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    if (!apiKey || !editingStation) {
      alert('API key or station data not found');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/owner/stations/${editingStation.id}`, {
        method: 'PUT',
        headers: {
          'x-api-key': apiKey,
          'x-owner-domain': subdomain || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update station');
      }

      // Update fuel prices if provided
      if (updatedData.fuel_prices) {
        for (const fuelPrice of updatedData.fuel_prices) {
          await fetch(`${apiUrl}/api/owner/stations/${editingStation.id}/fuel-price`, {
            method: 'PUT',
            headers: {
              'x-api-key': apiKey,
              'x-owner-domain': subdomain || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fuel_type: fuelPrice.fuel_type,
              price: fuelPrice.price
            })
          });
        }
      }

      alert('Station updated successfully!');
      setShowEditModal(false);
      setEditingStation(null);
      
      // Refresh data
      await fetchData(apiKey);
    } catch (error: any) {
      console.error('Error updating station:', error);
      alert(`Failed to update station: ${error.message || 'Unknown error'}`);
    }
  };

  const handleVerifyReport = async (reportId: number, action: 'verify' | 'reject') => {
    const apiKey = getApiKey();
    const subdomain = getSubdomain();
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    if (!apiKey) {
      alert('API key not found. Please login again.');
      navigate('/owner/login');
      return;
    }

    // Prevent double-clicks
    if (processingReportId !== null) {
      console.log('⏳ Already processing another report...');
      return;
    }

    setProcessingReportId(reportId);

    try {
      const response = await fetch(`${apiUrl}/api/owner/price-reports/${reportId}/${action}`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'x-owner-domain': subdomain || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: action === 'verify' ? 'Verified by owner' : 'Rejected by owner',
          reason: action === 'reject' ? 'Incorrect price information' : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ ${action} response:`, result);

      // Show success message immediately
      alert(result.message || `Price report ${action === 'verify' ? 'approved' : 'rejected'} successfully!`);

      // Refresh data after showing success
      try {
        await fetchData(apiKey);
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Don't show error to user since the action itself succeeded
      }
    } catch (error: any) {
      console.error(`❌ Error during ${action}:`, error);
      alert(`Failed to ${action} report: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingReportId(null);
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

  if (error) {
    return (
      <div className="owner-dashboard error">
        <div className="error-content">
          <h2>⚠️ Dashboard Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => fetchData(getApiKey()!)} className="retry-button">
              🔄 Retry
            </button>
            <button onClick={() => navigate('/owner/login')} className="logout-button">
              🔐 Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="owner-dashboard error">
        <div className="error-content">
          <h2>📊 No Dashboard Data</h2>
          <p>Unable to load dashboard statistics. This might be because:</p>
          <ul>
            <li>No stations are assigned to your account</li>
            <li>Database view is not created</li>
            <li>API key is invalid</li>
          </ul>
          <div className="error-actions">
            <button onClick={() => fetchData(getApiKey()!)} className="retry-button">
              🔄 Retry
            </button>
            <button onClick={() => navigate('/owner/login')} className="logout-button">
              🔐 Return to Login
            </button>
          </div>
        </div>
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
                    {station.phone && (
                      <p className="station-phone">📞 {station.phone}</p>
                    )}
                    {station.operating_hours && (
                      <p className="station-hours">
                        🕐 {station.operating_hours.open} - {station.operating_hours.close}
                      </p>
                    )}
                    
                    {/* Fuel Prices Section */}
                    {station.fuel_prices && station.fuel_prices.length > 0 && (
                      <div className="fuel-prices-section">
                        <h4>Current Prices</h4>
                        <div className="fuel-prices-grid">
                          {station.fuel_prices.map((fuelPrice) => (
                            <div key={fuelPrice.id} className="fuel-price-item">
                              <div className="fuel-type">{fuelPrice.fuel_type}</div>
                              <div className="fuel-price">₱{Number(fuelPrice.price).toFixed(2)}</div>
                              <div className="fuel-status">
                                {fuelPrice.is_community ? '👥 Community' : '✓ Verified'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="station-coords">
                      <small>
                        {station.location.lat.toFixed(6)}, {station.location.lng.toFixed(6)}
                      </small>
                    </div>

                    {/* Action Buttons */}
                    <div className="station-actions">
                      <button 
                        onClick={() => handleEditStation(station)}
                        className="action-button edit-button"
                      >
                        ✏️ Edit Station
                      </button>
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
                        disabled={processingReportId === report.id}
                      >
                        {processingReportId === report.id ? '⏳ Processing...' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleVerifyReport(report.id, 'reject')}
                        className="reject-button"
                        disabled={processingReportId === report.id}
                      >
                        {processingReportId === report.id ? '⏳ Processing...' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Station Modal */}
      {showEditModal && editingStation && (
        <EditStationModal
          station={editingStation}
          onClose={() => {
            setShowEditModal(false);
            setEditingStation(null);
          }}
          onSave={handleUpdateStation}
        />
      )}
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

// Edit Station Modal Component
interface EditStationModalProps {
  station: Station;
  onClose: () => void;
  onSave: (data: Partial<Station>) => void;
}

const EditStationModal: React.FC<EditStationModalProps> = ({ station, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: station.name,
    brand: station.brand || '',
    address: station.address,
    phone: station.phone || '',
    operating_hours: station.operating_hours || { open: '', close: '' },
    services: station.services || [],
  });

  // Common preset fuel types
  const PRESET_FUEL_TYPES = ['Diesel', 'Premium', 'Regular', 'Unleaded', 'Super Premium'];

  const [fuelPrices, setFuelPrices] = useState<{ fuel_type: string; price: string }[]>([]);
  const [newFuelType, setNewFuelType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Initialize fuel prices from existing data or presets
  React.useEffect(() => {
    if (station.fuel_prices && station.fuel_prices.length > 0) {
      // Use existing fuel prices from station
      setFuelPrices(
        station.fuel_prices.map((fp) => ({
          fuel_type: fp.fuel_type,
          price: String(fp.price),
        }))
      );
    } else {
      // Initialize with common presets (empty prices)
      setFuelPrices([
        { fuel_type: 'Diesel', price: '' },
        { fuel_type: 'Premium', price: '' },
        { fuel_type: 'Regular', price: '' },
      ]);
    }
  }, [station.fuel_prices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty fuel prices
    const validFuelPrices = fuelPrices
      .filter((fp) => fp.price && parseFloat(fp.price) > 0)
      .map((fp) => ({
        fuel_type: fp.fuel_type,
        price: parseFloat(fp.price),
      }));

    const updateData: any = {
      name: formData.name,
      brand: formData.brand || null,
      address: formData.address,
      phone: formData.phone || null,
      operating_hours: formData.operating_hours.open && formData.operating_hours.close 
        ? formData.operating_hours 
        : null,
      services: formData.services,
    };

    if (validFuelPrices.length > 0) {
      updateData.fuel_prices = validFuelPrices;
    }

    onSave(updateData);
  };

  const handleFuelPriceChange = (fuelType: string, value: string) => {
    setFuelPrices((prev) =>
      prev.map((fp) =>
        fp.fuel_type === fuelType ? { ...fp, price: value } : fp
      )
    );
  };

  const handleAddCustomFuelType = () => {
    if (!newFuelType.trim()) {
      alert('Please enter a fuel type name');
      return;
    }

    // Check if fuel type already exists
    if (fuelPrices.some((fp) => fp.fuel_type.toLowerCase() === newFuelType.trim().toLowerCase())) {
      alert('This fuel type already exists');
      return;
    }

    // Add new fuel type
    setFuelPrices((prev) => [...prev, { fuel_type: newFuelType.trim(), price: '' }]);
    setNewFuelType('');
    setShowCustomInput(false);
  };

  const handleRemoveFuelType = async (fuelType: string) => {
    // Ask for confirmation
    if (!window.confirm(`Are you sure you want to remove ${fuelType} from this station?`)) {
      return;
    }

    const apiKey = localStorage.getItem('owner_api_key');
    const subdomain = localStorage.getItem('owner_subdomain');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    try {
      // Only call the API if the fuel type exists in the database (station has existing fuel_prices)
      const existingFuelPrice = station.fuel_prices?.find(fp => fp.fuel_type === fuelType);
      
      if (existingFuelPrice) {
        const response = await fetch(`${apiUrl}/api/owner/stations/${station.id}/fuel-price/${encodeURIComponent(fuelType)}`, {
          method: 'DELETE',
          headers: {
            'x-api-key': apiKey || '',
            'x-owner-domain': subdomain || '',
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete fuel price');
        }

        console.log(`✅ ${fuelType} deleted from database`);
      }

      // Remove from local state
      setFuelPrices((prev) => prev.filter((fp) => fp.fuel_type !== fuelType));
    } catch (error: any) {
      console.error('Error deleting fuel price:', error);
      alert(`Failed to delete ${fuelType}: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddPresetFuelType = (fuelType: string) => {
    // Check if already exists
    if (fuelPrices.some((fp) => fp.fuel_type === fuelType)) {
      return;
    }
    setFuelPrices((prev) => [...prev, { fuel_type: fuelType, price: '' }]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Station</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Station Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Shell, Petron, Caltex"
              />
            </div>

            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +63 912 345 6789"
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="form-section">
            <h3>Operating Hours</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Open Time</label>
                <input
                  type="time"
                  value={formData.operating_hours.open}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operating_hours: { ...formData.operating_hours, open: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Close Time</label>
                <input
                  type="time"
                  value={formData.operating_hours.close}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operating_hours: { ...formData.operating_hours, close: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Fuel Prices */}
          <div className="form-section">
            <h3>Fuel Prices (₱ per Liter)</h3>
            <p className="form-hint">Add fuel types your station offers and set their prices</p>
            
            {/* Current Fuel Prices */}
            {fuelPrices.map((fuelPrice) => (
              <div key={fuelPrice.fuel_type} className="fuel-price-input-row">
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{fuelPrice.fuel_type}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fuelPrice.price}
                    onChange={(e) => handleFuelPriceChange(fuelPrice.fuel_type, e.target.value)}
                    placeholder={`Enter ${fuelPrice.fuel_type} price`}
                  />
                </div>
                <button
                  type="button"
                  className="remove-fuel-button"
                  onClick={() => handleRemoveFuelType(fuelPrice.fuel_type)}
                  title="Remove this fuel type"
                >
                  🗑️
                </button>
              </div>
            ))}

            {/* Preset Fuel Types */}
            <div className="preset-fuel-types">
              <label style={{ fontSize: '13px', color: '#718096', marginBottom: '8px', display: 'block' }}>
                Quick Add:
              </label>
              <div className="preset-buttons">
                {PRESET_FUEL_TYPES.filter(
                  (preset) => !fuelPrices.some((fp) => fp.fuel_type === preset)
                ).map((fuelType) => (
                  <button
                    key={fuelType}
                    type="button"
                    className="preset-fuel-button"
                    onClick={() => handleAddPresetFuelType(fuelType)}
                  >
                    + {fuelType}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Fuel Type Input */}
            {showCustomInput ? (
              <div className="custom-fuel-input">
                <input
                  type="text"
                  value={newFuelType}
                  onChange={(e) => setNewFuelType(e.target.value)}
                  placeholder="Enter custom fuel type name"
                  autoFocus
                />
                <button
                  type="button"
                  className="add-custom-button"
                  onClick={handleAddCustomFuelType}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="cancel-custom-button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setNewFuelType('');
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="add-custom-fuel-type-button"
                onClick={() => setShowCustomInput(true)}
              >
                ➕ Add Custom Fuel Type
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              💾 Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerDashboard;
