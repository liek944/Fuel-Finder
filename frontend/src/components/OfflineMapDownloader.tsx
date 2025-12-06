/**
 * OfflineMapDownloader Component
 * UI for downloading map tiles for offline use
 */

import React, { useState, useEffect } from 'react';
import { useMapDownloader, ORIENTAL_MINDORO_BOUNDS, MapRegion } from '../hooks/useMapDownloader';
import { offlineStorage, MapTileMetadata } from '../utils/offlineStorage';
import { formatRelativeTime } from '../utils/dataFreshness';
import './OfflineMapDownloader.css';

interface OfflineMapDownloaderProps {
  onClose?: () => void;
}

const ZOOM_LEVELS = {
  LOW: [10, 11, 12],
  MEDIUM: [10, 11, 12, 13, 14],
  HIGH: [10, 11, 12, 13, 14, 15, 16],
};

const ZOOM_DESCRIPTIONS = {
  LOW: 'City level (~15 MB)',
  MEDIUM: 'Street level (~60 MB)',
  HIGH: 'Full detail (~150 MB)',
};

export const OfflineMapDownloader: React.FC<OfflineMapDownloaderProps> = ({ onClose }) => {
  const {
    downloadMap,
    progress,
    isDownloading,
    isPaused,
    pause,
    resume,
    cancel,
    error,
    calculateDownloadSize,
  } = useMapDownloader();

  const [selectedZoom, setSelectedZoom] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [existingData, setExistingData] = useState<MapTileMetadata | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load existing map data on mount
  useEffect(() => {
    const loadExisting = async () => {
      const data = await offlineStorage.getMapTileMetadata(ORIENTAL_MINDORO_BOUNDS.name);
      setExistingData(data);
    };
    loadExisting();
  }, []);

  // Calculate estimated size
  const { tileCount, estimatedSizeMB } = calculateDownloadSize(
    ORIENTAL_MINDORO_BOUNDS as MapRegion,
    ZOOM_LEVELS[selectedZoom]
  );

  const handleDownload = () => {
    if (existingData) {
      setShowConfirm(true);
    } else {
      startDownload();
    }
  };

  const startDownload = () => {
    setShowConfirm(false);
    downloadMap(ORIENTAL_MINDORO_BOUNDS as MapRegion, ZOOM_LEVELS[selectedZoom]);
  };

  const handleClear = async () => {
    await offlineStorage.deleteMapTileMetadata(ORIENTAL_MINDORO_BOUNDS.name);
    setExistingData(null);
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="offline-map-downloader">
      <div className="offline-map-header">
        <div className="offline-map-icon">📴</div>
        <h3>Offline Maps</h3>
        {onClose && (
          <button className="offline-map-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      {/* Existing Data Info */}
      {existingData && !isDownloading && (
        <div className="offline-map-existing">
          <div className="existing-info">
            <span className="existing-label">📍 {existingData.region}</span>
            <span className="existing-details">
              {existingData.tileCount} tiles • {formatSize(existingData.sizeBytes)}
            </span>
            <span className="existing-time">
              Downloaded {formatRelativeTime(existingData.downloadedAt)}
            </span>
          </div>
          <button className="clear-button" onClick={handleClear}>
            Clear
          </button>
        </div>
      )}

      {/* Download Form */}
      {!isDownloading && (
        <div className="offline-map-form">
          <div className="form-group">
            <label>Region</label>
            <div className="region-display">
              <span className="region-icon">🗺️</span>
              <span>{ORIENTAL_MINDORO_BOUNDS.name}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Detail Level</label>
            <div className="zoom-options">
              {(Object.keys(ZOOM_LEVELS) as Array<'LOW' | 'MEDIUM' | 'HIGH'>).map((level) => (
                <button
                  key={level}
                  className={`zoom-option ${selectedZoom === level ? 'selected' : ''}`}
                  onClick={() => setSelectedZoom(level)}
                >
                  <span className="zoom-label">{level}</span>
                  <span className="zoom-desc">{ZOOM_DESCRIPTIONS[level]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="download-info">
            <div className="info-row">
              <span>Tiles to download:</span>
              <span>{tileCount.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span>Estimated size:</span>
              <span>~{estimatedSizeMB} MB</span>
            </div>
          </div>

          <button
            className="download-button"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {existingData ? 'Update Offline Map' : 'Download Offline Map'}
          </button>
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && (
        <div className="offline-map-progress">
          <div className="progress-text">
            <span>Downloading {ORIENTAL_MINDORO_BOUNDS.name}</span>
            <span className="zoom-info">Zoom level: {progress.currentZoom}</span>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="progress-details">
            <span>{progress.percentage}%</span>
            <span>
              {progress.current.toLocaleString()} / {progress.total.toLocaleString()} tiles
            </span>
            {progress.failedTiles > 0 && (
              <span className="failed-tiles">{progress.failedTiles} failed</span>
            )}
          </div>

          <div className="progress-controls">
            {isPaused ? (
              <button className="control-button resume" onClick={resume}>
                ▶️ Resume
              </button>
            ) : (
              <button className="control-button pause" onClick={pause}>
                ⏸️ Pause
              </button>
            )}
            <button className="control-button cancel" onClick={cancel}>
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <p>This will replace your existing offline map. Continue?</p>
            <div className="confirm-buttons">
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="confirm-primary" onClick={startDownload}>
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="offline-map-error">
          <span>⚠️ {error.message}</span>
        </div>
      )}
    </div>
  );
};

export default OfflineMapDownloader;
