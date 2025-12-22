/**
 * Offline Mode State Manager
 * 
 * A simple state manager for forced offline mode that can be used by both
 * React components (via useOnlineStatus hook) and non-React code (API layer).
 * 
 * This is NOT a React hook - it's a plain JS module that manages state
 * and persists to localStorage.
 */

const STORAGE_KEY = 'fuel-finder-force-offline-mode';

type OfflineModeListener = (isForceOffline: boolean) => void;

class OfflineModeState {
  private _isForceOffline: boolean = false;
  private _listeners: Set<OfflineModeListener> = new Set();

  constructor() {
    // Load persisted state on initialization
    this._loadFromStorage();
  }

  private _loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this._isForceOffline = stored === 'true';
        console.log(`[OfflineModeState] Loaded from storage: ${this._isForceOffline}`);
      }
    } catch (error) {
      console.warn('[OfflineModeState] Failed to load from storage:', error);
    }
  }

  private _saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this._isForceOffline));
    } catch (error) {
      console.warn('[OfflineModeState] Failed to save to storage:', error);
    }
  }

  /**
   * Check if forced offline mode is enabled
   */
  isForceOffline(): boolean {
    return this._isForceOffline;
  }

  /**
   * Check if the app should behave as offline
   * Returns true if either:
   * - Force offline mode is ON
   * - Browser is actually offline
   */
  shouldActOffline(): boolean {
    return this._isForceOffline || !navigator.onLine;
  }

  /**
   * Set forced offline mode
   */
  setForceOffline(value: boolean): void {
    if (this._isForceOffline === value) return;

    console.log(`[OfflineModeState] ${value ? 'Enabling' : 'Disabling'} forced offline mode`);
    this._isForceOffline = value;
    this._saveToStorage();
    
    // Notify all listeners
    this._listeners.forEach(listener => {
      try {
        listener(value);
      } catch (error) {
        console.error('[OfflineModeState] Listener error:', error);
      }
    });
  }

  /**
   * Subscribe to offline mode changes
   * @returns Unsubscribe function
   */
  subscribe(listener: OfflineModeListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }
}

// Singleton instance
export const offlineModeState = new OfflineModeState();

// Convenience exports
export const isForceOffline = () => offlineModeState.isForceOffline();
export const shouldActOffline = () => offlineModeState.shouldActOffline();
export const setForceOffline = (value: boolean) => offlineModeState.setForceOffline(value);
