/**
 * IndexedDB Utility for Trip Recording
 * Provides persistent storage for GPS coordinates and trip sessions
 */

const DB_NAME = 'FuelFinderTrips';
const DB_VERSION = 1;
const STORE_NAME = 'trips';

export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface Trip {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  coordinates: GPSPoint[];
  isActive: boolean;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('startTime', 'startTime', { unique: false });
          objectStore.createIndex('isActive', 'isActive', { unique: false });
          console.log('Object store created');
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

  /**
   * Create a new trip
   */
  async createTrip(name?: string): Promise<Trip> {
    const db = await this.ensureDB();
    const trip: Trip = {
      id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Trip ${new Date().toLocaleString()}`,
      startTime: Date.now(),
      endTime: null,
      coordinates: [],
      isActive: true,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(trip);

      request.onsuccess = () => {
        console.log('Trip created:', trip.id);
        resolve(trip);
      };

      request.onerror = () => {
        console.error('Failed to create trip:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a trip by ID
   */
  async getTrip(id: string): Promise<Trip | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get trip:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all trips
   */
  async getAllTrips(): Promise<Trip[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const trips = request.result || [];
        // Sort by start time, newest first
        trips.sort((a, b) => b.startTime - a.startTime);
        resolve(trips);
      };

      request.onerror = () => {
        console.error('Failed to get all trips:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get active trip (if any)
   */
  async getActiveTrip(): Promise<Trip | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('isActive');
      const request = index.get(1 as IDBValidKey); // Use 1 for true

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get active trip:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update trip with new GPS point
   */
  async addGPSPoint(tripId: string, point: GPSPoint): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      const trip = await this.getTrip(tripId);
      if (!trip) {
        reject(new Error('Trip not found'));
        return;
      }

      trip.coordinates.push(point);

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(trip);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add GPS point:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * End a trip
   */
  async endTrip(tripId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      const trip = await this.getTrip(tripId);
      if (!trip) {
        reject(new Error('Trip not found'));
        return;
      }

      trip.endTime = Date.now();
      trip.isActive = false;

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(trip);

      request.onsuccess = () => {
        console.log('Trip ended:', tripId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to end trip:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a trip
   */
  async deleteTrip(tripId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(tripId);

      request.onsuccess = () => {
        console.log('Trip deleted:', tripId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete trip:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update trip name
   */
  async updateTripName(tripId: string, name: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise(async (resolve, reject) => {
      const trip = await this.getTrip(tripId);
      if (!trip) {
        reject(new Error('Trip not found'));
        return;
      }

      trip.name = name;

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(trip);

      request.onsuccess = () => {
        console.log('Trip name updated:', tripId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to update trip name:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all trips
   */
  async clearAllTrips(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All trips cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear trips:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const tripDB = new IndexedDBManager();
