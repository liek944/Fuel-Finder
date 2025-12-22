/**
 * OfflineDataDownloader Component
 * UI for downloading all stations and POIs for offline use
 */

import React, { useState, useEffect } from 'react';
import { useOfflineDataDownloader, DownloadPhase } from '../hooks/useOfflineDataDownloader';
import { offlineStorage, StorageEstimate } from '../utils/offlineStorage';
import { formatRelativeTime } from '../utils/dataFreshness';
import './OfflineDataDownloader.css';

interface OfflineDataDownloaderProps {
  onComplete?: () => void;
}

const PHASE_LABELS: Record<DownloadPhase, string> = {
  idle: 'Ready to download',
  stations: 'Downloading stations...',
  pois: 'Downloading POIs...',
  complete: 'Download complete!',
  error: 'Download failed',
};

export const OfflineDataDownloader: React.FC<OfflineDataDownloaderProps> = ({ onComplete }) => {
  const {
    downloadAllData,
    progress,
    isDownloading,
    cancel,
    error,
    getLastDownloadTime,
  } = useOfflineDataDownloader();

  const [lastDownloadAt, setLastDownloadAt] = useState<number | null>(null);
  const [existingData, setExistingData] = useState<StorageEstimate | null>(null);

  // Load existing data info on mount
  useEffect(() => {
    const loadExisting = async () => {
      const lastTime = await getLastDownloadTime();
      setLastDownloadAt(lastTime);

      const usage = await offlineStorage.getStorageUsage();
      setExistingData(usage);
    };
    loadExisting();
  }, [getLastDownloadTime, progress.phase]);

  // Notify parent on complete
  useEffect(() => {
    if (progress.phase === 'complete' && onComplete) {
      onComplete();
    }
  }, [progress.phase, onComplete]);

  const handleDownload = async () => {
    await downloadAllData();
    // Refresh data after download
    const lastTime = await getLastDownloadTime();
    setLastDownloadAt(lastTime);
    const usage = await offlineStorage.getStorageUsage();
    setExistingData(usage);
  };

  const hasData = existingData && (existingData.stations.count > 0 || existingData.pois.count > 0);

  return (
    <div className="offline-data-downloader">
      {/* Existing Data Info */}
      {hasData && !isDownloading && progress.phase !== 'complete' && (
        <div className="data-existing">
          <div className="existing-stats">
            <span className="stat-item">
              ⛽ {existingData.stations.count} stations
            </span>
            <span className="stat-item">
              📍 {existingData.pois.count} POIs
            </span>
          </div>
          {lastDownloadAt && (
            <span className="existing-time">
              Downloaded {formatRelativeTime(lastDownloadAt)}
            </span>
          )}
        </div>
      )}

      {/* Download Button */}
      {!isDownloading && progress.phase !== 'complete' && (
        <button
          className="data-download-button"
          onClick={handleDownload}
        >
          📥 {hasData ? 'Update Offline Data' : 'Download All Data'}
        </button>
      )}

      {/* Progress Display */}
      {isDownloading && (
        <div className="data-download-progress">
          <div className="progress-phase">
            {PHASE_LABELS[progress.phase]}
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="progress-details">
            <span>{progress.percentage}%</span>
            {progress.stationsCount > 0 && (
              <span>⛽ {progress.stationsCount}</span>
            )}
            {progress.poisCount > 0 && (
              <span>📍 {progress.poisCount}</span>
            )}
          </div>

          <button className="cancel-button" onClick={cancel}>
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Success State */}
      {progress.phase === 'complete' && !isDownloading && (
        <div className="data-download-success">
          <span className="success-icon">✅</span>
          <div className="success-text">
            <strong>Download complete!</strong>
            <span>
              {progress.stationsCount} stations, {progress.poisCount} POIs saved
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="data-download-error">
          <span>⚠️ {error.message}</span>
          <button className="retry-button" onClick={handleDownload}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineDataDownloader;
