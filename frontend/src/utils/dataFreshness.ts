/**
 * Data Freshness Utility
 * Determines if cached data is still valid and provides UI indicators
 */

/**
 * Data freshness levels for UI indicators
 */
export enum DataFreshness {
  FRESH = 'fresh', // < 24 hours
  STALE = 'stale', // 1-7 days
  VERY_OLD = 'very_old', // > 7 days
}

/**
 * Expiration times in milliseconds
 */
export const EXPIRATION_TIMES = {
  STATIONS: 7 * 24 * 60 * 60 * 1000, // 7 days
  ROUTES: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAP_TILES: 90 * 24 * 60 * 60 * 1000, // 90 days
  PRICE_DATA: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Time thresholds in milliseconds
 */
const TIME_THRESHOLDS = {
  FRESH: 24 * 60 * 60 * 1000, // 24 hours
  STALE: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * Get data freshness level based on cache time
 * @param cachedAt - Timestamp when data was cached
 * @returns DataFreshness level
 */
export function getDataFreshness(cachedAt: number): DataFreshness {
  const age = Date.now() - cachedAt;

  if (age < TIME_THRESHOLDS.FRESH) {
    return DataFreshness.FRESH;
  } else if (age < TIME_THRESHOLDS.STALE) {
    return DataFreshness.STALE;
  } else {
    return DataFreshness.VERY_OLD;
  }
}

/**
 * Get freshness emoji for UI display
 * @param freshness - DataFreshness level
 * @returns Emoji string
 */
export function getFreshnessEmoji(freshness: DataFreshness): string {
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
 * Get freshness label for UI display
 * @param freshness - DataFreshness level
 * @returns Human-readable label
 */
export function getFreshnessLabel(freshness: DataFreshness): string {
  switch (freshness) {
    case DataFreshness.FRESH:
      return 'Fresh';
    case DataFreshness.STALE:
      return 'Stale';
    case DataFreshness.VERY_OLD:
      return 'Very Old';
  }
}

/**
 * Get freshness color for CSS styling
 * @param freshness - DataFreshness level
 * @returns CSS color string
 */
export function getFreshnessColor(freshness: DataFreshness): string {
  switch (freshness) {
    case DataFreshness.FRESH:
      return '#22c55e'; // green
    case DataFreshness.STALE:
      return '#eab308'; // yellow
    case DataFreshness.VERY_OLD:
      return '#ef4444'; // red
  }
}

/**
 * Check if data should show a warning (for price data)
 * @param priceUpdatedAt - Timestamp when price was updated
 * @returns Whether to show stale price warning
 */
export function isPriceDataStale(priceUpdatedAt: number | string | undefined): boolean {
  if (!priceUpdatedAt) return true;
  
  const timestamp = typeof priceUpdatedAt === 'string' 
    ? new Date(priceUpdatedAt).getTime() 
    : priceUpdatedAt;
  
  const age = Date.now() - timestamp;
  return age > EXPIRATION_TIMES.PRICE_DATA;
}

/**
 * Format timestamp as relative time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

/**
 * Get a detailed freshness description for UI
 * @param cachedAt - Timestamp when data was cached
 * @returns Formatted description with emoji
 */
export function getFreshnessDescription(cachedAt: number): string {
  const freshness = getDataFreshness(cachedAt);
  const relativeTime = formatRelativeTime(cachedAt);
  const emoji = getFreshnessEmoji(freshness);
  
  return `${emoji} Cached ${relativeTime}`;
}

/**
 * Check if data has expired
 * @param expiresAt - Timestamp when data expires
 * @returns Whether data is expired
 */
export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Calculate expiration timestamp
 * @param cachedAt - Timestamp when data was cached
 * @param expirationMs - Expiration duration in milliseconds
 * @returns Expiration timestamp
 */
export function calculateExpiration(cachedAt: number, expirationMs: number): number {
  return cachedAt + expirationMs;
}
