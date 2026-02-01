const { z } = require('zod');

/**
 * Owner Portal Validation Schemas
 */

// Get owner station
const getOwnerStationSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

// Update owner station
const updateOwnerStationSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    brand: z.string().nullable().optional(),
    address: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    operating_hours: z.object({
      open: z.string(),
      close: z.string()
    }).nullable().optional(),
    services: z.array(z.string()).optional(),
    image_url: z.string().url().optional().or(z.literal(''))
  })
};

// Update fuel price (owner)
const updateFuelPriceSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    fuel_type: z.string().min(1, 'Fuel type is required'),
    price: z.number().positive('Price must be a positive number')
  })
};

// Delete fuel price (owner)
const deleteFuelPriceSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive()),
    fuelType: z.string().min(1, 'Fuel type is required')
  })
};

// Get pending price reports
const getPendingPriceReportsSchema = {
  query: z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val) : 50).pipe(z.number().positive().max(200))
  })
};

// Verify price report
const verifyPriceReportSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    notes: z.string().optional()
  })
};

// Reject price report
const rejectPriceReportSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    reason: z.string().optional()
  })
};

// Get activity logs
const getActivityLogsSchema = {
  query: z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val) : 100).pipe(z.number().positive().max(500)),
    offset: z.string().optional().transform(val => val ? parseInt(val) : 0).pipe(z.number().min(0))
  })
};

// Get market insights
const getMarketInsightsSchema = {
  query: z.object({
    days: z.string().optional().transform(val => val ? parseInt(val) : 30).pipe(z.number().positive().max(365)),
    municipality: z.string().optional().default('')
  })
};

// Request magic link (passwordless login)
const requestMagicLinkSchema = {
  body: z.object({
    email: z.string().email('Valid email is required')
  })
};

// Verify magic link token
const verifyMagicLinkSchema = {
  params: z.object({
    token: z.string().length(64, 'Invalid token format')
  })
};

module.exports = {
  getOwnerStationSchema,
  updateOwnerStationSchema,
  updateFuelPriceSchema,
  deleteFuelPriceSchema,
  getPendingPriceReportsSchema,
  verifyPriceReportSchema,
  rejectPriceReportSchema,
  getActivityLogsSchema,
  getMarketInsightsSchema,
  requestMagicLinkSchema,
  verifyMagicLinkSchema
};

