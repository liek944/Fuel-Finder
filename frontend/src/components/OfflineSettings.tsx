/**
 * OfflineSettings Component
 * Settings panel for managing offline mode and cached data
 */

import React, { useState, useEffect, useCallback } from 'react';
import { offlineStorage, StorageEstimate } from '../utils/offlineStorage';
import { backgroundSync } from '../utils/backgroundSync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OfflineMapDownloader } from './OfflineMapDownloader';
import { formatRelativeTime } from '../utils/dataFreshness';
import './OfflineSettings.css';

interface OfflineSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSettings: React.FC<OfflineSettingsProps> = ({ isOpen, onClose }) => {
  const { isOnline, isOfflineMode, setOfflineMode } = useOnlineStatus();
  const [storageUsage, setStorageUsage] = useState<StorageEstimate | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showMapDownloader, setShowMapDownloader] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  // Load data on mount and updates
  const loadData = useCallback(async () => {
    try {
      const usage = await offlineStorage.getStorageUsage();
      setStorageUsage(usage);

      const syncCount = await backgroundSync.getPendingCount();
      setPendingSyncCount(syncCount);

      const lastSync = await offlineStorage.getMetadata<number>('lastSyncAt');
      setLastSyncAt(lastSync);
    } catch (error) {
      console.error('[OfflineSettings] Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const handleClearCache = async (type: 'all' | 'stations' | 'routes' | 'expired') => {
    setIsClearing(true);
    try {
      switch (type) {
        case 'all':
          await offlineStorage.clearAllData();
          break;
        case 'expired':
          await offlineStorage.clearExpiredData();
          break;
        default:
          // TODO: Implement selective clearing
          await offlineStorage.clearAllData();
      }
      await loadData();
    } catch (error) {
      console.error('[OfflineSettings] Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await backgroundSync.forceRetry();
      await offlineStorage.setMetadata('lastSyncAt', Date.now());
      await loadData();
    } catch (error) {
      console.error('[OfflineSettings] Failed to sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="offline-settings-overlay" onClick={onClose}>
      <div className="offline-settings" onClick={e => e.stopPropagation()}>
        <div className="offline-settings-header">
          <h2>📴 Offline Mode</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="offline-settings-content">
          {/* Status Card */}
          <div className="settings-card">
            <div className="card-header">
              <span className="card-icon">📶</span>
              <span className="card-title">Connection Status</span>
            </div>
            <div className="status-row">
              <span>Network:</span>
              <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
            <div className="status-row">
              <span>Offline Mode:</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isOfflineMode}
                  onChange={(e) => setOfflineMode(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {lastSyncAt && (
              <div className="status-row last-sync">
                <span>Last Sync:</span>
                <span>{formatRelativeTime(lastSyncAt)}</span>
              </div>
            )}
          </div>

          {/* Sync Queue Card */}
          {pendingSyncCount > 0 && (
            <div className="settings-card sync-card">
              <div className="card-header">
                <span className="card-icon">🔄</span>
                <span className="card-title">Pending Sync</span>
              </div>
              <p className="sync-message">
                {pendingSyncCount} action{pendingSyncCount !== 1 ? 's' : ''} waiting to sync
              </p>
              <button
                className="sync-button"
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}

          {/* Storage Card */}
          <div className="settings-card">
            <div className="card-header">
              <span className="card-icon">💾</span>
              <span className="card-title">Storage Usage</span>
            </div>
            
            {storageUsage ? (
              <>
                <div className="storage-row">
                  <span>Stations:</span>
                  <span>{storageUsage.stations.count} items ({formatBytes(storageUsage.stations.sizeBytes)})</span>
                </div>
                <div className="storage-row">
                  <span>Routes:</span>
                  <span>{storageUsage.routes.count} cached</span>
                </div>
                <div className="storage-row">
                  <span>Map Tiles:</span>
                  <span>{storageUsage.mapTiles.count} tiles ({formatBytes(storageUsage.mapTiles.sizeBytes)})</span>
                </div>
                <div className="storage-row total">
                  <span>Total:</span>
                  <span>{formatBytes(storageUsage.total.sizeBytes)}</span>
                </div>
              </>
            ) : (
              <p className="loading-text">Loading...</p>
            )}

            <div className="storage-actions">
              <button
                className="action-button secondary"
                onClick={() => handleClearCache('expired')}
                disabled={isClearing}
              >
                Clear Expired
              </button>
              <button
                className="action-button danger"
                onClick={() => handleClearCache('all')}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>

          {/* Map Download Card */}
          <div className="settings-card">
            <div className="card-header">
              <span className="card-icon">🗺️</span>
              <span className="card-title">Offline Maps</span>
            </div>
            <p className="card-description">
              Download map tiles for Oriental Mindoro to use offline
            </p>
            <button
              className="action-button primary"
              onClick={() => setShowMapDownloader(true)}
            >
              Manage Offline Maps
            </button>
          </div>

          {/* Routing Info Card */}
          <div className="settings-card">
            <div className="card-header">
              <span className="card-icon">🛣️</span>
              <span className="card-title">Offline Navigation</span>
            </div>
            <p className="card-description">
              Routes you've navigated while online are automatically cached for offline use.
              When offline, cached routes will be used. If no cached route exists, a simplified
              straight-line route will be shown.
            </p>
          </div>
        </div>

        {/* Map Downloader Modal */}
        {showMapDownloader && (
          <div className="map-downloader-overlay" onClick={() => setShowMapDownloader(false)}>
            <div onClick={e => e.stopPropagation()}>
              <OfflineMapDownloader onClose={() => setShowMapDownloader(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineSettings;

