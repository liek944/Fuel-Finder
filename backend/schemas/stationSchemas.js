const { z } = require('zod');

/**
 * Station Validation Schemas
 */

// Shared schemas
const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  municipality: z.string().optional(),
  province: z.string().optional()
});

// Get nearby stations
const getNearbyStationsSchema = {
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

// Get station by ID
const getStationByIdSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

// Create station
const createStationSchema = {
  body: z.object({
    name: z.string().min(1, 'Station name is required'),
    brand: z.string().min(1, 'Brand is required'),
    location: locationSchema,
    contact: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    operating_hours: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal(''))
  })
};

// Update station
const updateStationSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    location: locationSchema.optional(),
    contact: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    operating_hours: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal(''))
  })
};

// Delete station
const deleteStationSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  })
};

// Search stations
const searchStationsSchema = {
  query: z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters long')
  })
};

// Get stations by brand
const getStationsByBrandSchema = {
  params: z.object({
    brand: z.string().min(1, 'Brand name is required')
  })
};

// Submit price report
const submitPriceReportSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  body: z.object({
    fuel_type: z.string().min(1, 'Fuel type is required'),
    price: z.number().min(30, 'Price must be at least ₱30').max(200, 'Price must not exceed ₱200'),
    notes: z.string().optional()
  })
};

// Get price reports
const getPriceReportsSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  query: z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10).pipe(z.number().positive().max(100))
  })
};

// Get average price from reports
const getAveragePriceSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive())
  }),
  query: z.object({
    fuel_type: z.string().optional().default('Regular'),
    days: z.string().optional().transform(val => val ? parseInt(val) : 7).pipe(z.number().positive().max(90))
  })
};

// Update fuel price
const updateFuelPriceSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive()),
    fuelType: z.string().min(1, 'Fuel type is required')
  }),
  body: z.object({
    price: z.number().min(0, 'Price must be zero or positive'),
    updated_by: z.string().optional().default('admin')
  })
};

// Delete fuel price
const deleteFuelPriceSchema = {
  params: z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().positive()),
    fuelType: z.string().min(1, 'Fuel type is required')
  })
};

module.exports = {
  getNearbyStationsSchema,
  getStationByIdSchema,
  createStationSchema,
  updateStationSchema,
  deleteStationSchema,
  searchStationsSchema,
  getStationsByBrandSchema,
  submitPriceReportSchema,
  getPriceReportsSchema,
  getAveragePriceSchema,
  updateFuelPriceSchema,
  deleteFuelPriceSchema
};
