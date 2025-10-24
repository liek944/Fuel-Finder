/**
 * Admin Rate Limiting Middleware
 * More lenient rate limiting for authenticated admin endpoints
 * to support dashboard auto-refresh functionality
 */

const config = require("../config/environment");

// Separate in-memory rate limiter for admin endpoints
const adminRlBuckets = new Map(); // ip -> { count, reset }

// Admin-specific rate limit: 60 requests per minute (higher than general limit)
const ADMIN_RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  max: 60 // 60 requests per minute
};

function adminRateLimit(req, res, next) {
  try {
    const key =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const now = Date.now();
    let bucket = adminRlBuckets.get(key);
    
    if (!bucket || now > bucket.reset) {
      bucket = { count: 1, reset: now + ADMIN_RATE_LIMIT.windowMs };
    } else {
      bucket.count += 1;
    }
    adminRlBuckets.set(key, bucket);

    const remaining = Math.max(0, ADMIN_RATE_LIMIT.max - bucket.count);
    const retryAfterSec = Math.ceil(Math.max(0, bucket.reset - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(ADMIN_RATE_LIMIT.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(bucket.reset / 1000)));

    if (bucket.count > ADMIN_RATE_LIMIT.max) {
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Too many requests. Try again in ${retryAfterSec}s`,
      });
    }
    next();
  } catch (e) {
    next();
  }
}

module.exports = adminRateLimit;
