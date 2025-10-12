/**
 * Trip Session Manager - Phase 2
 * 
 * Provides a robust, high-level API for managing trip sessions.
 * Handles CRUD operations, filtering, sorting, and batch operations
 * with reliable IndexedDB persistence.
 * 
 * @module tripSessionManager
 */

import { tripDB, Trip, GPSPoint } from './indexedDB';

/**
 * Trip metadata with computed fields
 */
export interface TripMetadata {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  duration: number | null; // milliseconds
  pointCount: number;
  isActive: boolean;
  distance?: number; // kilometers (computed)
  averageSpeed?: number; // km/h (computed)
}

/**
 * Filter options for querying trips
 */
export interface TripFilter {
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number; // milliseconds
  maxDuration?: number; // milliseconds
  minPoints?: number;
  searchTerm?: string; // Search in trip name
}

/**
 * Sort options for trip lists
 */
export type TripSortField = 'startTime' | 'endTime' | 'duration' | 'pointCount' | 'name';
export type TripSortOrder = 'asc' | 'desc';

export interface TripSortOptions {
  field: TripSortField;
  order: TripSortOrder;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Trip Session Manager Class
 * Singleton service for managing trip sessions
 */
class TripSessionManager {
  private static instance: TripSessionManager;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TripSessionManager {
    if (!TripSessionManager.instance) {
      TripSessionManager.instance = new TripSessionManager();
    }
    return TripSessionManager.instance;
  }

  // ==================== CREATE OPERATIONS ====================

  /**
   * Create a new trip session
   * @param name Optional trip name
   * @returns Created trip
   */
  async createTrip(name?: string): Promise<Trip> {
    try {
      const trip = await tripDB.createTrip(name);
      console.log('[TripSessionManager] Trip created:', trip.id);
      return trip;
    } catch (error) {
      console.error('[TripSessionManager] Failed to create trip:', error);
      throw new Error(`Failed to create trip: ${error}`);
    }
  }

