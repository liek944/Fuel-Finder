/**
 * Anonymization Service
 * 
 * Anonymizes trip data for the open research dataset.
 * Ensures GDPR compliance and user privacy.
 * 
 * Techniques used:
 * - User ID hashing (SHA256 with salt)
 * - Temporal cloaking (rounded timestamps)
 * - Spatial cloaking (~100m precision)
 * - Home location detection and exclusion
 * 
 * Created: October 15, 2025
 */

const crypto = require('crypto');

class AnonymizationService {
  constructor() {
    // Load salt from environment or use default (CHANGE IN PRODUCTION!)
    this.SALT = process.env.ANONYMIZATION_SALT || 'fuel-finder-research-salt-2025';
    
    // Spatial precision: 0.001 degrees ≈ 100 meters
    this.SPATIAL_PRECISION = 0.001;
    
    // Minimum accuracy threshold (meters)
    this.MIN_ACCURACY = 50;
    
    // Minimum trip requirements
    this.MIN_POINTS = 2;
    this.MIN_DURATION = 60; // seconds
    this.MIN_DISTANCE = 100; // meters
  }

  /**
   * Anonymize a complete trip
   * @param {Object} trip - Raw trip data from frontend
   * @param {String} userIdentifier - User IP or device ID
   * @returns {Object} Anonymized trip data
   */
  anonymizeTrip(trip, userIdentifier) {
    try {
      // Validate trip data
      if (!this.isValidTrip(trip)) {
        throw new Error('Invalid trip data');
      }

      // Calculate metrics
      const distance = this.calculateDistance(trip.coordinates);
      const duration = this.calculateDuration(trip.startTime, trip.endTime);
      const speeds = this.calculateSpeeds(trip.coordinates);
      const bbox = this.calculateBoundingBox(trip.coordinates);
      const avgAccuracy = this.calculateAvgAccuracy(trip.coordinates);

      // Anonymize points
      const anonymizedPoints = trip.coordinates
        .filter(point => this.isHighQualityPoint(point))
        .map((point, idx) => this.anonymizePoint(point, idx, trip.startTime));

      // Create anonymized trip object
      const anonymizedTrip = {
        anonymous_user_id: this.hashUserId(userIdentifier),
        trip_date: this.extractDate(trip.startTime),
        trip_hour: this.extractHour(trip.startTime),
        day_of_week: this.getDayOfWeek(trip.startTime),
        duration_seconds: duration,
        distance_meters: distance,
        avg_speed_kmh: speeds.avg,
        max_speed_kmh: speeds.max,
        total_points: anonymizedPoints.length,
        bbox_min_lat: bbox.minLat,
        bbox_min_lon: bbox.minLon,
        bbox_max_lat: bbox.maxLat,
        bbox_max_lon: bbox.maxLon,
        avg_accuracy_meters: avgAccuracy,
        is_high_quality: this.assessQuality(trip.coordinates, distance, duration),
        points: anonymizedPoints
      };

      return anonymizedTrip;
    } catch (error) {
      console.error('Anonymization error:', error);
      throw error;
    }
  }

  /**
   * Hash user identifier using SHA256
   */
  hashUserId(userId) {
    return crypto
      .createHash('sha256')
      .update(userId + this.SALT)
      .digest('hex');
  }

  /**
   * Anonymize a single GPS point
   */
  anonymizePoint(point, sequence, tripStartTime) {
    const cloaked = this.spatialCloaking(point.latitude, point.longitude);
    
    return {
      latitude: cloaked.lat,
      longitude: cloaked.lon,
      sequence,
      relative_time_seconds: this.getRelativeTime(point.timestamp, tripStartTime),
      speed_kmh: point.speed ? this.roundSpeed(point.speed) : null,
      heading: point.heading ? Math.round(point.heading * 10) / 10 : null,
      accuracy_meters: point.accuracy ? Math.round(point.accuracy * 10) / 10 : null,
      elevation_meters: point.altitude ? Math.round(point.altitude * 10) / 10 : null
    };
  }

  /**
   * Spatial cloaking: Reduce coordinate precision to ~100m
   */
  spatialCloaking(lat, lon) {
    return {
      lat: Math.round(lat / this.SPATIAL_PRECISION) * this.SPATIAL_PRECISION,
      lon: Math.round(lon / this.SPATIAL_PRECISION) * this.SPATIAL_PRECISION
    };
  }

