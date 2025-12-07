/**
 * Review Routes
 * Public API endpoints for reviews
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { asyncHandler } = require('../middleware/errorHandler');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const schemas = require('../schemas').review;

// Rate limiters
const reviewReadLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many review read requests, please try again later'
});

const reviewWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 reviews per minute per IP
  message: 'Too many review submissions, please try again later'
});

// Public routes
router.post('/', reviewWriteLimiter, validate(schemas.createReviewSchema), asyncHandler(reviewController.createReview));
router.get('/', reviewReadLimiter, validate(schemas.getReviewsSchema), asyncHandler(reviewController.getReviews));
router.get('/summary', reviewReadLimiter, validate(schemas.getReviewSummarySchema), asyncHandler(reviewController.getReviewSummary));

module.exports = router;
