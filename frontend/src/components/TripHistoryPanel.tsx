import React, { useState, useEffect } from 'react';
import { tripSessionManager } from '../utils/tripSessionManager';
import { Trip } from '../utils/indexedDB';
import '../styles/TripHistoryPanel.css';

interface TripHistoryPanelProps {
  onSelectTrip: (trip: Trip) => void;
  onClose: () => void;
}

const TripHistoryPanel: React.FC<TripHistoryPanelProps> = ({ onSelectTrip, onClose }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const allTrips = await tripSessionManager.getAllTrips();
      // Filter out active trips and sort by most recent
      const completedTrips = allTrips
        .filter(trip => !trip.isActive && trip.coordinates.length >= 2)
        .sort((a, b) => b.startTime - a.startTime);
      setTrips(completedTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTripId(trip.id);
    onSelectTrip(trip);
  };

  const handleDeleteTrip = async (tripId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Delete this trip?')) {
      try {
        await tripSessionManager.deleteTrip(tripId);
        await loadTrips();
        if (selectedTripId === tripId) {
          setSelectedTripId(null);
        }
      } catch (error) {
        console.error('Error deleting trip:', error);
      }
    }
  };

  const formatDuration = (startTime: number, endTime: number | null) => {
    if (!endTime) return 'In progress';
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="trip-history-panel">
      <div className="trip-history-header">
        <h2>📍 Trip History</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {loading ? (
        <div className="loading">Loading trips...</div>
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <p>🚗 No trips recorded yet</p>
          <p className="hint">Start recording a trip to see it here!</p>
        </div>
      ) : (
        <div className="trip-list">
          {trips.map(trip => (
            <div
              key={trip.id}
              className={`trip-item ${selectedTripId === trip.id ? 'selected' : ''}`}
              onClick={() => handleSelectTrip(trip)}
            >
              <div className="trip-item-header">
                <h3>{trip.name}</h3>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteTrip(trip.id, e)}
                  title="Delete trip"
                >
                  🗑️
                </button>
              </div>
              <div className="trip-item-details">
                <div className="detail">
                  <span className="label">📅</span>
                  <span className="value">{formatDate(trip.startTime)}</span>
                </div>
                <div className="detail">
                  <span className="label">⏱️</span>
                  <span className="value">{formatDuration(trip.startTime, trip.endTime)}</span>
                </div>
                <div className="detail">
                  <span className="label">📍</span>
                  <span className="value">{trip.coordinates.length} points</span>
                </div>
              </div>
              <div className="trip-item-action">
                <button className="replay-btn">
                  ▶️ Replay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripHistoryPanel;
