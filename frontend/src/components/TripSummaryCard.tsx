/**
 * Trip Summary Card Component
 * 
 * Displays comprehensive trip analytics in a beautiful, responsive card.
 * Features:
 * - Distance, duration, and speed metrics
 * - Fuel cost estimation
 * - Stop detection statistics
 * - Configurable fuel settings
 * - Mobile-responsive design
 * - Real-time updates
 * 
 * @module TripSummaryCard
 * @version 6.0.0
 * @since Phase 6
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Trip } from '../utils/indexedDB';
import {
  TripAnalytics,
  FuelCostConfig,
  StopDetectionConfig,
  calculateTripAnalytics,
  formatDistance,
  formatSpeed,
  formatCurrency,
  estimateCO2Emissions,
  DEFAULT_FUEL_CONFIG,
  DEFAULT_STOP_CONFIG
} from '../utils/tripAnalytics';

/**
 * Props for TripSummaryCard component
 */
export interface TripSummaryCardProps {
  /** Trip data to analyze */
  trip: Trip;
  /** Fuel cost configuration */
  fuelConfig?: FuelCostConfig;
  /** Stop detection configuration */
  stopConfig?: StopDetectionConfig;
  /** Whether to show detailed metrics */
  showDetailedMetrics?: boolean;
  /** Whether to show fuel cost estimation */
  showFuelCost?: boolean;
  /** Whether to show CO2 emissions */
  showEmissions?: boolean;
  /** Whether to allow configuration editing */
  allowConfigEdit?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when configuration changes */
  onConfigChange?: (fuelConfig: FuelCostConfig) => void;
}

/**
 * TripSummaryCard Component
 * 
 * Renders a comprehensive analytics card for trip data.
 * 
 * @example
 * ```tsx
 * <TripSummaryCard
 *   trip={myTrip}
 *   showDetailedMetrics={true}
 *   showFuelCost={true}
 *   allowConfigEdit={true}
 * />
 * ```
 */
const TripSummaryCard: React.FC<TripSummaryCardProps> = ({
  trip,
  fuelConfig = DEFAULT_FUEL_CONFIG,
  stopConfig = DEFAULT_STOP_CONFIG,
  showDetailedMetrics = true,
  showFuelCost = true,
  showEmissions = false,
  allowConfigEdit = false,
  className = '',
  onConfigChange
}) => {
  // State for editable fuel configuration
  const [editableFuelConfig, setEditableFuelConfig] = useState<FuelCostConfig>(fuelConfig);
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Calculate analytics
  const analytics: TripAnalytics = useMemo(() => {
    return calculateTripAnalytics(trip, editableFuelConfig, stopConfig);
  }, [trip, editableFuelConfig, stopConfig]);

  // Calculate CO2 emissions if enabled
  const co2Emissions = useMemo(() => {
    if (!showEmissions) return 0;
    return estimateCO2Emissions(analytics.totalDistance);
  }, [analytics.totalDistance, showEmissions]);

  // Update editable config when prop changes
  useEffect(() => {
    setEditableFuelConfig(fuelConfig);
  }, [fuelConfig]);

  // Handle configuration save
  const handleSaveConfig = () => {
    setIsEditingConfig(false);
    if (onConfigChange) {
      onConfigChange(editableFuelConfig);
    }
  };

  // Handle configuration cancel
  const handleCancelConfig = () => {
    setIsEditingConfig(false);
    setEditableFuelConfig(fuelConfig);
  };

  // Render metric item
  const renderMetric = (
    label: string,
    value: string | number,
    icon: string,
    highlight: boolean = false
  ) => (
    <div className={`trip-metric ${highlight ? 'highlight' : ''}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );

  return (
    <div className={`trip-summary-card ${className}`}>
      {/* Header */}
      <div className="summary-header">
        <h3 className="summary-title">Trip Summary</h3>
        <div className="summary-subtitle">{trip.name}</div>
      </div>

      {/* Primary Metrics */}
      <div className="metrics-grid primary-metrics">
        {renderMetric(
          'Distance',
          formatDistance(analytics.totalDistance),
          '📍',
          true
        )}
        {renderMetric(
          'Duration',
          analytics.formattedDuration,
          '⏱️',
          true
        )}
        {renderMetric(
          'Avg Speed',
          formatSpeed(analytics.averageSpeed),
          '🚗',
          true
        )}
        {showFuelCost && renderMetric(
          'Fuel Cost',
          formatCurrency(analytics.estimatedFuelCost, editableFuelConfig.currency),
          '⛽',
          true
        )}
      </div>

      {/* Detailed Metrics */}
      {showDetailedMetrics && (
        <div className="metrics-grid detailed-metrics">
          {renderMetric(
            'Max Speed',
            formatSpeed(analytics.maxSpeed),
            '⚡'
          )}
          {renderMetric(
            'Moving Time',
            analytics.formattedMovingTime,
            '🏃'
          )}
          {renderMetric(
            'Avg Moving Speed',
            formatSpeed(analytics.averageMovingSpeed),
            '➡️'
          )}
          {renderMetric(
            'Stops',
            `${analytics.stopCount} stop${analytics.stopCount !== 1 ? 's' : ''}`,
            '🛑'
          )}
          {renderMetric(
            'GPS Points',
            analytics.pointCount.toLocaleString(),
            '📊'
          )}
          {showEmissions && renderMetric(
            'CO₂ Emissions',
            `${co2Emissions.toFixed(2)} kg`,
            '🌍'
          )}
        </div>
      )}

      {/* Fuel Configuration */}
      {allowConfigEdit && showFuelCost && (
        <div className="fuel-config-section">
          <div className="config-header">
            <span className="config-title">⚙️ Fuel Settings</span>
            {!isEditingConfig && (
              <button
                className="btn-edit-config"
                onClick={() => setIsEditingConfig(true)}
                aria-label="Edit fuel configuration"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingConfig ? (
            <div className="config-form">
              <div className="form-group">
                <label htmlFor="pricePerLiter">
                  Fuel Price ({editableFuelConfig.currency}/L)
                </label>
                <input
                  id="pricePerLiter"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editableFuelConfig.pricePerLiter}
                  onChange={(e) => setEditableFuelConfig({
                    ...editableFuelConfig,
                    pricePerLiter: parseFloat(e.target.value) || 0
                  })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="fuelEfficiency">
                  Fuel Efficiency (km/L)
                </label>
                <input
                  id="fuelEfficiency"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editableFuelConfig.fuelEfficiency}
                  onChange={(e) => setEditableFuelConfig({
                    ...editableFuelConfig,
                    fuelEfficiency: parseFloat(e.target.value) || 0
                  })}
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-save"
                  onClick={handleSaveConfig}
                >
                  Save
                </button>
                <button
                  className="btn-cancel"
                  onClick={handleCancelConfig}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="config-display">
              <div className="config-item">
                <span className="config-label">Price:</span>
                <span className="config-value">
                  {formatCurrency(editableFuelConfig.pricePerLiter, editableFuelConfig.currency)}/L
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Efficiency:</span>
                <span className="config-value">
                  {editableFuelConfig.fuelEfficiency.toFixed(1)} km/L
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trip Info */}
      <div className="trip-info">
        <div className="info-item">
          <span className="info-label">Start:</span>
          <span className="info-value">
            {new Date(analytics.startTime).toLocaleString()}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">End:</span>
          <span className="info-value">
            {new Date(analytics.endTime).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TripSummaryCard;
