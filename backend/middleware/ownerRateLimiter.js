/**
 * Owner-Specific Rate Limiting Middleware
 * Each owner gets their own rate limit bucket to prevent one owner
 * from affecting others in a multi-tenant environment
 */

const config = require("../config/environment");

// Per-owner rate limit buckets: Map<ownerId, Map<ip, bucket>>
const ownerRateLimitBuckets = new Map();

// Owner-specific rate limit: 100 requests per minute per owner
const OWNER_RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  max: 100 // 100 requests per minute per owner
};

function ownerRateLimit(req, res, next) {
  try {
    // This middleware requires owner detection to run first
    if (!req.ownerData) {
      // No owner detected - skip rate limiting or use general limiter
      return next();
    }

    const ownerId = req.ownerData.id;
    const key =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const now = Date.now();

    // Get or create rate limit bucket for this owner
    if (!ownerRateLimitBuckets.has(ownerId)) {
      ownerRateLimitBuckets.set(ownerId, new Map());
    }

    const ownerBuckets = ownerRateLimitBuckets.get(ownerId);
    let bucket = ownerBuckets.get(key);

    if (!bucket || now > bucket.reset) {
      bucket = { count: 1, reset: now + OWNER_RATE_LIMIT.windowMs };
    } else {
      bucket.count += 1;
    }
    ownerBuckets.set(key, bucket);

    const remaining = Math.max(0, OWNER_RATE_LIMIT.max - bucket.count);
    const retryAfterSec = Math.ceil(Math.max(0, bucket.reset - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(OWNER_RATE_LIMIT.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(bucket.reset / 1000)));
    res.setHeader("X-Owner-ID", ownerId); // Debug: shows which owner

    if (bucket.count > OWNER_RATE_LIMIT.max) {
      res.setHeader("Retry-After", String(retryAfterSec));
      
      console.warn(
        `⚠️  Rate limit exceeded for owner: ${req.ownerData.name} (${ownerId}) from IP: ${key}`
      );

      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Too many requests from your account. Try again in ${retryAfterSec}s`,
        owner: req.ownerData.name,
      });
    }

    next();
  } catch (e) {
    console.error("❌ Error in owner rate limiter:", e);
    next();
  }
}

/**
 * Cleanup old buckets periodically (every 5 minutes)
 * Prevents memory leaks from inactive owners
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [ownerId, ownerBuckets] of ownerRateLimitBuckets.entries()) {
    for (const [ip, bucket] of ownerBuckets.entries()) {
      if (now > bucket.reset + 60000) { // 1 minute after expiry
        ownerBuckets.delete(ip);
        cleaned++;
      }
    }
    
    // Remove owner entry if no buckets left
    if (ownerBuckets.size === 0) {
      ownerRateLimitBuckets.delete(ownerId);
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired rate limit buckets`);
  }
}, 300000); // 5 minutes

module.exports = ownerRateLimit;
