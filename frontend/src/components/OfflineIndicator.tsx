/**
 * OfflineIndicator Component
 * Visual indicator when app is in offline mode
 */

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { formatRelativeTime } from '../utils/dataFreshness';
import './OfflineIndicator.css';

interface OfflineIndicatorProps {
  /** Timestamp when data was last synced */
  lastSyncAt?: number | null;
  /** Callback to retry connection */
  onRetryConnection?: () => void;
  /** Number of pending sync operations */
  pendingSyncCount?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  lastSyncAt,
  onRetryConnection,
  pendingSyncCount = 0,
}) => {
  const { isOnline, isOfflineMode, lastOfflineAt } = useOnlineStatus();

  // Don't render if online and not in offline mode
  if (isOnline && !isOfflineMode) {
    return null;
  }

  const handleRetry = async () => {
    if (onRetryConnection) {
      onRetryConnection();
    } else {
      // Simple retry by fetching a small resource
      try {
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
        window.location.reload();
      } catch {
        // Still offline
      }
    }
  };

  return (
    <div className="offline-indicator" role="alert" aria-live="polite">
      <div className="offline-indicator-icon">📴</div>
      <div className="offline-indicator-content">
        <span className="offline-indicator-title">Offline Mode</span>
        {lastSyncAt && (
          <span className="offline-indicator-sync">
            Using cached data from {formatRelativeTime(lastSyncAt)}
          </span>
        )}
        {!lastSyncAt && lastOfflineAt && (
          <span className="offline-indicator-sync">
            Went offline {formatRelativeTime(lastOfflineAt)}
          </span>
        )}
        {pendingSyncCount > 0 && (
          <span className="offline-indicator-pending">
            {pendingSyncCount} action{pendingSyncCount !== 1 ? 's' : ''} pending sync
          </span>
        )}
      </div>
      <button 
        className="offline-indicator-retry" 
        onClick={handleRetry}
        title="Retry connection"
      >
        ↻ Retry
      </button>
    </div>
  );
};

export default OfflineIndicator;
