import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OwnerDashboard.css';
import { ownerApi } from '../../api/ownerApi';

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

interface Review {
  id: number;
  target_type: string;
  target_id: number;
  station_name?: string;
  rating: number;
  comment: string | null;
  display_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface InsightsStation {
  id: number;
  name: string;
  brand: string | null;
  is_owner_station: boolean;
  municipality: string | null;
  fuel_prices: { fuel_type: string; price: number | string }[];
  avg_rating: number;
  reviews_count: number;
}

interface PriceInsight {
  fuel_type: string;
  owner_avg_price: string | null;
  market_avg_price: string;
  owner_rank_by_price: number | null;
  total_stations: number;
  cheapest_station: {
    id: number;
    name: string;
    brand: string | null;
    price: string;
  };
  most_expensive_station: {
    id: number;
    name: string;
    brand: string | null;
    price: string;
  };
}

interface MarketInsights {
  municipality: string | null;
  days: number;
  fuelTypes: string[];
  priceInsights: PriceInsight[];
  stations: InsightsStation[];
}

function normalizeMarketInsights(raw: any, ownerStations: Station[]): MarketInsights {
  const sourceStations = Array.isArray(raw?.stations)
    ? raw.stations
    : Array.isArray(raw?.competitors)
      ? raw.competitors
      : [];
  const ownerIds = new Set(ownerStations.map((s) => s.id));
  const stationsNorm: InsightsStation[] = sourceStations.map((row: any) => {
    const fps = Array.isArray(row?.fuel_prices) ? row.fuel_prices : [];
    return {
      id: row.id,
      name: row.name,
      brand: row.brand ?? null,
      is_owner_station: ownerIds.has(row.id),
      municipality: null,
      fuel_prices: fps.map((fp: any) => ({ fuel_type: String(fp.fuel_type), price: fp.price })),
      avg_rating: Number(row.avg_rating || 0),
      reviews_count: Number(row.reviews_count || 0),
    };
  });

  const fuelTypeSet = new Set<string>();
  stationsNorm.forEach((station) => {
    (station.fuel_prices || []).forEach((fp) => fuelTypeSet.add(fp.fuel_type));
  });
  const fuelTypes = Array.from(fuelTypeSet);

  const priceInsights: PriceInsight[] = fuelTypes.map((ft) => {
    const entries = stationsNorm
      .map((s) => {
        const entry = (s.fuel_prices || []).find((p) => p.fuel_type === ft);
        const priceNum = entry != null ? Number(entry.price) : NaN;
        return { station: s, price: priceNum };
      })
      .filter((x) => !Number.isNaN(x.price));

    const totalStations = entries.length;
    const marketAvgPrice = totalStations > 0
      ? (entries.reduce((sum, e) => sum + e.price, 0) / totalStations).toFixed(2)
      : '0.00';

    const ownerEntries = entries.filter((e) => e.station.is_owner_station);
    const ownerAvgPriceNum = ownerEntries.length > 0
      ? ownerEntries.reduce((sum, e) => sum + e.price, 0) / ownerEntries.length
      : null;
    const ownerAvgPrice = ownerAvgPriceNum !== null ? ownerAvgPriceNum.toFixed(2) : null;

    let ownerRankByPrice: number | null = null;
    if (ownerEntries.length > 0) {
      const minOwner = Math.min(...ownerEntries.map((e) => e.price));
      const sorted = entries.map((e) => e.price).sort((a, b) => a - b);
      ownerRankByPrice = sorted.findIndex((p) => p === minOwner) + 1;
    }

    let cheapest_station = { id: 0, name: '', brand: null as string | null, price: '0.00' };
    let most_expensive_station = { id: 0, name: '', brand: null as string | null, price: '0.00' };
    if (entries.length > 0) {
      const cheapest = entries.reduce((min, e) => (e.price < min.price ? e : min), entries[0]);
      const expensive = entries.reduce((max, e) => (e.price > max.price ? e : max), entries[0]);
      cheapest_station = {
        id: cheapest.station.id,
        name: cheapest.station.name,
        brand: cheapest.station.brand,
        price: cheapest.price.toFixed(2),
      };
      most_expensive_station = {
        id: expensive.station.id,
        name: expensive.station.name,
        brand: expensive.station.brand,
        price: expensive.price.toFixed(2),
      };
    }

    return {
      fuel_type: ft,
      owner_avg_price: ownerAvgPrice,
      market_avg_price: marketAvgPrice,
      owner_rank_by_price: ownerRankByPrice,
      total_stations: totalStations,
      cheapest_station,
      most_expensive_station,
    };
  });

  return {
    municipality: raw?.municipality ?? null,
    days: raw?.days ?? 7,
    fuelTypes,
    priceInsights,
    stations: stationsNorm,
  };
}

const OwnerDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [pendingReports, setPendingReports] = useState<PriceReport[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'reports' | 'reviews' | 'insights'>('overview');
  
  // Reviews filtering and pagination
  const [reviewsFilter, setReviewsFilter] = useState<string>('all'); // all, published, rejected
  const [reviewsStationFilter, setReviewsStationFilter] = useState<number | 'all'>('all');
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const reviewsPageSize = 20;
  const [processingReportId, setProcessingReportId] = useState<number | null>(null);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStation, setSavingStation] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [insightsTimeRange, setInsightsTimeRange] = useState<7 | 15 | 30>(7);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
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

