/**
 * Trip Recorder Component
 * UI for recording GPS trips with Start/Stop controls
 */

import React, { useState, useEffect } from 'react';
import { locationRecorder, RecorderState } from '../utils/locationRecorder';
import { Trip } from '../utils/indexedDB';
import '../styles/TripRecorder.css';

interface TripRecorderProps {
  onTripComplete?: (trip: Trip) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

const TripRecorder: React.FC<TripRecorderProps> = ({
  onTripComplete,
  onRecordingStateChange,
}) => {
  const [recorderState, setRecorderState] = useState<RecorderState>(
    locationRecorder.getState()
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    // Subscribe to recorder state changes
    const unsubscribe = locationRecorder.subscribe((state) => {
      setRecorderState(state);
      onRecordingStateChange?.(state.status === 'recording');
    });

    return () => {
      unsubscribe();
    };
  }, [onRecordingStateChange]);

  const handleStartRecording = async () => {
    const hasPermission = await locationRecorder.requestPermission();
    if (!hasPermission) {
      return;
    }

    const name = tripName.trim() || undefined;
    const success = await locationRecorder.startRecording(name);
    
    if (success) {
      setTripName('');
      setIsExpanded(true);
    }
  };

  const handleStopRecording = async () => {
    const trip = await locationRecorder.stopRecording();
    if (trip && onTripComplete) {
      onTripComplete(trip);
    }
    setIsExpanded(false);
  };

  const handlePauseRecording = () => {
    locationRecorder.pauseRecording();
  };

  const handleResumeRecording = () => {
    locationRecorder.resumeRecording();
  };

  const formatDuration = (startTime: number): string => {
    const duration = Date.now() - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatAccuracy = (accuracy?: number): string => {
    if (!accuracy) return 'N/A';
    return `±${Math.round(accuracy)}m`;
  };

  const getStatusColor = (): string => {
    switch (recorderState.status) {
      case 'recording':
        return '#4CAF50';
      case 'paused':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const getStatusText = (): string => {
    switch (recorderState.status) {
      case 'recording':
        return 'Recording';
      case 'paused':
        return 'Paused';
      case 'error':
        return 'Error';
      default:
        return '⏺ Record';
    }
  };

  return (
    <div className={`trip-recorder ${isExpanded ? 'expanded' : ''}`}>
      {/* Compact Header */}
      <div className="trip-recorder-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}>
          <div className={`pulse ${recorderState.status === 'recording' ? 'active' : ''}`} />
        </div>
        <div className="header-info">
          <span className="status-text">{getStatusText()}</span>
          {recorderState.status === 'recording' && recorderState.currentTrip && (
            <span className="points-count">
              {recorderState.pointsRecorded} points
            </span>
          )}
        </div>
        <button
          className="expand-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="trip-recorder-content">
          {recorderState.status === 'idle' && (
            <div className="start-section">
              <h3>Start New Trip</h3>
              <input
                type="text"
                className="trip-name-input"
                placeholder="Trip name (optional)"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleStartRecording();
                  }
                }}
              />
              <button
                className="btn btn-start"
                onClick={handleStartRecording}
              >
                <span className="btn-icon">📍</span>
                Start Recording
              </button>
              <p className="help-text">
                GPS tracking will record your location every few seconds
              </p>
            </div>
          )}

          {(recorderState.status === 'recording' || recorderState.status === 'paused') && (
            <div className="recording-section">
              <h3>{recorderState.currentTrip?.name || 'Current Trip'}</h3>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">
                    {recorderState.currentTrip?.startTime
                      ? formatDuration(recorderState.currentTrip.startTime)
                      : '0s'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Points</span>
                  <span className="stat-value">{recorderState.pointsRecorded}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Accuracy</span>
                  <span className="stat-value">
                    {formatAccuracy(recorderState.lastPoint?.accuracy)}
                  </span>
                </div>
                {recorderState.lastPoint?.speed !== null && (
                  <div className="stat-item">
                    <span className="stat-label">Speed</span>
                    <span className="stat-value">
                      {recorderState.lastPoint?.speed
                        ? `${Math.round(recorderState.lastPoint.speed * 3.6)} km/h`
                        : '0 km/h'}
                    </span>
                  </div>
                )}
              </div>

              {recorderState.lastPoint && (
                <div className="last-point-info">
                  <p className="coordinates">
                    📍 {recorderState.lastPoint.latitude.toFixed(6)}, {recorderState.lastPoint.longitude.toFixed(6)}
                  </p>
                  <p className="timestamp">
                    Last update: {new Date(recorderState.lastPoint.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}

              <div className="control-buttons">
                {recorderState.status === 'recording' ? (
                  <button
                    className="btn btn-pause"
                    onClick={handlePauseRecording}
                  >
                    <span className="btn-icon">⏸</span>
                    Pause
                  </button>
                ) : (
                  <button
                    className="btn btn-resume"
                    onClick={handleResumeRecording}
                  >
                    <span className="btn-icon">▶</span>
                    Resume
                  </button>
                )}
                <button
                  className="btn btn-stop"
                  onClick={handleStopRecording}
                >
                  <span className="btn-icon">⏹</span>
                  Stop & Save
                </button>
              </div>
            </div>
          )}

          {recorderState.status === 'error' && (
            <div className="error-section">
              <div className="error-icon">⚠️</div>
              <h3>Error</h3>
              <p className="error-message">{recorderState.error}</p>
              <button
                className="btn btn-retry"
                onClick={handleStartRecording}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripRecorder;
