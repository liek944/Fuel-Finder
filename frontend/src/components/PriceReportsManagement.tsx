import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiDelete, apiPatch } from "../utils/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FuelPriceTrendChart from "./FuelPriceTrendChart";

// Types
interface PriceReport {
  id: number;
  station_id: number;
  station_name: string;
  station_brand: string;
  fuel_type: string;
  price: number | string; // PostgreSQL NUMERIC/DECIMAL returns as string
  reporter_ip: string;
  notes?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

interface PriceReportStats {
  total_reports: number;
  verified_reports: number;
  pending_reports: number;
  reports_today: number;
  unique_stations_reported: number;
  avg_price_all: string | null;
  most_reported_station: string | null;
  most_reported_station_count: number;
  last_report_date: string | null;
  verification_rate: string;
}

interface PriceReportsManagementProps {
  adminApiKey: string;
}

import "../styles/PriceReportsManagement.css";

export const PriceReportsManagement: React.FC<PriceReportsManagementProps> = ({
  adminApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<"pending" | "all" | "stats">(
    "pending",
  );
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [stats, setStats] = useState<PriceReportStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "verified" | "pending"
  >("all");
  const [stationSearch, setStationSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(15000);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalReports, setTotalReports] = useState<number>(0);
  const reportsPerPage = 20;

  // Unified data fetching function
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (activeTab === "pending") {
        const offset = (currentPage - 1) * reportsPerPage;
        response = await apiGet(
          `/api/admin/price-reports/pending?limit=${reportsPerPage}&offset=${offset}`,
          adminApiKey,
        );
        if (response.ok) {
          const data = await response.json();
          setReports(data.reports);
          setTotalReports(data.pagination.total);
        }
      } else if (activeTab === "all") {
        const offset = (currentPage - 1) * reportsPerPage;
        let url = `/api/admin/price-reports?limit=${reportsPerPage}&offset=${offset}`;
        if (selectedFilter !== "all") {
          url += `&verified=${selectedFilter === "verified" ? "true" : "false"}`;
        }
        if (stationSearch) {
          url += `&station_name=${encodeURIComponent(stationSearch)}`;
        }
        if (startDate) {
          url += `&start_date=${startDate.toISOString()}`;
        }
        if (endDate) {
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setHours(23, 59, 59, 999);
          url += `&end_date=${adjustedEndDate.toISOString()}`;
        }
        response = await apiGet(url, adminApiKey);
        if (response.ok) {
          const data = await response.json();
          setReports(data.reports);
          setTotalReports(data.pagination.total);
        }
      } else if (activeTab === "stats") {
        response = await apiGet("/api/admin/price-reports/stats", adminApiKey);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      }

      if (response && response.ok) {
        setLastUpdated(new Date());
      } else if (response) {
        const errorData = await response.json();
        setError(errorData.message || `Failed to fetch data for ${activeTab}`);
      }
    } catch (err) {
      setError(`Network error while fetching data for ${activeTab}`);
      console.error(`Error fetching ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    adminApiKey,
    currentPage,
    selectedFilter,
    stationSearch,
    startDate,
    endDate,
  ]);

  // Auto-refresh every X seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log(`Auto-refreshing data every ${refreshInterval / 1000}s...`);
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData, refreshInterval]);

  // Verify a price report
  const verifyReport = async (reportId: number) => {
    try {
      const response = await apiPatch(
        `/api/price-reports/${reportId}/verify`,
        { verified_by: "admin" },
        adminApiKey,
      );

      if (response.ok) {
        // Refresh the current view
        refreshData();
        alert("Report verified successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to verify report: ${errorData.message}`);
      }
    } catch (err) {
      alert("Network error while verifying report");
      console.error("Error verifying report:", err);
    }
  };

  // Delete a price report
  const deleteReport = async (reportId: number, stationName: string) => {
    if (!window.confirm(`Delete price report for "${stationName}"?`)) {
      return;
    }

    try {
      const response = await apiDelete(
        `/api/admin/price-reports/${reportId}`,
        adminApiKey,
      );

      if (response.ok) {
        // Refresh the current view
        refreshData();
        alert("Report deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to delete report: ${errorData.message}`);
      }
    } catch (err) {
      alert("Network error while deleting report");
      console.error("Error deleting report:", err);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format time ago
  const timeAgo = (dateString: string) => {
    const now = new Date();
    const reportDate = new Date(dateString);
    const diffMs = now.getTime() - reportDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalReports / reportsPerPage);

  // Effect to fetch data when tab or page changes
  useEffect(() => {
    refreshData();
  }, [
    activeTab,
    currentPage,
    selectedFilter,
    stationSearch,
    startDate,
    endDate,
    refreshData,
  ]);

  // Reset page when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedFilter]);

  return (
    <div className="price-reports-management">
      <div className="header">
        <h3>💰 Price Reports Management</h3>
        <div className="header-controls">
          {lastUpdated && (
            <div className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            <option value={10000}>10s</option>
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
          <button onClick={() => refreshData()} disabled={loading}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        {[
          { key: "pending", label: "Pending Reports", icon: "⏳" },
          { key: "all", label: "All Reports", icon: "📋" },
          { key: "stats", label: "Statistics", icon: "📊" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={activeTab === tab.key ? "active" : ""}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filter for All Reports tab */}
      {activeTab === "all" && (
        <div className="filters">
          <div>
            <label>Filter by Status:</label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
            >
              <option value="all">All Reports</option>
              <option value="verified">Verified Only</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>
          <div>
            <label>Filter by Station:</label>
            <div>
              <input
                type="text"
                placeholder="Search for a station..."
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label>Start Date:</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date || undefined)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              isClearable
              placeholderText="MM/DD/YYYY"
              dateFormat="MM/dd/yyyy"
              className="date-picker-input"
            />
          </div>
          <div>
            <label>End Date:</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date || undefined)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              isClearable
              placeholderText="MM/DD/YYYY"
              dateFormat="MM/dd/yyyy"
              className="date-picker-input"
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && <div className="error">❌ {error}</div>}

      {/* Loading State */}
      {loading && <div className="loading">🔄 Loading...</div>}

      {/* Statistics Tab */}
      {activeTab === "stats" && stats && !loading && (
        <div>
          <div className="stats-grid">
            {[
              {
                label: "Total Reports",
                value: stats.total_reports,
                icon: "📊",
              },
              {
                label: "Verified Reports",
                value: stats.verified_reports,
                icon: "✅",
              },
              {
                label: "Pending Reports",
                value: stats.pending_reports,
                icon: "⏳",
              },
              {
                label: "Reports Today",
                value: stats.reports_today,
                icon: "📅",
              },
              {
                label: "Unique Stations",
                value: stats.unique_stations_reported,
                icon: "⛽",
              },
              {
                label: "Verification Rate",
                value: stats.verification_rate,
                icon: "📈",
              },
            ].map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="additional-stats">
            <div className="additional-stat-card">
              <h4>💰 Average Price</h4>
              <div>
                {stats.avg_price_all ? `₱${stats.avg_price_all}/L` : "No data"}
              </div>
            </div>

            <div className="additional-stat-card">
              <h4>🏆 Most Reported Station</h4>
              <div>{stats.most_reported_station || "No data"}</div>
              <div>{stats.most_reported_station_count} reports</div>
            </div>
          </div>

          {/* Fuel Price Trend Chart */}
          <div className="chart-container">
            <FuelPriceTrendChart adminApiKey={adminApiKey} />
          </div>
        </div>
      )}

      {/* Reports List */}
      {(activeTab === "pending" || activeTab === "all") && !loading && (
        <>
          {reports.length === 0 ? (
            <div className="no-reports">📭 No reports found</div>
          ) : (
            <>
              {/* Reports Table */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Station</th>
                      <th>Price</th>
                      <th>Fuel Type</th>
                      <th>Reporter</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <div>{report.station_name}</div>
                          <div>{report.station_brand}</div>
                        </td>
                        <td>₱{Number(report.price).toFixed(2)}/L</td>
                        <td>{report.fuel_type}</td>
                        <td>{report.reporter_ip}</td>
                        <td>
                          <div>{timeAgo(report.created_at)}</div>
                          <div>{formatDate(report.created_at)}</div>
                        </td>
                        <td>
                          {report.is_verified ? (
                            <span className="status verified">✅ Verified</span>
                          ) : (
                            <span className="status pending">⏳ Pending</span>
                          )}
                        </td>
                        <td>
                          <div>
                            {!report.is_verified && (
                              <button
                                onClick={() => verifyReport(report.id)}
                                title="Verify this report"
                              >
                                ✅ Verify
                              </button>
                            )}
                            <button
                              onClick={() =>
                                deleteReport(report.id, report.station_name)
                              }
                              title="Delete this report"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>

                  <span>
                    Page {currentPage} of {totalPages} ({totalReports} total
                    reports)
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
