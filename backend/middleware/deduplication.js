/**
 * Request Deduplication Middleware
 * Prevents duplicate uploads from load balancers/reverse proxies
 */

const crypto = require("crypto");
const config = require("../config/environment");

const pendingRequests = new Map(); // requestHash -> { timestamp, promise }

function createRequestHash(req) {
  // Create a hash based on: method + path + body content + IP
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    "unknown";
  const bodyStr = JSON.stringify(req.body || {});
  const hashInput = `${req.method}:${req.path}:${bodyStr}:${ip}`;
  return crypto.createHash("md5").update(hashInput).digest("hex");
}

function requestDeduplication(req, res, next) {
  // Only apply to POST/PUT/PATCH requests with body content
  if (!["POST", "PUT", "PATCH"].includes(req.method) || !req.body) {
    return next();
  }

  const requestHash = createRequestHash(req);
  const now = Date.now();

  // Clean up old entries
  for (const [hash, entry] of pendingRequests.entries()) {
    if (now - entry.timestamp > config.deduplication.windowMs) {
      pendingRequests.delete(hash);
    }
  }

  // Check if this is a duplicate request
  const existing = pendingRequests.get(requestHash);
  if (existing) {
    const timeSinceOriginal = now - existing.timestamp;
    console.log(`⚠️  DUPLICATE REQUEST BLOCKED: ${req.method} ${req.path}`);
    console.log(`   Hash: ${requestHash.substring(0, 12)}...`);
    console.log(`   Time since original: ${timeSinceOriginal}ms`);
    console.log(`   IP: ${req.ip || "unknown"}`);
    // Return 202 Accepted to indicate the request is being processed
    return res.status(202).json({
      message: "Request already being processed",
      note: "This is a duplicate request that was automatically deduplicated",
      timeSinceOriginal: `${timeSinceOriginal}ms`,
    });
  }

  // Mark this request as pending
  pendingRequests.set(requestHash, { timestamp: now });

  // Clean up after response is sent
  const cleanup = () => {
    pendingRequests.delete(requestHash);
  };

  res.on("finish", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);

  next();
}

module.exports = requestDeduplication;
