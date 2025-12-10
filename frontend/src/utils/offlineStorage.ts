/**
 * Offline Storage Manager for Fuel Finder
 * Provides centralized offline data management using IndexedDB
 * 
 * Stores:
 * - stations: Cached station data with metadata
 * - routes: Pre-cached route geometries
 * - mapTiles: Map tile metadata (tiles cached by service worker)
 * - syncQueue: Pending operations to sync when online
 */

import type { Station, POI } from '../types/station.types';
import type { RouteData } from '../api/routingApi';

// Database configuration
const DB_NAME = 'FuelFinderOffline';
const DB_VERSION = 2; // Incremented for POI store

// Store names
const STORES = {
  STATIONS: 'stations',
  POIS: 'pois',
  ROUTES: 'routes',
  MAP_TILES: 'mapTiles',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
} as const;

// Expiration times in milliseconds
export const EXPIRATION = {
  STATIONS: 7 * 24 * 60 * 60 * 1000, // 7 days
  POIS: 7 * 24 * 60 * 60 * 1000, // 7 days (same as stations)
  ROUTES: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAP_TILES: 90 * 24 * 60 * 60 * 1000, // 90 days
  PRICE_DATA: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Types
export interface CachedStation extends Station {
  cachedAt: number;
  expiresAt: number;
}

export interface CachedPOI extends POI {
  cachedAt: number;
  expiresAt: number;
}

export interface CachedRoute {
  key: string; // Format: "startLat,startLng-endLat,endLng"
  data: RouteData;
  cachedAt: number;
  expiresAt: number;
}

export interface MapTileMetadata {
  region: string;
  zoomLevel: number;
  tileCount: number;
  downloadedAt: number;
  sizeBytes: number;
}

export interface SyncOperation {
  id: string;
  type: 'priceReport' | 'review' | 'donation';
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastRetryAt?: number;
}

export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface StorageEstimate {
  stations: { count: number; sizeBytes: number };
  pois: { count: number; sizeBytes: number };
  routes: { count: number; sizeBytes: number };
  mapTiles: { count: number; sizeBytes: number };
  syncQueue: { count: number };
  total: { count: number; sizeBytes: number };
}

/**
 * Data freshness levels for UI indicators
 */
export enum DataFreshness {
  FRESH = 'fresh', // < 24 hours
  STALE = 'stale', // 1-7 days
  VERY_OLD = 'very_old', // > 7 days
}

/**
 * Offline Storage Manager
 * Singleton class for managing all offline data
 */
class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  /**
   * Initialize the IndexedDB database
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stations store
        if (!db.objectStoreNames.contains(STORES.STATIONS)) {
          const stationsStore = db.createObjectStore(STORES.STATIONS, { keyPath: 'id' });
          stationsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          stationsStore.createIndex('lat', 'location.lat', { unique: false });
          stationsStore.createIndex('lng', 'location.lng', { unique: false });
          console.log('[OfflineStorage] Created stations store');
        }

        // Create routes store
        if (!db.objectStoreNames.contains(STORES.ROUTES)) {
          const routesStore = db.createObjectStore(STORES.ROUTES, { keyPath: 'key' });
          routesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('[OfflineStorage] Created routes store');
        }

        // Create POIs store
        if (!db.objectStoreNames.contains(STORES.POIS)) {
          const poisStore = db.createObjectStore(STORES.POIS, { keyPath: 'id' });
          poisStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          poisStore.createIndex('type', 'type', { unique: false });
          poisStore.createIndex('lat', 'location.lat', { unique: false });
          poisStore.createIndex('lng', 'location.lng', { unique: false });
          console.log('[OfflineStorage] Created POIs store');
        }

        // Create map tiles store
        if (!db.objectStoreNames.contains(STORES.MAP_TILES)) {
          const mapTilesStore = db.createObjectStore(STORES.MAP_TILES, { keyPath: 'region' });
          mapTilesStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          console.log('[OfflineStorage] Created map tiles store');
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
          syncQueueStore.createIndex('type', 'type', { unique: false });
          console.log('[OfflineStorage] Created sync queue store');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
          console.log('[OfflineStorage] Created metadata store');
        }
      };
    });
  }

  /**
   * Ensure DB is ready before operations
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await this.dbReady;
    }
    return this.db;
  }

  // ==================== STATIONS ====================

  /**
   * Cache an array of stations
   */
  async cacheStations(stations: Station[]): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.STATIONS);

      stations.forEach((station) => {
        const cachedStation: CachedStation = {
          ...station,
          cachedAt: now,
          expiresAt: now + EXPIRATION.STATIONS,
        };
        store.put(cachedStation);
      });

      transaction.oncomplete = () => {
        console.log(`[OfflineStorage] Cached ${stations.length} stations`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[OfflineStorage] Failed to cache stations:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get offline stations, optionally filtered by bounds
   */
  async getOfflineStations(options?: {
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    bounds?: LatLngBounds;
  }): Promise<CachedStation[]> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STATIONS], 'readonly');
      const store = transaction.objectStore(STORES.STATIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        let stations = (request.result as CachedStation[]).filter(
          (station) => station.expiresAt > now
        );

        // Filter by bounds if provided
        if (options?.bounds) {
          const { north, south, east, west } = options.bounds;
          stations = stations.filter((station) => {
            const { lat, lng } = station.location;
            return lat <= north && lat >= south && lng <= east && lng >= west;
          });
        }

        // Filter by radius if provided
        if (options?.lat !== undefined && options?.lng !== undefined && options?.radiusMeters) {
          stations = stations.filter((station) => {
            const distance = this.haversineDistance(
              options.lat!,
              options.lng!,
              station.location.lat,
              station.location.lng
            );
            return distance <= options.radiusMeters!;
          });
        }

        console.log(`[OfflineStorage] Retrieved ${stations.length} offline stations`);
        resolve(stations);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to get offline stations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update a single station
   */
  async updateStation(id: number, data: Partial<Station>): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction([STORES.STATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.STATIONS);
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          reject(new Error('Station not found'));
          return;
        }

        const updated = {
          ...getRequest.result,
          ...data,
          cachedAt: Date.now(),
        };

        const putRequest = store.put(updated);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get station count
   */
  async getStationCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STATIONS], 'readonly');
      const store = transaction.objectStore(STORES.STATIONS);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== POIS ====================

  /**
   * Cache an array of POIs (gas, convenience, repair, car_wash, motor_shop)
   */
  async cachePOIs(pois: POI[]): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.POIS], 'readwrite');
      const store = transaction.objectStore(STORES.POIS);

      pois.forEach((poi) => {
        const cachedPOI: CachedPOI = {
          ...poi,
          cachedAt: now,
          expiresAt: now + EXPIRATION.POIS,
        };
        store.put(cachedPOI);
      });

      transaction.oncomplete = () => {
        console.log(`[OfflineStorage] Cached ${pois.length} POIs`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[OfflineStorage] Failed to cache POIs:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get offline POIs, optionally filtered by type and/or bounds
   */
  async getOfflinePOIs(options?: {
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    bounds?: LatLngBounds;
    type?: string; // Filter by POI type (gas, convenience, repair, car_wash, motor_shop)
  }): Promise<CachedPOI[]> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.POIS], 'readonly');
      const store = transaction.objectStore(STORES.POIS);
      const request = store.getAll();

      request.onsuccess = () => {
        let pois = (request.result as CachedPOI[]).filter(
          (poi) => poi.expiresAt > now
        );

        // Filter by type if provided
        if (options?.type) {
          pois = pois.filter((poi) => poi.type === options.type);
        }

        // Filter by bounds if provided
        if (options?.bounds) {
          const { north, south, east, west } = options.bounds;
          pois = pois.filter((poi) => {
            const { lat, lng } = poi.location;
            return lat <= north && lat >= south && lng <= east && lng >= west;
          });
        }

        // Filter by radius if provided
        if (options?.lat !== undefined && options?.lng !== undefined && options?.radiusMeters) {
          pois = pois.filter((poi) => {
            const distance = this.haversineDistance(
              options.lat!,
              options.lng!,
              poi.location.lat,
              poi.location.lng
            );
            return distance <= options.radiusMeters!;
          });
        }

        console.log(`[OfflineStorage] Retrieved ${pois.length} offline POIs`);
        resolve(pois);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to get offline POIs:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update a single POI
   */
  async updatePOI(id: number, data: Partial<POI>): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction([STORES.POIS], 'readwrite');
      const store = transaction.objectStore(STORES.POIS);
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          reject(new Error('POI not found'));
          return;
        }

        const updated = {
          ...getRequest.result,
          ...data,
          cachedAt: Date.now(),
        };

        const putRequest = store.put(updated);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get POI count
   */
  async getPOICount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.POIS], 'readonly');
      const store = transaction.objectStore(STORES.POIS);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== ROUTES ====================

  /**
   * Cache a route
   */
  async cacheRoute(key: string, route: RouteData): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ROUTES], 'readwrite');
      const store = transaction.objectStore(STORES.ROUTES);

      const cachedRoute: CachedRoute = {
        key,
        data: route,
        cachedAt: now,
        expiresAt: now + EXPIRATION.ROUTES,
      };

      const request = store.put(cachedRoute);

      request.onsuccess = () => {
        console.log(`[OfflineStorage] Cached route: ${key}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to cache route:', request.error);
        reject(request.error);
      };
    });
  }
  /**
   * Get a cached route by coordinates
   */
  async getOfflineRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<RouteData | null> {
    const db = await this.ensureDB();
    const now = Date.now();
    
    // Create key with fixed precision
    const key = this.createRouteKey(startLat, startLng, endLat, endLng);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ROUTES], 'readonly');
      const store = transaction.objectStore(STORES.ROUTES);
      const request = store.get(key);

      request.onsuccess = () => {
        const cached = request.result as CachedRoute | undefined;
        
        if (cached && cached.expiresAt > now) {
          console.log(`[OfflineStorage] Cache hit for route: ${key}`);
          resolve(cached.data);
        } else {
          console.log(`[OfflineStorage] Cache miss for route: ${key}`);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to get offline route:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Find a cached route with fuzzy coordinate matching
   * Looks for routes where start and end points are within tolerance distance
   * @param tolerance - Distance tolerance in meters (default: 150m)
   */
  async findNearbyRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    tolerance: number = 150
  ): Promise<RouteData | null> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ROUTES], 'readonly');
      const store = transaction.objectStore(STORES.ROUTES);
      const request = store.getAll();

      request.onsuccess = () => {
        const routes = (request.result as CachedRoute[]).filter(r => r.expiresAt > now);
        
        // Find a route with nearby start and end points
        for (const cached of routes) {
          // Parse the key to extract coordinates
          const match = cached.key.match(/^([\d.-]+),([\d.-]+)-([\d.-]+),([\d.-]+)$/);
          if (!match) continue;
          
          const [, cachedStartLat, cachedStartLng, cachedEndLat, cachedEndLng] = match.map(Number);
          
          // Check if start and end are within tolerance
          const startDistance = this.haversineDistance(startLat, startLng, cachedStartLat, cachedStartLng);
          const endDistance = this.haversineDistance(endLat, endLng, cachedEndLat, cachedEndLng);
          
          if (startDistance <= tolerance && endDistance <= tolerance) {
            console.log(`[OfflineStorage] Nearby route found (start: ${Math.round(startDistance)}m, end: ${Math.round(endDistance)}m): ${cached.key}`);
            resolve(cached.data);
            return;
          }
        }
        
        console.log('[OfflineStorage] No nearby cached route found');
        resolve(null);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to find nearby route:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Create a normalized route key
   */
  createRouteKey(startLat: number, startLng: number, endLat: number, endLng: number): string {
    // Round to 4 decimal places for better cache hits
    const round = (n: number) => Math.round(n * 10000) / 10000;
    return `${round(startLat)},${round(startLng)}-${round(endLat)},${round(endLng)}`;
  }

  /**
   * Get route count
   */
  async getRouteCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ROUTES], 'readonly');
      const store = transaction.objectStore(STORES.ROUTES);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== MAP TILES ====================

  /**
   * Save map tile metadata
   */
  async saveMapTileMetadata(metadata: MapTileMetadata): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MAP_TILES], 'readwrite');
      const store = transaction.objectStore(STORES.MAP_TILES);
      const request = store.put(metadata);

      request.onsuccess = () => {
        console.log(`[OfflineStorage] Saved map tile metadata for: ${metadata.region}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to save map tile metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get map tile metadata
   */
  async getMapTileMetadata(region: string): Promise<MapTileMetadata | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MAP_TILES], 'readonly');
      const store = transaction.objectStore(STORES.MAP_TILES);
      const request = store.get(region);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all map tile metadata
   */
  async getAllMapTileMetadata(): Promise<MapTileMetadata[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MAP_TILES], 'readonly');
      const store = transaction.objectStore(STORES.MAP_TILES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete map tile metadata
   */
  async deleteMapTileMetadata(region: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MAP_TILES], 'readwrite');
      const store = transaction.objectStore(STORES.MAP_TILES);
      const request = store.delete(region);

      request.onsuccess = () => {
        console.log(`[OfflineStorage] Deleted map tile metadata for: ${region}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SYNC QUEUE ====================

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const db = await this.ensureDB();
    
    const syncOp: SyncOperation = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
      ...operation,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.add(syncOp);

      request.onsuccess = () => {
        console.log(`[OfflineStorage] Added to sync queue: ${syncOp.id}`);
        resolve(syncOp.id);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to add to sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all pending sync operations
   */
  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        const operations = request.result || [];
        operations.sort((a, b) => a.createdAt - b.createdAt);
        resolve(operations);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync operation retry count
   */
  async updateSyncOperationRetry(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result as SyncOperation;
        if (operation) {
          operation.retryCount++;
          operation.lastRetryAt = Date.now();
          store.put(operation);
          resolve();
        } else {
          reject(new Error('Sync operation not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove sync operation (after successful sync)
   */
  async removeSyncOperation(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[OfflineStorage] Removed from sync queue: ${id}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync queue count
   */
  async getSyncQueueCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== METADATA ====================

  /**
   * Save metadata value
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put({ key, value, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata value
   */
  async getMetadata<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value ?? null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ==================== STORAGE MANAGEMENT ====================

  /**
   * Get storage usage estimate
   */
  async getStorageUsage(): Promise<StorageEstimate> {
    const db = await this.ensureDB();

    const estimate: StorageEstimate = {
      stations: { count: 0, sizeBytes: 0 },
      pois: { count: 0, sizeBytes: 0 },
      routes: { count: 0, sizeBytes: 0 },
      mapTiles: { count: 0, sizeBytes: 0 },
      syncQueue: { count: 0 },
      total: { count: 0, sizeBytes: 0 },
    };

    // Get counts
    estimate.stations.count = await this.getStationCount();
    estimate.pois.count = await this.getPOICount();
    estimate.routes.count = await this.getRouteCount();
    estimate.syncQueue.count = await this.getSyncQueueCount();

    // Get map tiles metadata
    const mapTiles = await this.getAllMapTileMetadata();
    estimate.mapTiles.count = mapTiles.reduce((sum, mt) => sum + mt.tileCount, 0);
    estimate.mapTiles.sizeBytes = mapTiles.reduce((sum, mt) => sum + mt.sizeBytes, 0);

    // Estimate sizes (rough estimates)
    estimate.stations.sizeBytes = estimate.stations.count * 1024; // ~1KB per station
    estimate.pois.sizeBytes = estimate.pois.count * 512; // ~512B per POI
    estimate.routes.sizeBytes = estimate.routes.count * 5120; // ~5KB per route

    // Calculate totals
    estimate.total.count = 
      estimate.stations.count + 
      estimate.pois.count +
      estimate.routes.count + 
      estimate.mapTiles.count + 
      estimate.syncQueue.count;
    
    estimate.total.sizeBytes = 
      estimate.stations.sizeBytes + 
      estimate.pois.sizeBytes +
      estimate.routes.sizeBytes + 
      estimate.mapTiles.sizeBytes;

    return estimate;
  }

  /**
   * Clear expired data from all stores
   */
  async clearExpiredData(): Promise<{ stations: number; routes: number }> {
    const db = await this.ensureDB();
    const now = Date.now();
    const result = { stations: 0, routes: 0 };

    // Clear expired stations
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.STATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.STATIONS);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const station = cursor.value as CachedStation;
          if (station.expiresAt < now) {
            cursor.delete();
            result.stations++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Clear expired routes
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.ROUTES], 'readwrite');
      const store = transaction.objectStore(STORES.ROUTES);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const route = cursor.value as CachedRoute;
          if (route.expiresAt < now) {
            cursor.delete();
            result.routes++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log(`[OfflineStorage] Cleared ${result.stations} stations, ${result.routes} routes`);
    return result;
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();

    const stores = [STORES.STATIONS, STORES.ROUTES, STORES.MAP_TILES, STORES.SYNC_QUEUE, STORES.METADATA];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('[OfflineStorage] Cleared all offline data');
  }

  // ==================== DATA FRESHNESS ====================

  /**
   * Get data freshness level
   */
  getDataFreshness(cachedAt: number): DataFreshness {
    const age = Date.now() - cachedAt;
    
    if (age < 24 * 60 * 60 * 1000) {
      return DataFreshness.FRESH; // < 24 hours
    } else if (age < 7 * 24 * 60 * 60 * 1000) {
      return DataFreshness.STALE; // 1-7 days
    } else {
      return DataFreshness.VERY_OLD; // > 7 days
    }
  }

  /**
   * Get freshness emoji for UI
   */
  getFreshnessEmoji(freshness: DataFreshness): string {
    switch (freshness) {
      case DataFreshness.FRESH:
        return '🟢';
      case DataFreshness.STALE:
        return '🟡';
      case DataFreshness.VERY_OLD:
        return '🔴';
    }
  }

  /**
   * Format timestamp as relative time
   */
  formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  // ==================== UTILITIES ====================

  /**
   * Calculate Haversine distance between two points
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();
