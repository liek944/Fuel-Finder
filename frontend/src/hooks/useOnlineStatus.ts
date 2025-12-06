/**
 * useOnlineStatus Hook
 * React hook for tracking online/offline status with event listeners
 */

import { useState, useEffect, useCallback } from 'react';

export interface OnlineStatus {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Whether we're in offline mode (can be forced even when online) */
  isOfflineMode: boolean;
  /** Timestamp when we last went online */
  lastOnlineAt: number | null;
  /** Timestamp when we last went offline */
  lastOfflineAt: number | null;
  /** Force offline mode (for testing or user preference) */
  setOfflineMode: (offline: boolean) => void;
}

/**
 * Hook to track browser online/offline status
 * @returns OnlineStatus object with status and controls
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(
    typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null
  );
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);

  const handleOnline = useCallback(() => {
    console.log('[useOnlineStatus] Browser went online');
    setIsOnline(true);
    setLastOnlineAt(Date.now());
  }, []);

  const handleOffline = useCallback(() => {
    console.log('[useOnlineStatus] Browser went offline');
    setIsOnline(false);
    setLastOfflineAt(Date.now());
  }, []);

  const setOfflineMode = useCallback((offline: boolean) => {
    console.log(`[useOnlineStatus] ${offline ? 'Enabling' : 'Disabling'} offline mode`);
    setIsOfflineMode(offline);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isOfflineMode: isOfflineMode || !isOnline, // Offline if forced OR actually offline
    lastOnlineAt,
    lastOfflineAt,
    setOfflineMode,
  };
}

/**
 * Check if the browser is currently online
 * Simple utility function for one-off checks
 */
export function checkIsOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Wait for the browser to come online
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise that resolves when online, rejects on timeout
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const onlineHandler = () => {
      window.removeEventListener('online', onlineHandler);
      clearTimeout(timeout);
      resolve();
    };

    const timeout = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      reject(new Error('Timeout waiting for online status'));
    }, timeoutMs);

    window.addEventListener('online', onlineHandler);
  });
}

export default useOnlineStatus;
