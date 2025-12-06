/**
 * Background Sync Utility
 * Handles syncing pending operations when connection is restored
 */

import { offlineStorage, SyncOperation } from './offlineStorage';
import { apiPost } from './api';
import { apiEndpoints } from '../constants/apiEndpoints';

// Maximum retry attempts before giving up
const MAX_RETRIES = 5;

// Exponential backoff settings
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60000;

// Event types for sync notifications
export type SyncEventType = 'syncStart' | 'syncComplete' | 'syncError' | 'syncItemComplete';

export interface SyncEvent {
  type: SyncEventType;
  operationId?: string;
  operationType?: string;
  success?: boolean;
  error?: Error;
  pendingCount?: number;
  completedCount?: number;
}

type SyncEventListener = (event: SyncEvent) => void;

/**
 * Background Sync Manager
 */
class BackgroundSyncManager {
  private isProcessing = false;
  private listeners: SyncEventListener[] = [];

  constructor() {
    // Listen for online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[BackgroundSync] Network restored, starting sync');
        this.processQueue();
      });
    }
  }

  /**
   * Register for Service Worker background sync (if supported)
   */
  async registerServiceWorkerSync(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      console.log('[BackgroundSync] Background Sync API not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (registration as any).sync.register('sync-fuel-finder');
      console.log('[BackgroundSync] Background sync registered');
      return true;
    } catch (error) {
      console.warn('[BackgroundSync] Failed to register background sync:', error);
      return false;
    }
  }

  /**
   * Add event listener for sync events
   */
  addEventListener(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit sync event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Process the sync queue
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing) {
      console.log('[BackgroundSync] Already processing queue');
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('[BackgroundSync] Still offline, skipping');
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let success = 0;
    let failed = 0;

    try {
      const operations = await offlineStorage.getPendingSyncOperations();

      if (operations.length === 0) {
        console.log('[BackgroundSync] No pending operations');
        return { success: 0, failed: 0 };
      }

      console.log(`[BackgroundSync] Processing ${operations.length} operations`);
      this.emit({ type: 'syncStart', pendingCount: operations.length });

      for (const op of operations) {
        try {
          const result = await this.processOperation(op);
          
          if (result) {
            await offlineStorage.removeSyncOperation(op.id);
            success++;
            this.emit({
              type: 'syncItemComplete',
              operationId: op.id,
              operationType: op.type,
              success: true,
              completedCount: success,
              pendingCount: operations.length - success - failed,
            });
          } else {
            if (op.retryCount >= MAX_RETRIES) {
              // Too many retries, remove from queue
              await offlineStorage.removeSyncOperation(op.id);
              failed++;
              console.warn(`[BackgroundSync] Max retries exceeded for ${op.id}`);
            } else {
              await offlineStorage.updateSyncOperationRetry(op.id);
            }
          }
        } catch (error) {
          console.error(`[BackgroundSync] Error processing ${op.id}:`, error);
          await offlineStorage.updateSyncOperationRetry(op.id);
        }
      }

      this.emit({
        type: 'syncComplete',
        completedCount: success,
        pendingCount: await offlineStorage.getSyncQueueCount(),
      });

      console.log(`[BackgroundSync] Completed: ${success} success, ${failed} failed`);
    } finally {
      this.isProcessing = false;
    }

    return { success, failed };
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(op: SyncOperation): Promise<boolean> {
    // Calculate delay with exponential backoff
    if (op.retryCount > 0) {
      const delay = Math.min(
        BASE_DELAY_MS * Math.pow(2, op.retryCount - 1),
        MAX_DELAY_MS
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    switch (op.type) {
      case 'priceReport':
        return this.syncPriceReport(op);
      
      case 'review':
        return this.syncReview(op);
      
      case 'donation':
        return this.syncDonation(op);
      
      default:
        console.warn(`[BackgroundSync] Unknown operation type: ${op.type}`);
        return false;
    }
  }

  /**
   * Sync a price report
   */
  private async syncPriceReport(op: SyncOperation): Promise<boolean> {
    const { stationId, fuel_type, price, notes } = op.data as {
      stationId: number;
      fuel_type: string;
      price: number;
      notes?: string | null;
    };

    try {
      const res = await apiPost(
        apiEndpoints.stations.reportPrice(stationId),
        { fuel_type, price, notes }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      console.log(`[BackgroundSync] Synced price report for station ${stationId}`);
      return true;
    } catch (error) {
      console.error('[BackgroundSync] Failed to sync price report:', error);
      return false;
    }
  }

  /**
   * Sync a review (placeholder for future implementation)
   */
  private async syncReview(op: SyncOperation): Promise<boolean> {
    console.log('[BackgroundSync] Review sync not yet implemented', op.data);
    // TODO: Implement when review API is available
    return true; // Remove from queue for now
  }

  /**
   * Sync a donation (placeholder for future implementation)
   */
  private async syncDonation(op: SyncOperation): Promise<boolean> {
    console.log('[BackgroundSync] Donation sync not yet implemented', op.data);
    // TODO: Implement when donation API is available
    return true; // Remove from queue for now
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    return offlineStorage.getSyncQueueCount();
  }

  /**
   * Check if any operations are pending
   */
  async hasPendingOperations(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count > 0;
  }

  /**
   * Force retry all pending operations
   */
  async forceRetry(): Promise<{ success: number; failed: number }> {
    if (!navigator.onLine) {
      return { success: 0, failed: 0 };
    }
    return this.processQueue();
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncManager();

// Hook for React components
export function useBackgroundSync() {
  return backgroundSync;
}

export default backgroundSync;
