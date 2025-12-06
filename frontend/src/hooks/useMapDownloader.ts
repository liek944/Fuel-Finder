/**
 * useMapDownloader Hook
 * React hook for managing map tile downloads for offline use
 */

import { useState, useCallback, useRef } from 'react';
import { offlineStorage, MapTileMetadata } from '../utils/offlineStorage';

// Oriental Mindoro bounding box
export const ORIENTAL_MINDORO_BOUNDS = {
  north: 13.5,
  south: 12.2,
  east: 121.5,
  west: 120.8,
  name: 'Oriental Mindoro',
} as const;

export interface MapRegion {
  name: string;
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  currentZoom: number;
  failedTiles: number;
}

export interface UseMapDownloaderReturn {
  /** Start downloading map tiles for a region */
  downloadMap: (region: MapRegion, zoomLevels: number[]) => Promise<void>;
  /** Current download progress */
  progress: DownloadProgress;
  /** Whether download is in progress */
  isDownloading: boolean;
  /** Whether download is paused */
  isPaused: boolean;
  /** Pause the download */
  pause: () => void;
  /** Resume the download */
  resume: () => void;
  /** Cancel the download */
  cancel: () => void;
  /** Error if download failed */
  error: Error | null;
  /** Estimated download size in MB */
  estimatedSizeMB: number;
  /** Calculate tile count and size for a region */
  calculateDownloadSize: (region: MapRegion, zoomLevels: number[]) => { tileCount: number; estimatedSizeMB: number };
}

// OSM tile URL template
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Average tile size in bytes (varies but ~10KB is typical)
const AVERAGE_TILE_SIZE_BYTES = 10240;

// Concurrent download limit
const CONCURRENT_DOWNLOADS = 10;

/**
 * Convert latitude/longitude to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Generate all tile URLs for a region and zoom levels
 */
function generateTileUrls(region: MapRegion, zoomLevels: number[]): string[] {
  const urls: string[] = [];

  for (const zoom of zoomLevels) {
    const topLeft = latLngToTile(region.north, region.west, zoom);
    const bottomRight = latLngToTile(region.south, region.east, zoom);

    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        urls.push(
          OSM_TILE_URL.replace('{z}', zoom.toString())
            .replace('{x}', x.toString())
            .replace('{y}', y.toString())
        );
      }
    }
  }

  return urls;
}

/**
 * Calculate the number of tiles for a region
 */
function calculateTileCount(region: MapRegion, zoomLevels: number[]): number {
  let count = 0;

  for (const zoom of zoomLevels) {
    const topLeft = latLngToTile(region.north, region.west, zoom);
    const bottomRight = latLngToTile(region.south, region.east, zoom);

    const width = bottomRight.x - topLeft.x + 1;
    const height = bottomRight.y - topLeft.y + 1;
    count += width * height;
  }

  return count;
}

/**
 * Hook for downloading map tiles
 */
export function useMapDownloader(): UseMapDownloaderReturn {
  const [progress, setProgress] = useState<DownloadProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    currentZoom: 0,
    failedTiles: 0,
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [estimatedSizeMB, setEstimatedSizeMB] = useState(0);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDownloadSize = useCallback((region: MapRegion, zoomLevels: number[]) => {
    const tileCount = calculateTileCount(region, zoomLevels);
    const estimatedSizeMB = (tileCount * AVERAGE_TILE_SIZE_BYTES) / (1024 * 1024);
    return { tileCount, estimatedSizeMB: Math.round(estimatedSizeMB * 10) / 10 };
  }, []);

  const downloadMap = useCallback(async (region: MapRegion, zoomLevels: number[]) => {
    setIsDownloading(true);
    setError(null);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();

    const urls = generateTileUrls(region, zoomLevels);
    const totalTiles = urls.length;
    const { estimatedSizeMB } = calculateDownloadSize(region, zoomLevels);
    setEstimatedSizeMB(estimatedSizeMB);

    console.log(`[MapDownloader] Starting download: ${totalTiles} tiles, ~${estimatedSizeMB}MB`);

    setProgress({
      current: 0,
      total: totalTiles,
      percentage: 0,
      currentZoom: zoomLevels[0],
      failedTiles: 0,
    });

    let completed = 0;
    let failed = 0;
    let downloadedBytes = 0;

    // Process tiles in batches
    const downloadTile = async (url: string): Promise<boolean> => {
      // Check for pause/cancel
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (isCancelledRef.current) {
        return false;
      }

      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
          cache: 'force-cache', // Use cache API
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Read the blob to ensure it's cached
        const blob = await response.blob();
        downloadedBytes += blob.size;
        return true;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return false;
        }
        console.warn(`[MapDownloader] Failed to download tile: ${url}`, err);
        return false;
      }
    };

    try {
      // Process in concurrent batches
      for (let i = 0; i < urls.length; i += CONCURRENT_DOWNLOADS) {
        if (isCancelledRef.current) {
          break;
        }

        const batch = urls.slice(i, i + CONCURRENT_DOWNLOADS);
        const results = await Promise.all(batch.map(downloadTile));

        results.forEach((success) => {
          completed++;
          if (!success) failed++;
        });

        // Update progress
        const currentZoom = Math.floor(i / (totalTiles / zoomLevels.length)) + zoomLevels[0];
        setProgress({
          current: completed,
          total: totalTiles,
          percentage: Math.round((completed / totalTiles) * 100),
          currentZoom: Math.min(currentZoom, zoomLevels[zoomLevels.length - 1]),
          failedTiles: failed,
        });
      }

      if (!isCancelledRef.current) {
        // Save metadata
        const metadata: MapTileMetadata = {
          region: region.name,
          zoomLevel: zoomLevels[zoomLevels.length - 1],
          tileCount: completed - failed,
          downloadedAt: Date.now(),
          sizeBytes: downloadedBytes || (completed - failed) * AVERAGE_TILE_SIZE_BYTES,
        };

        await offlineStorage.saveMapTileMetadata(metadata);
        console.log(`[MapDownloader] Download complete: ${completed - failed}/${totalTiles} tiles`);
      }
    } catch (err) {
      setError(err as Error);
      console.error('[MapDownloader] Download failed:', err);
    } finally {
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  }, [calculateDownloadSize]);

  const pause = useCallback(() => {
    console.log('[MapDownloader] Pausing download');
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    console.log('[MapDownloader] Resuming download');
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const cancel = useCallback(() => {
    console.log('[MapDownloader] Cancelling download');
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    abortControllerRef.current?.abort();
    setIsDownloading(false);
  }, []);

  return {
    downloadMap,
    progress,
    isDownloading,
    isPaused,
    pause,
    resume,
    cancel,
    error,
    estimatedSizeMB,
    calculateDownloadSize,
  };
}

export default useMapDownloader;
