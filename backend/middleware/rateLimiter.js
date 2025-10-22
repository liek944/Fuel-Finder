/**
 * Rate Limiting Middleware
 * Implements per-IP rate limiting with fixed window algorithm
 */

const config = require("../config/environment");

// Simple in-memory rate limiter (per-IP, fixed window)
const rlBuckets = new Map(); // ip -> { count, reset }

function rateLimit(req, res, next) {
  try {
    const key =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const now = Date.now();
    let bucket = rlBuckets.get(key);
    
    if (!bucket || now > bucket.reset) {
      bucket = { count: 1, reset: now + config.rateLimit.windowMs };
    } else {
      bucket.count += 1;
    }
    rlBuckets.set(key, bucket);

    const remaining = Math.max(0, config.rateLimit.max - bucket.count);
    const retryAfterSec = Math.ceil(Math.max(0, bucket.reset - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(config.rateLimit.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(bucket.reset / 1000)));

    if (bucket.count > config.rateLimit.max) {
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

module.exports = rateLimit;
