import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiDelete, apiPatch } from "../utils/api";

// Types
interface PriceReport {
  id: number;
  station_id: number;
  station_name: string;
  station_brand: string;
  fuel_type: string;
  price: number;
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

const PriceReportsManagement: React.FC<PriceReportsManagementProps> = ({
  adminApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<"pending" | "all" | "stats">("pending");
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [stats, setStats] = useState<PriceReportStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "verified" | "pending">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalReports, setTotalReports] = useState<number>(0);
  const reportsPerPage = 20;

  // Fetch pending reports
  const fetchPendingReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * reportsPerPage;
      const response = await apiGet(
        `/api/admin/price-reports/pending?limit=${reportsPerPage}&offset=${offset}`,
        adminApiKey
      );
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setTotalReports(data.pagination.total);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch pending reports");
      }
    } catch (err) {
      setError("Network error while fetching reports");
      console.error("Error fetching pending reports:", err);
    } finally {
      setLoading(false);
    }
  }, [adminApiKey, currentPage]);

  // Fetch all reports with filtering
  const fetchAllReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * reportsPerPage;
      let url = `/api/admin/price-reports?limit=${reportsPerPage}&offset=${offset}`;
      
      if (selectedFilter !== "all") {
        url += `&verified=${selectedFilter === "verified" ? "true" : "false"}`;
      }

      const response = await apiGet(url, adminApiKey);
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setTotalReports(data.pagination.total);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch reports");
      }
    } catch (err) {
      setError("Network error while fetching reports");
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }, [adminApiKey, currentPage, selectedFilter]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet("/api/admin/price-reports/stats", adminApiKey);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch statistics");
      }
    } catch (err) {
      setError("Network error while fetching statistics");
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }, [adminApiKey]);

  // Verify a price report
  const verifyReport = async (reportId: number) => {
    try {
      const response = await apiPatch(
        `/api/price-reports/${reportId}/verify`,
        { verified_by: "admin" },
        adminApiKey
      );

      if (response.ok) {
        // Refresh the current view
        if (activeTab === "pending") {
          fetchPendingReports();
        } else if (activeTab === "all") {
          fetchAllReports();
        }
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
        adminApiKey
      );

      if (response.ok) {
        // Refresh the current view
        if (activeTab === "pending") {
          fetchPendingReports();
        } else if (activeTab === "all") {
          fetchAllReports();
        }
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
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalReports / reportsPerPage);

  // Effect to fetch data when tab or page changes
  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingReports();
    } else if (activeTab === "all") {
      fetchAllReports();
    } else if (activeTab === "stats") {
      fetchStats();
    }
  }, [activeTab, currentPage, selectedFilter, fetchPendingReports, fetchAllReports, fetchStats]);

  // Reset page when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedFilter]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        padding: "20px",
        borderRadius: 8,
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          margin: "0 0 20px 0",
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        💰 Price Reports Management
      </h3>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          borderBottom: "1px solid #ddd",
        }}
      >
        {[
          { key: "pending", label: "Pending Reports", icon: "⏳" },
          { key: "all", label: "All Reports", icon: "📋" },
          { key: "stats", label: "Statistics", icon: "📊" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "10px 16px",
              background: activeTab === tab.key ? "#2196F3" : "transparent",
              color: activeTab === tab.key ? "white" : "#666",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #2196F3" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "4px 4px 0 0",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filter for All Reports tab */}
      {activeTab === "all" && (
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#555",
            }}
          >
            Filter by Status:
          </label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as any)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: "14px",
            }}
          >
            <option value="all">All Reports</option>
            <option value="verified">Verified Only</option>
            <option value="pending">Pending Only</option>
          </select>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "12px",
            background: "#ffebee",
            color: "#c62828",
            border: "1px solid #ffcdd2",
            borderRadius: 4,
            marginBottom: 20,
            fontSize: "14px",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#666",
            fontSize: "16px",
          }}
        >
          🔄 Loading...
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "stats" && stats && !loading && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {[
              { label: "Total Reports", value: stats.total_reports, icon: "📊" },
              { label: "Verified Reports", value: stats.verified_reports, icon: "✅" },
              { label: "Pending Reports", value: stats.pending_reports, icon: "⏳" },
              { label: "Reports Today", value: stats.reports_today, icon: "📅" },
              { label: "Unique Stations", value: stats.unique_stations_reported, icon: "⛽" },
              { label: "Verification Rate", value: stats.verification_rate, icon: "📈" },
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  padding: "16px",
                  background: "#f5f5f5",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#333" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Additional Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: "16px",
                background: "#e3f2fd",
                borderRadius: 8,
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#1976d2" }}>
                💰 Average Price
              </h4>
              <div style={{ fontSize: "18px", fontWeight: 600 }}>
                {stats.avg_price_all ? `₱${stats.avg_price_all}/L` : "No data"}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                background: "#e8f5e8",
                borderRadius: 8,
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#2e7d32" }}>
                🏆 Most Reported Station
              </h4>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                {stats.most_reported_station || "No data"}
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {stats.most_reported_station_count} reports
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {(activeTab === "pending" || activeTab === "all") && !loading && (
        <>
          {reports.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#666",
                fontSize: "16px",
              }}
            >
              📭 No reports found
            </div>
          ) : (
            <>
              {/* Reports Table */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        Station
                      </th>
                      <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        Price
                      </th>
                      <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        Fuel Type
                      </th>
                      <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        Reporter
                      </th>
                      <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        Time
                      </th>
                      <th style={{ padding: "12px 8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        Status
                      </th>
                      <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "2px solid #ddd" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px 8px" }}>
                          <div style={{ fontWeight: 600 }}>{report.station_name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {report.station_brand}
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px", fontWeight: 600, color: "#2e7d32" }}>
                          ₱{report.price.toFixed(2)}/L
                        </td>
                        <td style={{ padding: "12px 8px" }}>{report.fuel_type}</td>
                        <td style={{ padding: "12px 8px", fontSize: "12px", color: "#666" }}>
                          {report.reporter_ip}
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <div>{timeAgo(report.created_at)}</div>
                          <div style={{ fontSize: "11px", color: "#999" }}>
                            {formatDate(report.created_at)}
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          {report.is_verified ? (
                            <span
                              style={{
                                background: "#e8f5e8",
                                color: "#2e7d32",
                                padding: "4px 8px",
                                borderRadius: 12,
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              ✅ Verified
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "#fff3e0",
                                color: "#f57c00",
                                padding: "4px 8px",
                                borderRadius: 12,
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            {!report.is_verified && (
                              <button
                                onClick={() => verifyReport(report.id)}
                                style={{
                                  background: "#4CAF50",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 10px",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                                title="Verify this report"
                              >
                                ✅ Verify
                              </button>
                            )}
                            <button
                              onClick={() => deleteReport(report.id, report.station_name)}
                              style={{
                                background: "#f44336",
                                color: "white",
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 20,
                    padding: "16px 0",
                    borderTop: "1px solid #eee",
                  }}
                >
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 12px",
                      background: currentPage === 1 ? "#ccc" : "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ← Previous
                  </button>

                  <span style={{ fontSize: "14px", color: "#666" }}>
                    Page {currentPage} of {totalPages} ({totalReports} total reports)
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 12px",
                      background: currentPage === totalPages ? "#ccc" : "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: "14px",
                    }}
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

export default PriceReportsManagement;
