/**
 * useOfflineDataDownloader Hook
 * React hook for bulk downloading all stations and POIs for offline use
 */

import { useState, useCallback, useRef } from 'react';
import { apiEndpoints } from '../constants/apiEndpoints';
import { offlineStorage } from '../utils/offlineStorage';
import type { Station, POI } from '../types/station.types';

// Get API base URL for fetch calls
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production, use relative URL
  return '';
};

export type DownloadPhase = 'idle' | 'stations' | 'pois' | 'complete' | 'error';

export interface DataDownloadProgress {
  phase: DownloadPhase;
  current: number;
  total: number;
  percentage: number;
  stationsCount: number;
  poisCount: number;
}

export interface UseOfflineDataDownloaderReturn {
  /** Start downloading all data for offline use */
  downloadAllData: () => Promise<void>;
  /** Current download progress */
  progress: DataDownloadProgress;
  /** Whether download is in progress */
  isDownloading: boolean;
  /** Cancel the download */
  cancel: () => void;
  /** Error if download failed */
  error: Error | null;
  /** Get last download timestamp */
  getLastDownloadTime: () => Promise<number | null>;
}

/**
 * Hook for downloading all stations and POIs for offline use
 */
export function useOfflineDataDownloader(): UseOfflineDataDownloaderReturn {
  const [progress, setProgress] = useState<DataDownloadProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
    percentage: 0,
    stationsCount: 0,
    poisCount: 0,
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const downloadAllData = useCallback(async () => {
    setIsDownloading(true);
    setError(null);
    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();

    const baseUrl = getApiUrl();
    console.log('[OfflineDataDownloader] Starting bulk data download');

    try {
      // Phase 1: Download all stations
      setProgress({
        phase: 'stations',
        current: 0,
        total: 2, // 2 phases total
        percentage: 0,
        stationsCount: 0,
        poisCount: 0,
      });

      if (isCancelledRef.current) return;

      console.log('[OfflineDataDownloader] Fetching all stations...');
      const stationsRes = await fetch(`${baseUrl}${apiEndpoints.stations.all()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!stationsRes.ok) {
        throw new Error(`Failed to fetch stations: HTTP ${stationsRes.status}`);
      }

      const stations: Station[] = await stationsRes.json();
      console.log(`[OfflineDataDownloader] Received ${stations.length} stations`);

      if (isCancelledRef.current) return;

      // Cache stations to IndexedDB
      await offlineStorage.cacheStations(stations);

      setProgress({
        phase: 'pois',
        current: 1,
        total: 2,
        percentage: 50,
        stationsCount: stations.length,
        poisCount: 0,
      });

      // Phase 2: Download all POIs
      if (isCancelledRef.current) return;

      console.log('[OfflineDataDownloader] Fetching all POIs...');
      const poisRes = await fetch(`${baseUrl}${apiEndpoints.pois.all()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!poisRes.ok) {
        throw new Error(`Failed to fetch POIs: HTTP ${poisRes.status}`);
      }

      const pois: POI[] = await poisRes.json();
      console.log(`[OfflineDataDownloader] Received ${pois.length} POIs`);

      if (isCancelledRef.current) return;

      // Cache POIs to IndexedDB
      await offlineStorage.cachePOIs(pois);

      // Save download timestamp
      await offlineStorage.setMetadata('lastDataDownloadAt', Date.now());

      setProgress({
        phase: 'complete',
        current: 2,
        total: 2,
        percentage: 100,
        stationsCount: stations.length,
        poisCount: pois.length,
      });

      console.log(`[OfflineDataDownloader] Download complete: ${stations.length} stations, ${pois.length} POIs`);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('[OfflineDataDownloader] Download cancelled');
        return;
      }
      
      setError(err as Error);
      setProgress(prev => ({ ...prev, phase: 'error' }));
      console.error('[OfflineDataDownloader] Download failed:', err);
    } finally {
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    console.log('[OfflineDataDownloader] Cancelling download');
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    setIsDownloading(false);
    setProgress(prev => ({ ...prev, phase: 'idle' }));
  }, []);

  const getLastDownloadTime = useCallback(async (): Promise<number | null> => {
    return offlineStorage.getMetadata<number>('lastDataDownloadAt');
  }, []);

  return {
    downloadAllData,
    progress,
    isDownloading,
    cancel,
    error,
    getLastDownloadTime,
  };
}

export default useOfflineDataDownloader;