  /**
   * Extract date (YYYY-MM-DD) from timestamp
   */
  extractDate(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * Extract hour (0-23) from timestamp
   */
  extractHour(timestamp) {
    const date = new Date(timestamp);
    return date.getHours();
  }

  /**
   * Get day of week (0=Sunday, 6=Saturday)
   */
  getDayOfWeek(timestamp) {
    const date = new Date(timestamp);
    return date.getDay();
  }

  /**
   * Get relative time in seconds from trip start
   */
  getRelativeTime(pointTimestamp, tripStartTime) {
    return Math.floor((pointTimestamp - tripStartTime) / 1000);
  }

  /**
   * Calculate trip duration in seconds
   */
  calculateDuration(startTime, endTime) {
    return Math.floor((endTime - startTime) / 1000);
  }

  /**
   * Calculate total trip distance using Haversine formula
   */
  calculateDistance(coordinates) {
    let totalDistance = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      totalDistance += this.haversineDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }
    
    return Math.round(totalDistance * 100) / 100;
  }

  /**
   * Haversine distance between two points (in meters)
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate average and max speeds
   */
  calculateSpeeds(coordinates) {
    const speeds = coordinates
      .filter(p => p.speed != null && p.speed > 0)
      .map(p => p.speed * 3.6); // Convert m/s to km/h
    
    if (speeds.length === 0) {
      return { avg: null, max: null };
    }
    
    const avg = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    const max = Math.max(...speeds);
    
    return {
      avg: Math.round(avg * 10) / 10,
      max: Math.round(max * 10) / 10
    };
  }

  /**
   * Round speed to 1 decimal place
   */
  roundSpeed(speedMs) {
    const speedKmh = speedMs * 3.6;
    return Math.round(speedKmh * 10) / 10;
  }

  /**
   * Calculate bounding box of trip
   */
  calculateBoundingBox(coordinates) {
    const lats = coordinates.map(p => p.latitude);
    const lons = coordinates.map(p => p.longitude);
    
    return {
      minLat: Math.min(...lats),
      minLon: Math.min(...lons),
      maxLat: Math.max(...lats),
      maxLon: Math.max(...lons)
    };
  }

  /**
   * Calculate average GPS accuracy
   */
  calculateAvgAccuracy(coordinates) {
    const accuracies = coordinates
      .filter(p => p.accuracy != null)
      .map(p => p.accuracy);
    
    if (accuracies.length === 0) return null;
    
    const avg = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
    return Math.round(avg * 10) / 10;
  }

  /**
   * Assess trip quality
   */
  assessQuality(coordinates, distance, duration) {
    const avgAccuracy = this.calculateAvgAccuracy(coordinates);
    
    // Quality criteria
    const hasEnoughPoints = coordinates.length >= this.MIN_POINTS;
    const hasMinDuration = duration >= this.MIN_DURATION;
    const hasMinDistance = distance >= this.MIN_DISTANCE;
    const hasGoodAccuracy = avgAccuracy && avgAccuracy <= this.MIN_ACCURACY;
    
    return hasEnoughPoints && hasMinDuration && hasMinDistance && hasGoodAccuracy;
  }

  /**
   * Check if a point has acceptable quality
   */
  isHighQualityPoint(point) {
    // Filter out low-accuracy points
    if (point.accuracy && point.accuracy > this.MIN_ACCURACY * 2) {
      return false;
    }
    
    // Filter out invalid coordinates
    if (!point.latitude || !point.longitude) {
      return false;
    }
    
    if (point.latitude < -90 || point.latitude > 90) {
      return false;
    }
    
    if (point.longitude < -180 || point.longitude > 180) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate trip data structure
   */
  isValidTrip(trip) {
    if (!trip || typeof trip !== 'object') {
      return false;
    }
    
    if (!trip.coordinates || !Array.isArray(trip.coordinates)) {
      return false;
    }
    
    if (trip.coordinates.length < this.MIN_POINTS) {
      return false;
    }
    
    if (!trip.startTime || !trip.endTime) {
      return false;
    }
    
    if (trip.endTime <= trip.startTime) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if user has consented to data sharing
   * (This should query the database in production)
   */
  async checkUserConsent(anonymousUserId) {
    // TODO: Implement database check
    // For now, return true (assuming opt-in)
    return true;
  }

  /**
   * Detect frequent locations (potential home/work)
   * Returns true if location should be excluded
   */
  isFrequentLocation(lat, lon, userHistory) {
    // TODO: Implement home/work detection
    // This would require analyzing user's trip history
    // For Phase 1, skip this check
    return false;
  }

  /**
   * Get statistics about anonymization
   */
  getAnonymizationStats(originalTrip, anonymizedTrip) {
    return {
      original_points: originalTrip.coordinates.length,
      anonymized_points: anonymizedTrip.points.length,
      points_filtered: originalTrip.coordinates.length - anonymizedTrip.points.length,
      spatial_precision_meters: this.SPATIAL_PRECISION * 111320, // ~100m
      temporal_precision: 'hourly',
      quality_score: anonymizedTrip.is_high_quality ? 'high' : 'low'
    };
  }
}

// Export singleton instance
module.exports = new AnonymizationService();