  // Refetch reviews when filter/pagination changes
  useEffect(() => {
    const apiKey = getApiKey();
    if (apiKey && activeTab === 'reviews') {
      fetchData(apiKey);
    }
  }, [reviewsFilter, reviewsStationFilter, reviewsPage]);

  useEffect(() => {
    const apiKey = getApiKey();
    if (apiKey && activeTab === 'insights') {
      fetchMarketInsights(apiKey, insightsTimeRange);
    }
  }, [activeTab, insightsTimeRange]);

  const fetchData = async (apiKey: string) => {
    const subdomain = getSubdomain() || '';
    try {
      setError(null);
      setLoading(true);

      const statsData = await ownerApi.getDashboard(apiKey, subdomain);
      setStats(statsData);

      try {
        const stationsData = await ownerApi.getStations(apiKey, subdomain);
        setStations(stationsData || []);
      } catch (e) {
        console.warn('Failed to fetch stations');
      }

      try {
        const reportsData = await ownerApi.getPendingReports(apiKey, subdomain);
        setPendingReports((reportsData && reportsData.reports) || []);
      } catch (e) {
        console.warn('Failed to fetch pending reports');
      }

      const params = new URLSearchParams();
      if (reviewsFilter !== 'all') params.set('status', reviewsFilter);
      if (reviewsStationFilter !== 'all') params.set('stationId', reviewsStationFilter.toString());
      params.set('page', reviewsPage.toString());
      params.set('pageSize', reviewsPageSize.toString());

      try {
        const reviewsData = await ownerApi.getReviews(apiKey, subdomain, {
          status: reviewsFilter !== 'all' ? reviewsFilter : undefined,
          stationId: reviewsStationFilter !== 'all' ? reviewsStationFilter : undefined,
          page: reviewsPage,
          pageSize: reviewsPageSize,
        });
        setReviews((reviewsData && reviewsData.reviews) || []);
        if (reviewsData && (reviewsData as any).pagination) {
          setReviewsTotalPages((reviewsData as any).pagination.totalPages || 1);
        }
      } catch (e) {
        console.warn('Failed to fetch reviews');
      }

    } catch (error: any) {
      console.error('Dashboard error:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketInsights = async (apiKey: string, days: 7 | 15 | 30) => {
    const subdomain = getSubdomain() || '';
    try {
      setInsightsError(null);
      setInsightsLoading(true);
      const raw = await ownerApi.getMarketInsights(apiKey, subdomain, days);
      const normalized = normalizeMarketInsights(raw, stations || []);
      setMarketInsights(normalized);
    } catch (err: any) {
      console.error('Market insights error:', err);
      setInsightsError(err.message || 'Failed to load market insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleRefresh = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      navigate('/owner/login');
      return;
    }

    setRefreshing(true);
    try {
      await fetchData(apiKey);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdateStation = async (updatedData: Partial<Station>) => {
    const apiKey = getApiKey();
    const subdomain = getSubdomain() || '';

    if (!apiKey || !editingStation) {
      showToast('API key or station data not found', 'error');
      return;
    }

    setSavingStation(true);

    try {
      showToast('Saving changes...', 'info');
      await ownerApi.updateStation(editingStation.id, updatedData, apiKey, subdomain);

      if (updatedData.fuel_prices) {
        for (const fuelPrice of updatedData.fuel_prices) {
          await ownerApi.updateFuelPrice(
            editingStation.id,
            fuelPrice.fuel_type,
            fuelPrice.price,
            apiKey,
            subdomain,
          );
        }
      }

      showToast('✓ Station updated successfully!', 'success');
      setShowEditModal(false);
      setEditingStation(null);
      await fetchData(apiKey);
    } catch (error: any) {
      console.error('Error updating station:', error);
      showToast(`Failed to update station: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setSavingStation(false);
    }
  };

  const handleVerifyReport = async (reportId: number, action: 'verify' | 'reject') => {
    const apiKey = getApiKey();
    const subdomain = getSubdomain();

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
      const result =
        action === 'verify'
          ? await ownerApi.verifyReport(reportId, apiKey, subdomain || '')
          : await ownerApi.rejectReport(reportId, apiKey, subdomain || '');

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

  let insightsSelectedFuelType: string | null = null;
  let insightsSelectedPriceInsight: PriceInsight | null = null;
  let insightsOwnerAvgRating = 0;
  let insightsMunicipalAvgRating = 0;
  let insightsTotalStationsForSelectedFuel = 0;
  let insightsOwnerRankForSelectedFuel: number | null = null;
  let fuelTypesForColumns: string[] = [];

  if (marketInsights) {
    if (marketInsights.priceInsights && marketInsights.priceInsights.length > 0) {
      const dieselInsight = marketInsights.priceInsights.find((pi) => pi.fuel_type === 'Diesel');
      const chosen = dieselInsight || marketInsights.priceInsights[0];
      insightsSelectedFuelType = chosen.fuel_type;
      insightsSelectedPriceInsight = chosen;
      insightsTotalStationsForSelectedFuel = chosen.total_stations;
      insightsOwnerRankForSelectedFuel = chosen.owner_rank_by_price;
    }

    if (marketInsights.stations && marketInsights.stations.length > 0) {
      const ownerStations = marketInsights.stations.filter((s) => s.is_owner_station);
      const allStations = marketInsights.stations;

      if (ownerStations.length > 0) {
        const sumOwner = ownerStations.reduce((sum, s) => sum + (s.avg_rating || 0), 0);
        insightsOwnerAvgRating = sumOwner / ownerStations.length;
      }

      if (allStations.length > 0) {
        const sumAll = allStations.reduce((sum, s) => sum + (s.avg_rating || 0), 0);
        insightsMunicipalAvgRating = sumAll / allStations.length;
      }
    }

    if (marketInsights.fuelTypes && marketInsights.fuelTypes.length > 0) {
      fuelTypesForColumns = marketInsights.fuelTypes;
    } else {
      const fuelTypeSet = new Set<string>();
      if (Array.isArray(marketInsights.stations)) {
        marketInsights.stations.forEach((station) => {
          (station.fuel_prices || []).forEach((fp) => {
            fuelTypeSet.add(fp.fuel_type);
          });
        });
      }
      fuelTypesForColumns = Array.from(fuelTypeSet);
    }
  }

  return (
    <div className="owner-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>{stats.owner_name}</h1>
          </div>
          <div className="header-actions">
            <button 
              onClick={handleRefresh} 
              className="refresh-button"
              disabled={refreshing}
              title="Refresh dashboard data"
            >
              {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
            </button>
            <button onClick={handleLogout} className="logout-button">
              🚪 Logout
            </button>
          </div>
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
        <button
          className={activeTab === 'reviews' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('reviews')}
        >
          ⭐ Reviews ({reviews.length})
        </button>
        <button
          className={activeTab === 'insights' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('insights')}
        >
          📈 Market Insights
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

        {activeTab === 'reviews' && (
          <div className="reviews-tab">
            <div className="reviews-header-section">
              <h2>⭐ Station Reviews</h2>
              <div className="reviews-stats-badge">
                Total: {reviews.length}
              </div>
            </div>

            {/* Filters Section */}
            <div className="reviews-filters">
              <div className="filter-group">
                <label htmlFor="status-filter">Status:</label>
                <select 
                  id="status-filter"
                  value={reviewsFilter} 
                  onChange={(e) => {
                    setReviewsFilter(e.target.value);
                    setReviewsPage(1);
                  }}
                  className="filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="station-filter">Station:</label>
                <select 
                  id="station-filter"
                  value={reviewsStationFilter} 
                  onChange={(e) => {
                    setReviewsStationFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                    setReviewsPage(1);
                  }}
                  className="filter-select"
                >
                  <option value="all">All Stations</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group search-group">
                <label htmlFor="search-input">Search:</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search comments or names..."
                  value={reviewsSearch}
                  onChange={(e) => setReviewsSearch(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Reviews List */}
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="empty-state">
                <p>📝 No reviews found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="reviews-list">
                  {reviews
                    .filter(review => {
                      // Client-side search filtering
                      if (!reviewsSearch.trim()) return true;
                      const searchLower = reviewsSearch.toLowerCase();
                      return (
                        (review.comment && review.comment.toLowerCase().includes(searchLower)) ||
                        (review.display_name && review.display_name.toLowerCase().includes(searchLower)) ||
                        (review.station_name && review.station_name.toLowerCase().includes(searchLower))
                      );
                    })
                    .map(review => (
                      <div key={review.id} className="review-card">
                        <div className="review-header">
                          <div className="review-meta">
                            <h3>{review.station_name || `Station #${review.target_id}`}</h3>
                            <span className="review-author">
                              👤 {review.display_name || 'Anonymous'}
                            </span>
                          </div>
                          <div className="review-rating">
                            <span className="stars">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className={star <= review.rating ? 'star filled' : 'star'}>
                                  ★
                                </span>
                              ))}
                            </span>
                            <span className="rating-number">{review.rating}/5</span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="review-comment">"{review.comment}"</p>
                        )}
                        <div className="review-footer">
                          <span className="review-date">
                            📅 {new Date(review.created_at).toLocaleString()}
                          </span>
                          <div className="review-actions">
                            {review.status === 'published' && (
                              <button
                                className="action-btn reject-btn"
                                onClick={async () => {
                                  if (!confirm('Hide this review from public display?')) return;
                                  const apiKey = getApiKey();
                                  const subdomain = getSubdomain();
                                  try {
                                    const res = await ownerApi.updateReview(review.id, apiKey || '', subdomain || '', { status: 'rejected' });
                                    if (res) {
                                      showToast('✓ Review hidden successfully', 'success');
                                      handleRefresh();
                                    } else {
                                      showToast('Failed to hide review', 'error');
                                    }
                                  } catch (err) {
                                    showToast('Error hiding review', 'error');
                                  }
                                }}
                                title="Hide this review"
                              >
                                ✕ Hide
                              </button>
                            )}
                            {review.status === 'rejected' && (
                              <button
                                className="action-btn publish-btn"
                                onClick={async () => {
                                  if (!confirm('Show this review publicly?')) return;
                                  const apiKey = getApiKey();
                                  const subdomain = getSubdomain();
                                  try {
                                    const res = await ownerApi.updateReview(review.id, apiKey || '', subdomain || '', { status: 'published' });
                                    if (res) {
                                      showToast('✓ Review published successfully', 'success');
                                      handleRefresh();
                                    } else {
                                      showToast('Failed to publish review', 'error');
                                    }
                                  } catch (err) {
                                    showToast('Error publishing review', 'error');
                                  }
                                }}
                                title="Publish this review"
                              >
                                ✓ Publish
                              </button>
                            )}
                            <span className={`status-badge status-${review.status}`}>
                              {review.status === 'published' ? '👁️ Visible' : '🔒 Hidden'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {reviewsTotalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      disabled={reviewsPage === 1}
                      onClick={() => setReviewsPage(prev => Math.max(1, prev - 1))}
                    >
                      ← Previous
                    </button>
                    <span className="pagination-info">
                      Page {reviewsPage} of {reviewsTotalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      disabled={reviewsPage >= reviewsTotalPages}
                      onClick={() => setReviewsPage(prev => Math.min(reviewsTotalPages, prev + 1))}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'insights' && (
          <div className="insights-tab">
            <div className="insights-header-section">
              <h2>📈 Market Insights</h2>
              <div className="filter-group">
                <label htmlFor="insights-range">Time range:</label>
                <select
                  id="insights-range"
                  value={insightsTimeRange}
                  onChange={(e) => setInsightsTimeRange(Number(e.target.value) as 7 | 15 | 30)}
                  className="filter-select"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={15}>Last 15 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </div>
            </div>

            {insightsLoading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading market insights...</p>
              </div>
            )}

            {!insightsLoading && insightsError && (
              <div className="error-state">
                <p>{insightsError}</p>
              </div>
            )}

            {!insightsLoading && !insightsError && (!marketInsights || !Array.isArray(marketInsights.stations) || marketInsights.stations.length === 0) && (
              <div className="empty-state">
                <p>No market insights available for this time range.</p>
              </div>
            )}

            {!insightsLoading && !insightsError && marketInsights && Array.isArray(marketInsights.stations) && marketInsights.stations.length > 0 && (
              <>
                <div className="stats-grid">
                  <StatCard
                    title={
                      insightsSelectedFuelType
                        ? `Stations (${insightsSelectedFuelType})`
                        : 'Stations in area'
                    }
                    value={insightsTotalStationsForSelectedFuel}
                    icon="⛽"
                    color="blue"
                  />
                  <StatCard
                    title={
                      insightsSelectedFuelType
                        ? `Your rank (${insightsSelectedFuelType})`
                        : 'Your rank'
                    }
                    value={insightsOwnerRankForSelectedFuel || 0}
                    icon="🏆"
                    color="orange"
                  />
                  <StatCard
                    title="Your avg rating"
                    value={Number(insightsOwnerAvgRating.toFixed(2))}
                    icon="⭐"
                    color="green"
                  />
                </div>

                {insightsSelectedPriceInsight && (
                  <div className="insights-summary">
                    <p>
                      Your average {insightsSelectedPriceInsight.fuel_type} price:{' '}
                      {insightsSelectedPriceInsight.owner_avg_price
                        ? `₱${insightsSelectedPriceInsight.owner_avg_price}`
                        : 'N/A'}
                    </p>
                    <p>
                      Municipal average {insightsSelectedPriceInsight.fuel_type} price: ₱
                      {insightsSelectedPriceInsight.market_avg_price}
                    </p>
                    <p>
                      Your average rating: {insightsOwnerAvgRating.toFixed(2)} / 5, municipal average:{' '}
                      {insightsMunicipalAvgRating.toFixed(2)} / 5
                    </p>
                  </div>
                )}

                <div className="insights-table-wrapper">
                  <table className="insights-table">
                    <thead>
                      <tr>
                        <th>Station</th>
                        <th>Brand</th>
                        {fuelTypesForColumns.map((ft) => (
                          <th key={ft}>{ft} price</th>
                        ))}
                        <th>Avg rating</th>
                        <th>Reviews</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketInsights.stations.map((station) => (
                        <tr key={station.id}>
                          <td>
                            {station.name}{' '}
                            {station.is_owner_station && (
                              <span className="owner-badge">Your station</span>
                            )}
                          </td>
                          <td>{station.brand || '-'}</td>
                          {fuelTypesForColumns.map((ft) => {
                            const priceEntry = (station.fuel_prices || []).find((p) => p.fuel_type === ft);
                            return (
                              <td key={ft}>
                                {priceEntry
                                  ? `₱${Number(priceEntry.price).toFixed(2)}`
                                  : '—'}
                              </td>
                            );
                          })}
                          <td>{station.avg_rating.toFixed(2)}</td>
                          <td>{station.reviews_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Edit Station Modal */}
      {showEditModal && editingStation && (
        <EditStationModal
          station={editingStation}
          onClose={() => {
            setShowEditModal(false);
            setEditingStation(null);
          }}
          onSave={handleUpdateStation}
          isSaving={savingStation}
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
  isSaving?: boolean;
}

const EditStationModal: React.FC<EditStationModalProps> = ({ station, onClose, onSave, isSaving = false }) => {
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

    try {
      // Only call the API if the fuel type exists in the database (station has existing fuel_prices)
      const existingFuelPrice = station.fuel_prices?.find(fp => fp.fuel_type === fuelType);
      
      if (existingFuelPrice) {
        await ownerApi.deleteFuelPrice(station.id, fuelType, apiKey || '', subdomain || '');

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
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-button"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-small"></span>
                  Saving Changes...
                </>
              ) : (
                <>💾 Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerDashboard;
