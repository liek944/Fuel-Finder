/**
 * Review Repository
 * Handles all database operations for reviews
 */

const { pool } = require('../config/database');

/**
 * Create a new review
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Created review
 */
async function createReview(reviewData) {
  const {
    targetType,
    targetId,
    rating,
    comment = null,
    displayName = null,
    sessionId = null,
    ip = null,
    userAgent = null,
    status = 'published'
  } = reviewData;

  const query = `
    INSERT INTO reviews (
      target_type, target_id, rating, comment, 
      display_name, session_id, ip, user_agent, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    targetType,
    targetId,
    rating,
    comment,
    displayName,
    sessionId,
    ip,
    userAgent,
    status
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get reviews for a target (station or POI)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Reviews with pagination
 */
async function getReviews(params) {
  const {
    targetType,
    targetId,
    status = 'published',
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = params;

  const offset = (page - 1) * pageSize;
  const validSortFields = ['created_at', 'rating'];
  const validSortOrders = ['ASC', 'DESC'];
  
  const sort = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramIndex = 1;

  if (targetType) {
    whereClause += ` AND target_type = $${paramIndex}`;
    values.push(targetType);
    paramIndex++;
  }

  if (targetId) {
    whereClause += ` AND target_id = $${paramIndex}`;
    values.push(targetId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  // Count query
  const countQuery = `SELECT COUNT(*) FROM reviews ${whereClause}`;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].count);

  // Data query
  const dataQuery = `
    SELECT *
    FROM reviews
    ${whereClause}
    ORDER BY ${sort} ${order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  values.push(pageSize, offset);
  const dataResult = await pool.query(dataQuery, values);

  return {
    reviews: dataResult.rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Get review summary (average rating and count)
 * @param {string} targetType - 'station' or 'poi'
 * @param {number} targetId - Station or POI ID
 * @returns {Promise<Object>} Summary with avg and count
 */
async function getReviewSummary(targetType, targetId) {
  const query = `
    SELECT 
      COUNT(*) as review_count,
      COALESCE(AVG(rating), 0) as average_rating,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
    FROM reviews
    WHERE target_type = $1 AND target_id = $2 AND status = 'published'
  `;

  const result = await pool.query(query, [targetType, targetId]);
  const row = result.rows[0];

  return {
    avgRating: parseFloat(row.average_rating).toFixed(2),
    totalReviews: parseInt(row.review_count),
    breakdown: {
      5: parseInt(row.five_star),
      4: parseInt(row.four_star),
      3: parseInt(row.three_star),
      2: parseInt(row.two_star),
      1: parseInt(row.one_star)
    }
  };
}

/**
 * Check if user can submit review (anti-spam)
 * @param {string} sessionId - Session ID
 * @param {string} targetType - 'station' or 'poi'
 * @param {number} targetId - Station or POI ID
 * @returns {Promise<boolean>} True if can submit, false if blocked
 */
async function canSubmitReview(sessionId, targetType, targetId) {
  const query = `
    SELECT COUNT(*) FROM reviews
    WHERE session_id = $1 
      AND target_type = $2 
      AND target_id = $3
      AND created_at > NOW() - INTERVAL '24 hours'
  `;

  const result = await pool.query(query, [sessionId, targetType, targetId]);
  const count = parseInt(result.rows[0].count);
  
  return count === 0;
}

/**
 * Update review status (moderation)
 * @param {number} reviewId - Review ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated review
 */
async function updateReviewStatus(reviewId, status) {
  const query = `
    UPDATE reviews
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [status, reviewId]);
  return result.rows[0];
}

/**
 * Delete a review
 * @param {number} reviewId - Review ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteReview(reviewId) {
  const query = 'DELETE FROM reviews WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [reviewId]);
  return result.rows.length > 0;
}

/**
 * Get all reviews for admin (with filters)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Reviews with pagination
 */
async function getAllReviewsForAdmin(params) {
  const {
    status,
    targetType,
    searchTerm,
    page = 1,
    pageSize = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = params;

  const offset = (page - 1) * pageSize;
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (targetType) {
    whereClause += ` AND target_type = $${paramIndex}`;
    values.push(targetType);
    paramIndex++;
  }

  if (searchTerm) {
    whereClause += ` AND (comment ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Count query
  const countQuery = `SELECT COUNT(*) FROM reviews ${whereClause}`;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].count);

  // Data query
  const dataQuery = `
    SELECT 
      r.*,
      CASE 
        WHEN r.target_type = 'station' THEN s.name
        WHEN r.target_type = 'poi' THEN p.name
      END as target_name
    FROM reviews r
    LEFT JOIN stations s ON r.target_type = 'station' AND r.target_id = s.id
    LEFT JOIN pois p ON r.target_type = 'poi' AND r.target_id = p.id
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  values.push(pageSize, offset);
  const dataResult = await pool.query(dataQuery, values);

  return {
    reviews: dataResult.rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Get reviews for owner's stations
 * @param {number} ownerId - Owner ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Reviews with pagination
 */
async function getReviewsForOwner(ownerId, params) {
  const {
    status,
    stationId,
    page = 1,
    pageSize = 50
  } = params;

  const offset = (page - 1) * pageSize;
  let whereClause = 'WHERE s.owner_id = $1 AND r.target_type = \'station\'';
  const values = [ownerId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND r.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (stationId) {
    whereClause += ` AND r.target_id = $${paramIndex}`;
    values.push(stationId);
    paramIndex++;
  }

  // Count query
  const countQuery = `
    SELECT COUNT(*)
    FROM reviews r
    JOIN stations s ON r.target_id = s.id
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].count);

  // Data query
  const dataQuery = `
    SELECT 
      r.*,
      s.name as station_name
    FROM reviews r
    JOIN stations s ON r.target_id = s.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  values.push(pageSize, offset);
  const dataResult = await pool.query(dataQuery, values);

  return {
    reviews: dataResult.rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Get review by ID
 * @param {number} reviewId - Review ID
 * @returns {Promise<Object>} Review
 */
async function getReviewById(reviewId) {
  const query = 'SELECT * FROM reviews WHERE id = $1';
  const result = await pool.query(query, [reviewId]);
  return result.rows[0];
}

/**
 * Check if owner owns the station being reviewed
 * @param {number} reviewId - Review ID
 * @param {number} ownerId - Owner ID
 * @returns {Promise<boolean>} True if owner owns the station
 */
async function ownerOwnsReviewTarget(reviewId, ownerId) {
  const query = `
    SELECT 1
    FROM reviews r
    JOIN stations s ON r.target_type = 'station' AND r.target_id = s.id
    WHERE r.id = $1 AND s.owner_id = $2
  `;
  
  const result = await pool.query(query, [reviewId, ownerId]);
  return result.rows.length > 0;
}

module.exports = {
  createReview,
  getReviews,
  getReviewSummary,
  canSubmitReview,
  updateReviewStatus,
  deleteReview,
  getAllReviewsForAdmin,
  getReviewsForOwner,
  getReviewById,
  ownerOwnsReviewTarget
};
