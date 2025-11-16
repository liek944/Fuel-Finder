import React, { useState, useEffect } from "react";
import { stationsApi } from "../../api/stationsApi";
import type { PriceReport } from "../../types/price.types";
import "../../styles/PriceReportWidget.css";

interface PriceReportWidgetProps {
  stationId: number;
  stationName: string;
  availableFuelTypes?: string[];
}

const PriceReportWidget: React.FC<PriceReportWidgetProps> = ({
  stationId,
  stationName: _stationName,
  availableFuelTypes = ["Regular", "Premium", "Diesel"],
}) => {
  const [showForm, setShowForm] = useState(false);
  const defaultFuel =
    availableFuelTypes && availableFuelTypes.length > 0
      ? availableFuelTypes[0]
      : "Regular";
  const [fuelType, setFuelType] = useState(defaultFuel);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [recentReports, setRecentReports] = useState<PriceReport[]>([]);
  const [showReports, setShowReports] = useState(false);

  // Reset selected fuel when station or available fuels change
  useEffect(() => {
    const nextDefault =
      availableFuelTypes && availableFuelTypes.length > 0
        ? availableFuelTypes[0]
        : "Regular";
    setFuelType(nextDefault);
  }, [stationId, availableFuelTypes]);

  // Fetch recent reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await stationsApi.getPriceReports(stationId, 5);
        setRecentReports(data.reports || []);
      } catch (err) {
        console.error("Error fetching reports:", err);
        setMessage({ type: "error", text: "Failed to fetch recent reports" });
      }
    };

    if (showReports) {
      fetchReports();
    }
  }, [showReports, stationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setMessage({ type: "error", text: "Please enter a valid price" });
      return;
    }

    if (priceNum < 30 || priceNum > 200) {
      setMessage({ type: "error", text: "Price must be between ₱30 and ₱200" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await stationsApi.reportPrice(stationId, {
        fuel_type: fuelType,
        price: priceNum,
        notes: notes.trim() || null,
      });

      {
        setMessage({
          type: "success",
          text: "Price reported successfully! Thank you for contributing.",
        });
        setPrice("");
        setNotes("");
        setFuelType("Regular");
        setTimeout(() => {
          setShowForm(false);
          setMessage(null);
        }, 2000);
      }
    } catch (err: any) {
      const msg = err?.message || "Network error. Please try again.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="price-report-widget" onClick={(e) => e.stopPropagation()}>
      {!showForm && !showReports && (
        <div className="price-report-widget-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowForm(true);
            }}
            className="report-price-button"
          >
            💰 Report Price
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReports(true);
            }}
            className="view-reports-button"
          >
            📊 View Reports
          </button>
        </div>
      )}

      {showForm && (
        <div>
          <div className="price-report-widget-header">
            <strong>Report Fuel Price</strong>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowForm(false);
                setMessage(null);
              }}
              className="close-button"
            >
              ✕
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(e);
            }}
          >
            <div className="form-group">
              <label>Fuel Type:</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              >
                {(availableFuelTypes && availableFuelTypes.length > 0
                  ? availableFuelTypes
                  : ["Regular", "Premium", "Diesel"]
                ).map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Price per Liter (₱):</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 58.50"
                required
              />
            </div>

            <div className="form-group">
              <label>Notes (optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional info..."
                maxLength={200}
              />
            </div>

            {message && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="submit-button"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        </div>
      )}

      {showReports && (
        <div>
          <div className="price-report-widget-header">
            <strong>Recent Price Reports</strong>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReports(false);
              }}
              className="close-button"
            >
              ✕
            </button>
          </div>

          {recentReports.length === 0 ? (
            <div className="no-reports">
              No price reports yet. Be the first to contribute!
            </div>
          ) : (
            <div className="reports-list">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className={`report-item ${report.is_verified ? "verified" : ""}`}
                >
                  <div className="report-item-header">
                    <span>
                      {report.fuel_type}: ₱{Number(report.price).toFixed(2)}
                    </span>
                    {report.is_verified && (
                      <span className="verified-badge">✓ Verified</span>
                    )}
                  </div>
                  <div className="report-item-timestamp">
                    {formatDate(report.created_at)}
                  </div>
                  {report.notes && (
                    <div className="report-item-notes">"{report.notes}"</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReports(false);
              setShowForm(true);
            }}
            className="add-new-report-button"
          >
            + Add New Report
          </button>
        </div>
      )}
    </div>
  );
};

export default PriceReportWidget;
