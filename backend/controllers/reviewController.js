/**
 * Review Controller
 * Handles HTTP requests for reviews
 */

const reviewRepository = require('../repositories/reviewRepository');

/**
 * Create a new review
 * POST /api/reviews
 */
async function createReview(req, res) {
  try {
    const {
      targetType,
      targetId,
      rating,
      comment,
      displayName
    } = req.body;

    // Validation
    if (!targetType || !['station', 'poi'].includes(targetType)) {
      return res.status(400).json({
        error: 'Invalid target type. Must be "station" or "poi"'
      });
    }

    if (!targetId || isNaN(parseInt(targetId))) {
      return res.status(400).json({
        error: 'Invalid target ID'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    if (comment && comment.length > 500) {
      return res.status(400).json({
        error: 'Comment must be 500 characters or less'
      });
    }

    // Get session/IP/UA for anti-spam
    const sessionId = req.headers['x-session-id'] || req.sessionID || null;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;

    // Check anti-spam (1 review per target per device per 24h)
    if (sessionId) {
      const canSubmit = await reviewRepository.canSubmitReview(
        sessionId,
        targetType,
        parseInt(targetId)
      );

      if (!canSubmit) {
        return res.status(429).json({
          error: 'You can only submit one review per location per 24 hours'
        });
      }
    }

    // Create review
    const reviewData = {
      targetType,
      targetId: parseInt(targetId),
      rating: parseInt(rating),
      comment: comment || null,
      displayName: displayName || null,
      sessionId,
      ip,
      userAgent,
      status: 'published' // Auto-publish by default
    };

    const review = await reviewRepository.createReview(reviewData);

    // Return sanitized review (hide IP/UA/session)
    const sanitizedReview = {
      id: review.id,
      targetType: review.target_type,
      targetId: review.target_id,
      rating: review.rating,
      comment: review.comment,
      displayName: review.display_name,
      status: review.status,
      createdAt: review.created_at
    };

    res.status(201).json({
      success: true,
      review: sanitizedReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      error: 'Failed to create review'
    });
  }
}

/**
 * Get reviews for a target
 * GET /api/reviews?targetType=station&targetId=123&page=1&pageSize=20
 */
async function getReviews(req, res) {
  try {
    const {
      targetType,
      targetId,
      status = 'published',
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    if (!targetType || !['station', 'poi'].includes(targetType)) {
      return res.status(400).json({
        error: 'Invalid target type. Must be "station" or "poi"'
      });
    }

    if (!targetId || isNaN(parseInt(targetId))) {
      return res.status(400).json({
        error: 'Invalid target ID'
      });
    }

    const result = await reviewRepository.getReviews({
      targetType,
      targetId: parseInt(targetId),
      status,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      sortBy,
      sortOrder
    });

    // Sanitize reviews (hide IP/UA/session)
    const sanitizedReviews = result.reviews.map(r => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      rating: r.rating,
      comment: r.comment,
      displayName: r.display_name,
      status: r.status,
      createdAt: r.created_at
    }));

    res.json({
      success: true,
      reviews: sanitizedReviews,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      error: 'Failed to fetch reviews'
    });
  }
}

/**
 * Get review summary (average rating and count)
 * GET /api/reviews/summary?targetType=station&targetId=123
 */
async function getReviewSummary(req, res) {
  try {
    const { targetType, targetId } = req.query;

    if (!targetType || !['station', 'poi'].includes(targetType)) {
      return res.status(400).json({
        error: 'Invalid target type. Must be "station" or "poi"'
      });
    }

    if (!targetId || isNaN(parseInt(targetId))) {
      return res.status(400).json({
        error: 'Invalid target ID'
      });
    }

    const summary = await reviewRepository.getReviewSummary(
      targetType,
      parseInt(targetId)
    );

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching review summary:', error);
    res.status(500).json({
      error: 'Failed to fetch review summary'
    });
  }
}

/**
 * Get all reviews for admin (with filters)
 * GET /api/admin/reviews?status=published&targetType=station&page=1
 */
async function getAllReviewsForAdmin(req, res) {
  try {
    const {
      status,
      targetType,
      searchTerm,
      page = 1,
      pageSize = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const result = await reviewRepository.getAllReviewsForAdmin({
      status,
      targetType,
      searchTerm,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      reviews: result.reviews,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({
      error: 'Failed to fetch reviews'
    });
  }
}

/**
 * Update review status (admin moderation)
 * PATCH /api/admin/reviews/:id
 */
async function updateReviewStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['published', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be "published", "pending", or "rejected"'
      });
    }

    const review = await reviewRepository.updateReviewStatus(
      parseInt(id),
      status
    );

    if (!review) {
      return res.status(404).json({
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      error: 'Failed to update review'
    });
  }
}

/**
 * Delete review (admin only)
 * DELETE /api/admin/reviews/:id
 */
async function deleteReview(req, res) {
  try {
    const { id } = req.params;

    const deleted = await reviewRepository.deleteReview(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      error: 'Failed to delete review'
    });
  }
}

/**
 * Get reviews for owner's stations
 * GET /api/owner/reviews?status=published&stationId=123
 */
async function getReviewsForOwner(req, res) {
  try {
    const ownerId = req.ownerData.id; // Set by ownerAuth middleware (req.ownerData)

    const {
      status,
      stationId,
      page = 1,
      pageSize = 50
    } = req.query;

    const result = await reviewRepository.getReviewsForOwner(ownerId, {
      status,
      stationId: stationId ? parseInt(stationId) : undefined,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

    res.json({
      success: true,
      reviews: result.reviews,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching owner reviews:', error);
    res.status(500).json({
      error: 'Failed to fetch reviews'
    });
  }
}

/**
 * Update review status (owner moderation)
 * PATCH /api/owner/reviews/:id
 */
async function updateReviewStatusByOwner(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ownerId = req.ownerData.id; // Set by ownerAuth middleware (req.ownerData)

    if (!status || !['published', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be "published" or "rejected"'
      });
    }

    // Verify owner owns the station
    const ownsTarget = await reviewRepository.ownerOwnsReviewTarget(
      parseInt(id),
      ownerId
    );

    if (!ownsTarget) {
      return res.status(403).json({
        error: 'You can only moderate reviews for your own stations'
      });
    }

    const review = await reviewRepository.updateReviewStatus(
      parseInt(id),
      status
    );

    if (!review) {
      return res.status(404).json({
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      error: 'Failed to update review'
    });
  }
}

module.exports = {
  createReview,
  getReviews,
  getReviewSummary,
  getAllReviewsForAdmin,
  updateReviewStatus,
  deleteReview,
  getReviewsForOwner,
  updateReviewStatusByOwner
};
