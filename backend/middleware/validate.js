const { z } = require('zod');
const logger = require('../utils/logger');

/**
 * Validation Middleware Factory
 * Creates Express middleware that validates request params, query, and body using Zod schemas
 * 
 * @param {Object} schemas - Object containing Zod schemas for params, query, and/or body
 * @param {z.ZodSchema} [schemas.params] - Schema for route parameters
 * @param {z.ZodSchema} [schemas.query] - Schema for query parameters
 * @param {z.ZodSchema} [schemas.body] - Schema for request body
 * @returns {Function} Express middleware function
 */
function validate(schemas = {}) {
  return async (req, res, next) => {
    try {
      const validated = {};

      // Validate params
      if (schemas.params) {
        validated.params = await schemas.params.parseAsync(req.params);
      }

      // Validate query
      if (schemas.query) {
        validated.query = await schemas.query.parseAsync(req.query);
      }

      // Validate body
      if (schemas.body) {
        validated.body = await schemas.body.parseAsync(req.body);
      }

      // Attach validated (and type-coerced) data to request
      req.validated = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors into a user-friendly response
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Validation error:', {
          path: req.path,
          method: req.method,
          errors: formattedErrors
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: formattedErrors
        });
      }

      // For non-Zod errors, pass to error handler
      next(error);
    }
  };
}

module.exports = { validate };
