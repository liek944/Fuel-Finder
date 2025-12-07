const { z } = require('zod');

/**
 * Review Validation Schemas
 */

const validTargetTypes = ['station', 'poi'];
const validReviewStatuses = ['pending', 'published', 'flagged', 'rejected'];

// Create review
const createReviewSchema = {
  body: z.object({
    targetType: z.enum(validTargetTypes, {
      errorMap: () => ({ message: `Target type must be one of: ${validTargetTypes.join(', ')}` })
    }),
    targetId: z.number().positive('Target ID must be a positive number'),
    rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must not exceed 5'),
    comment: z.string().min(1, 'Comment is required').max(1000, 'Comment must not exceed 1000 characters'),
    userName: z.string().optional(),
    userEmail: z.string().email().optional()
  })
};

// Get reviews
const getReviewsSchema = {
  query: z.object({
    targetType: z.enum(validTargetTypes, {
      errorMap: () => ({ message: `Target type must be one of: ${validTargetTypes.join(', ')}` })
    }),
    targetId: z.string().transform(val => parseInt(val)).pipe(z.number().positive()),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1).pipe(z.number().positive()),
    pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20).pipe(z.number().positive().max(100))
  })
};

// Get review summary
const getReviewSummarySchema = {
  query: z.object({
    targetType: z.enum(validTargetTypes, {
      errorMap: () => ({ message: `Target type must be one of: ${validTargetTypes.join(', ')}` })
    }),
    targetId: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

// Get all reviews for admin
const getAllReviewsForAdminSchema = {
  query: z.object({
    status: z.enum(validReviewStatuses).optional(),
    targetType: z.enum(validTargetTypes).optional(),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1).pipe(z.number().positive()),
    pageSize: z.string().optional().transform(val => val ? parseInt(val) : 50).pipe(z.number().positive().max(200))
  })
};

// Update review status
const updateReviewStatusSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    status: z.enum(validReviewStatuses, {
      errorMap: () => ({ message: `Status must be one of: ${validReviewStatuses.join(', ')}` })
    }),
    moderatorNotes: z.string().optional()
  })
};

// Delete review
const deleteReviewSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

// Get reviews for owner
const getReviewsForOwnerSchema = {
  query: z.object({
    status: z.enum(validReviewStatuses).optional(),
    stationId: z.string().optional().transform(val => val ? parseInt(val) : undefined).pipe(z.number().positive().optional()),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1).pipe(z.number().positive()),
    pageSize: z.string().optional().transform(val => val ? parseInt(val) : 50).pipe(z.number().positive().max(200))
  })
};

module.exports = {
  createReviewSchema,
  getReviewsSchema,
  getReviewSummarySchema,
  getAllReviewsForAdminSchema,
  updateReviewStatusSchema,
  deleteReviewSchema,
  getReviewsForOwnerSchema
};
