const { z } = require('zod');

/**
 * POI Validation Schemas
 */

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  municipality: z.string().optional(),
  province: z.string().optional()
});

const validPoiTypes = ['gas', 'convenience', 'repair', 'car_wash', 'motor_shop'];

// Get nearby POIs
const getNearbyPoisSchema = {
  query: z.object({
    lat: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-90).max(90)),
    lng: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-180).max(180)),
    radiusMeters: z.string().optional().transform(val => val ? parseInt(val) : 3000).pipe(z.number().positive()),
    radius: z.string().optional().transform(val => val ? parseInt(val) : 3000).pipe(z.number().positive())
  }).transform(data => ({
    lat: data.lat,
    lng: data.lng,
    radius: data.radiusMeters || data.radius || 3000
  }))
};

// Get POI by ID
const getPoiByIdSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

// Create POI
const createPoiSchema = {
  body: z.object({
    name: z.string().min(1, 'POI name is required'),
    type: z.enum(validPoiTypes, {
      errorMap: () => ({ message: `Type must be one of: ${validPoiTypes.join(', ')}` })
    }),
    location: locationSchema,
    description: z.string().optional(),
    contact: z.string().optional(),
    operating_hours: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal(''))
  })
};

// Update POI
const updatePoiSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.enum(validPoiTypes, {
      errorMap: () => ({ message: `Type must be one of: ${validPoiTypes.join(', ')}` })
    }).optional(),
    location: locationSchema.optional(),
    description: z.string().optional(),
    contact: z.string().optional(),
    operating_hours: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal(''))
  })
};

// Delete POI
const deletePoiSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

module.exports = {
  getNearbyPoisSchema,
  getPoiByIdSchema,
  createPoiSchema,
  updatePoiSchema,
  deletePoiSchema
};