  /**
   * Create multiple trips at once
   * @param names Array of trip names
   * @returns Array of created trips
   */
  async createMultipleTrips(names: string[]): Promise<Trip[]> {
    const trips: Trip[] = [];
    const errors: string[] = [];

    for (const name of names) {
      try {
        const trip = await this.createTrip(name);
        trips.push(trip);
      } catch (error) {
        errors.push(`Failed to create trip "${name}": ${error}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[TripSessionManager] Some trips failed to create:', errors);
    }

    return trips;
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Get a trip by ID
   * @param id Trip ID
   * @returns Trip or null if not found
   */
  async getTrip(id: string): Promise<Trip | null> {
    try {
      return await tripDB.getTrip(id);
    } catch (error) {
      console.error('[TripSessionManager] Failed to get trip:', error);
      throw new Error(`Failed to get trip: ${error}`);
    }
  }

  /**
   * Get all trips
   * @returns Array of all trips
   */
  async getAllTrips(): Promise<Trip[]> {
    try {
      return await tripDB.getAllTrips();
    } catch (error) {
      console.error('[TripSessionManager] Failed to get all trips:', error);
      throw new Error(`Failed to get all trips: ${error}`);
    }
  }

  /**
   * Get currently active trip
   * @returns Active trip or null
   */
  async getActiveTrip(): Promise<Trip | null> {
    try {
      return await tripDB.getActiveTrip();
    } catch (error) {
      console.error('[TripSessionManager] Failed to get active trip:', error);
      throw new Error(`Failed to get active trip: ${error}`);
    }
  }

  /**
   * Get trips with filtering
   * @param filter Filter options
   * @returns Filtered trips
   */
  async getFilteredTrips(filter: TripFilter): Promise<Trip[]> {
    try {
      let trips = await this.getAllTrips();

      // Apply filters
      if (filter.isActive !== undefined) {
        trips = trips.filter(trip => trip.isActive === filter.isActive);
      }

      if (filter.startDate) {
        trips = trips.filter(trip => trip.startTime >= filter.startDate!.getTime());
      }

      if (filter.endDate) {
        trips = trips.filter(trip => {
          if (!trip.endTime) return false;
          return trip.endTime <= filter.endDate!.getTime();
        });
      }

      if (filter.minDuration !== undefined) {
        trips = trips.filter(trip => {
          if (!trip.endTime) return false;
          const duration = trip.endTime - trip.startTime;
          return duration >= filter.minDuration!;
        });
      }

      if (filter.maxDuration !== undefined) {
        trips = trips.filter(trip => {
          if (!trip.endTime) return false;
          const duration = trip.endTime - trip.startTime;
          return duration <= filter.maxDuration!;
        });
      }

      if (filter.minPoints !== undefined) {
        trips = trips.filter(trip => trip.coordinates.length >= filter.minPoints!);
      }

      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        trips = trips.filter(trip => 
          trip.name.toLowerCase().includes(searchLower)
        );
      }

      return trips;
    } catch (error) {
      console.error('[TripSessionManager] Failed to filter trips:', error);
      throw new Error(`Failed to filter trips: ${error}`);
    }
  }

  /**
   * Get sorted trips
   * @param sortOptions Sort configuration
   * @returns Sorted trips
   */
  async getSortedTrips(sortOptions: TripSortOptions): Promise<Trip[]> {
    try {
      const trips = await this.getAllTrips();
      return this.sortTrips(trips, sortOptions);
    } catch (error) {
      console.error('[TripSessionManager] Failed to sort trips:', error);
      throw new Error(`Failed to sort trips: ${error}`);
    }
  }

  /**
   * Get trips with filtering and sorting
   * @param filter Filter options
   * @param sortOptions Sort configuration
   * @returns Filtered and sorted trips
   */
  async getTripsWithOptions(
    filter?: TripFilter,
    sortOptions?: TripSortOptions
  ): Promise<Trip[]> {
    try {
      let trips = filter 
        ? await this.getFilteredTrips(filter)
        : await this.getAllTrips();

      if (sortOptions) {
        trips = this.sortTrips(trips, sortOptions);
      }

      return trips;
    } catch (error) {
      console.error('[TripSessionManager] Failed to get trips with options:', error);
      throw new Error(`Failed to get trips with options: ${error}`);
    }
  }

  /**
   * Get trip metadata (lightweight, without full coordinates)
   * @param id Trip ID
   * @returns Trip metadata or null
   */
  async getTripMetadata(id: string): Promise<TripMetadata | null> {
    try {
      const trip = await this.getTrip(id);
      if (!trip) return null;
      return this.extractMetadata(trip);
    } catch (error) {
      console.error('[TripSessionManager] Failed to get trip metadata:', error);
      throw new Error(`Failed to get trip metadata: ${error}`);
    }
  }

  /**
   * Get metadata for all trips
   * @returns Array of trip metadata
   */
  async getAllTripMetadata(): Promise<TripMetadata[]> {
    try {
      const trips = await this.getAllTrips();
      return trips.map(trip => this.extractMetadata(trip));
    } catch (error) {
      console.error('[TripSessionManager] Failed to get all trip metadata:', error);
      throw new Error(`Failed to get all trip metadata: ${error}`);
    }
  }

  // ==================== UPDATE OPERATIONS ====================

  /**
   * Rename a trip
   * @param id Trip ID
   * @param newName New trip name
   */
  async renameTrip(id: string, newName: string): Promise<void> {
    try {
      if (!newName || newName.trim().length === 0) {
        throw new Error('Trip name cannot be empty');
      }
      await tripDB.updateTripName(id, newName.trim());
      console.log('[TripSessionManager] Trip renamed:', id);
    } catch (error) {
      console.error('[TripSessionManager] Failed to rename trip:', error);
      throw new Error(`Failed to rename trip: ${error}`);
    }
  }

  /**
   * Add GPS point to a trip
   * @param tripId Trip ID
   * @param point GPS point
   */
  async addGPSPoint(tripId: string, point: GPSPoint): Promise<void> {
    try {
      await tripDB.addGPSPoint(tripId, point);
    } catch (error) {
      console.error('[TripSessionManager] Failed to add GPS point:', error);
      throw new Error(`Failed to add GPS point: ${error}`);
    }
  }

  /**
   * End a trip session
   * @param id Trip ID
   */
  async endTrip(id: string): Promise<void> {
    try {
      await tripDB.endTrip(id);
      console.log('[TripSessionManager] Trip ended:', id);
    } catch (error) {
      console.error('[TripSessionManager] Failed to end trip:', error);
      throw new Error(`Failed to end trip: ${error}`);
    }
  }

  /**
   * Batch rename trips
   * @param updates Array of {id, name} pairs
   * @returns Operation result
   */
  async batchRenameTrips(
    updates: Array<{ id: string; name: string }>
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const update of updates) {
      try {
        await this.renameTrip(update.id, update.name);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: update.id,
          error: String(error)
        });
      }
    }

    console.log('[TripSessionManager] Batch rename completed:', result);
    return result;
  }

  // ==================== DELETE OPERATIONS ====================

  /**
   * Delete a trip
   * @param id Trip ID
   */
  async deleteTrip(id: string): Promise<void> {
    try {
      await tripDB.deleteTrip(id);
      console.log('[TripSessionManager] Trip deleted:', id);
    } catch (error) {
      console.error('[TripSessionManager] Failed to delete trip:', error);
      throw new Error(`Failed to delete trip: ${error}`);
    }
  }

  /**
   * Delete multiple trips
   * @param ids Array of trip IDs
   * @returns Operation result
   */
  async deleteMultipleTrips(ids: string[]): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const id of ids) {
      try {
        await this.deleteTrip(id);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id,
          error: String(error)
        });
      }
    }

    console.log('[TripSessionManager] Batch delete completed:', result);
    return result;
  }

  /**
   * Delete all completed trips
   * @returns Operation result
   */
  async deleteCompletedTrips(): Promise<BatchOperationResult> {
    try {
      const completedTrips = await this.getFilteredTrips({ isActive: false });
      const ids = completedTrips.map(trip => trip.id);
      return await this.deleteMultipleTrips(ids);
    } catch (error) {
      console.error('[TripSessionManager] Failed to delete completed trips:', error);
      throw new Error(`Failed to delete completed trips: ${error}`);
    }
  }

  /**
   * Delete old trips (older than specified date)
   * @param olderThan Date threshold
   * @returns Operation result
   */
  async deleteOldTrips(olderThan: Date): Promise<BatchOperationResult> {
    try {
      const trips = await this.getAllTrips();
      const oldTrips = trips.filter(trip => trip.startTime < olderThan.getTime());
      const ids = oldTrips.map(trip => trip.id);
      return await this.deleteMultipleTrips(ids);
    } catch (error) {
      console.error('[TripSessionManager] Failed to delete old trips:', error);
      throw new Error(`Failed to delete old trips: ${error}`);
    }
  }

  /**
   * Clear all trips (use with caution!)
   */
  async clearAllTrips(): Promise<void> {
    try {
      await tripDB.clearAllTrips();
      console.log('[TripSessionManager] All trips cleared');
    } catch (error) {
      console.error('[TripSessionManager] Failed to clear all trips:', error);
      throw new Error(`Failed to clear all trips: ${error}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Sort trips array
   * @param trips Trips to sort
   * @param options Sort options
   * @returns Sorted trips
   */
  private sortTrips(trips: Trip[], options: TripSortOptions): Trip[] {
    const { field, order } = options;
    const multiplier = order === 'asc' ? 1 : -1;

    return [...trips].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'startTime':
          aValue = a.startTime;
          bValue = b.startTime;
          break;
        case 'endTime':
          aValue = a.endTime || 0;
          bValue = b.endTime || 0;
          break;
        case 'duration':
          aValue = a.endTime ? a.endTime - a.startTime : 0;
          bValue = b.endTime ? b.endTime - b.startTime : 0;
          break;
        case 'pointCount':
          aValue = a.coordinates.length;
          bValue = b.coordinates.length;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          return aValue.localeCompare(bValue) * multiplier;
        default:
          return 0;
      }

      return (aValue - bValue) * multiplier;
    });
  }

  /**
   * Extract metadata from trip (without full coordinates)
   * @param trip Full trip object
   * @returns Trip metadata
   */
  private extractMetadata(trip: Trip): TripMetadata {
    const duration = trip.endTime ? trip.endTime - trip.startTime : null;
    const pointCount = trip.coordinates.length;

    return {
      id: trip.id,
      name: trip.name,
      startTime: trip.startTime,
      endTime: trip.endTime,
      duration,
      pointCount,
      isActive: trip.isActive,
      distance: this.calculateDistance(trip.coordinates),
      averageSpeed: this.calculateAverageSpeed(trip.coordinates, duration)
    };
  }

  /**
   * Calculate total distance using Haversine formula
   * @param coordinates GPS points
   * @returns Distance in kilometers
   */
  private calculateDistance(coordinates: GPSPoint[]): number | undefined {
    if (coordinates.length < 2) return undefined;

    let totalDistance = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      totalDistance += this.haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    return totalDistance;
  }

  /**
   * Calculate average speed
   * @param coordinates GPS points
   * @param duration Trip duration in milliseconds
   * @returns Average speed in km/h
   */
  private calculateAverageSpeed(
    coordinates: GPSPoint[],
    duration: number | null
  ): number | undefined {
    if (!duration || duration === 0) return undefined;

    const distance = this.calculateDistance(coordinates);
    if (!distance) return undefined;

    const hours = duration / (1000 * 60 * 60);
    return distance / hours;
  }

  /**
   * Haversine distance formula
   * @param lat1 Latitude 1
   * @param lon1 Longitude 1
   * @param lat2 Latitude 2
   * @param lon2 Longitude 2
   * @returns Distance in kilometers
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param degrees Degrees
   * @returns Radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get storage statistics
   * @returns Storage info
   */
  async getStorageStats(): Promise<{
    totalTrips: number;
    activeTrips: number;
    completedTrips: number;
    totalPoints: number;
    estimatedSizeKB: number;
  }> {
    try {
      const trips = await this.getAllTrips();
      const activeTrips = trips.filter(t => t.isActive).length;
      const completedTrips = trips.filter(t => !t.isActive).length;
      const totalPoints = trips.reduce((sum, t) => sum + t.coordinates.length, 0);
      
      // Rough estimate: ~200 bytes per point
      const estimatedSizeKB = (totalPoints * 200) / 1024;

      return {
        totalTrips: trips.length,
        activeTrips,
        completedTrips,
        totalPoints,
        estimatedSizeKB: Math.round(estimatedSizeKB)
      };
    } catch (error) {
      console.error('[TripSessionManager] Failed to get storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error}`);
    }
  }

  /**
   * Check if a trip exists
   * @param id Trip ID
   * @returns True if exists
   */
  async tripExists(id: string): Promise<boolean> {
    try {
      const trip = await this.getTrip(id);
      return trip !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate trip data integrity
   * @param id Trip ID
   * @returns Validation result
   */
  async validateTrip(id: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const trip = await this.getTrip(id);
      
      if (!trip) {
        return { valid: false, errors: ['Trip not found'] };
      }

      if (!trip.name || trip.name.trim().length === 0) {
        errors.push('Trip name is empty');
      }

      if (!trip.startTime || trip.startTime <= 0) {
        errors.push('Invalid start time');
      }

      if (trip.endTime && trip.endTime < trip.startTime) {
        errors.push('End time is before start time');
      }

      if (!Array.isArray(trip.coordinates)) {
        errors.push('Coordinates is not an array');
      }

      if (trip.coordinates.length === 0 && !trip.isActive) {
        errors.push('Completed trip has no coordinates');
      }

      // Validate GPS points
      for (let i = 0; i < trip.coordinates.length; i++) {
        const point = trip.coordinates[i];
        if (typeof point.latitude !== 'number' || 
            typeof point.longitude !== 'number') {
          errors.push(`Invalid coordinates at point ${i}`);
        }
        if (Math.abs(point.latitude) > 90) {
          errors.push(`Invalid latitude at point ${i}`);
        }
        if (Math.abs(point.longitude) > 180) {
          errors.push(`Invalid longitude at point ${i}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error}`]
      };
    }
  }
}

// Export singleton instance
export const tripSessionManager = TripSessionManager.getInstance();

// Export class for testing purposes
export { TripSessionManager };
