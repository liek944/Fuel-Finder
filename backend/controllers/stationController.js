/**
 * Station Controller
 * Handles business logic for station-related operations
 */

const stationRepository = require("../repositories/stationRepository");
const priceRepository = require("../repositories/priceRepository");
const { transformStationData } = require("../utils/transformers");

/**
 * Get all stations
 * If accessed via owner subdomain, returns only owner's stations
 */
async function getAllStations(req, res) {
  const ownerFilter = req.ownerData ? req.ownerData.id : null;
  
  if (ownerFilter) {
    console.log(`📋 Fetching stations for owner: ${req.ownerData.name}`);
  } else {
    console.log("📋 Fetching all stations from PostgreSQL database...");
  }
  
  const stations = await stationRepository.getAllStations(ownerFilter);
  const data = transformStationData(stations);
  
  console.log(`✅ Found ${data.length} stations`);
  res.json(data);
}

/**
 * Get nearby stations
 * If accessed via owner subdomain, returns only owner's nearby stations
 */
async function getNearbyStations(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;
  const ownerFilter = req.ownerData ? req.ownerData.id : null;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      error: "Invalid coordinates",
      message: "Please provide valid latitude and longitude values",
    });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      error: "Coordinates out of range",
      message: "Latitude must be between -90 and 90, longitude between -180 and 180",
    });
  }

  if (ownerFilter) {
    console.log(`🔍 Finding ${req.ownerData.name}'s stations near [${lat}, ${lng}] within ${radius}m...`);
  } else {
    console.log(`🔍 Finding stations near [${lat}, ${lng}] within ${radius}m...`);
  }
  
  const stations = await stationRepository.getNearbyStations(lat, lng, radius, ownerFilter);
  const data = transformStationData(stations);
  
  console.log(`✅ Found ${data.length} nearby stations`);
  res.json(data);
}

/**
 * Get station by ID
 */
async function getStationById(req, res) {
  const stationId = parseInt(req.params.id);

  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid ID",
      message: "Station ID must be a valid number",
    });
  }

  console.log(`🔍 Fetching station with ID ${stationId}...`);
  
  const station = await stationRepository.getStationById(stationId);
  
  if (!station) {
    return res.status(404).json({
      error: "Station not found",
      message: `Station with ID ${stationId} does not exist`,
    });
  }

  const data = transformStationData([station])[0];
  console.log(`✅ Found station: ${data.name}`);
  res.json(data);
}

/**
 * Create a new station
 */
async function createStation(req, res) {
  const { name, brand, fuel_price, services, address, phone, operating_hours, location, fuel_prices } = req.body;

  // Validation
  if (!name || !brand || !location || !location.lat || !location.lng) {
    return res.status(400).json({
      error: "Missing required fields",
      message: "Name, brand, and location (lat, lng) are required",
    });
  }

  console.log(`➕ Creating new station: ${name}`);
  
  const newStation = await stationRepository.addStation({
    name,
    brand,
    fuel_price: fuel_price || 0,
    services: services || [],
    address: address || "",
    phone: phone || null,
    operating_hours: operating_hours || null,
    lat: location.lat,
    lng: location.lng,
  });

  // Add individual fuel prices if provided
  if (fuel_prices && Array.isArray(fuel_prices) && fuel_prices.length > 0) {
    console.log(`⛽ Adding ${fuel_prices.length} fuel price(s) for station ${newStation.id}`);
    for (const fp of fuel_prices) {
      if (fp.fuel_type && fp.price && parseFloat(fp.price) > 0) {
        try {
          await priceRepository.updateStationFuelPrice(
            newStation.id,
            fp.fuel_type,
            parseFloat(fp.price),
            'admin'
          );
        } catch (err) {
          console.error(`❌ Error adding fuel price ${fp.fuel_type}:`, err);
        }
      }
    }
  }

  // Re-fetch the station to get the fuel_prices array populated
  const stationWithPrices = await stationRepository.getStationById(newStation.id);
  const data = transformStationData([stationWithPrices])[0];
  
  console.log(`✅ Created station: ${data.name} (ID: ${data.id})`);
  res.status(201).json(data);
}

/**
 * Update a station
 */
async function updateStation(req, res) {
  const stationId = parseInt(req.params.id);
  const { name, brand, fuel_price, services, address, phone, operating_hours, location } = req.body;

  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid ID",
      message: "Station ID must be a valid number",
    });
  }

  // Check if station exists
  const existing = await stationRepository.getStationById(stationId);
  if (!existing) {
    return res.status(404).json({
      error: "Station not found",
      message: `Station with ID ${stationId} does not exist`,
    });
  }

  console.log(`🔄 Updating station ${stationId}: ${name || existing.name}`);
  
  const updated = await stationRepository.updateStation(stationId, {
    name: name || existing.name,
    brand: brand !== undefined ? brand : existing.brand,
    fuel_price: fuel_price !== undefined ? fuel_price : existing.fuel_price,
    services: services !== undefined ? services : existing.services,
    address: address !== undefined ? address : existing.address,
    phone: phone !== undefined ? phone : existing.phone,
    operating_hours: operating_hours !== undefined ? operating_hours : existing.operating_hours,
    lat: location?.lat || existing.lat,
    lng: location?.lng || existing.lng,
  });

  const data = transformStationData([updated])[0];
  
  console.log(`✅ Updated station: ${data.name}`);
  res.json(data);
}

/**
 * Delete a station
 */
async function deleteStation(req, res) {
  const stationId = parseInt(req.params.id);

  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid ID",
      message: "Station ID must be a valid number",
    });
  }

  // Check if station exists
  const existing = await stationRepository.getStationById(stationId);
  if (!existing) {
    return res.status(404).json({
      error: "Station not found",
      message: `Station with ID ${stationId} does not exist`,
    });
  }

  console.log(`🗑️  Deleting station ${stationId}: ${existing.name}`);
  
  await stationRepository.deleteStation(stationId);
  
  console.log(`✅ Deleted station: ${existing.name}`);
  res.json({
    success: true,
    message: `Station ${existing.name} deleted successfully`,
    deletedId: stationId,
  });
}

/**
 * Search stations
 */
async function searchStations(req, res) {
  const query = req.query.q;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      error: "Invalid search query",
      message: "Search query must be at least 2 characters long",
    });
  }

  console.log(`🔍 Searching stations for: "${query}"`);
  
  const stations = await stationRepository.searchStations(query);
  const data = transformStationData(stations);
  
  console.log(`✅ Found ${data.length} stations matching "${query}"`);
  res.json(data);
}

/**
 * Get stations by brand
 */
async function getStationsByBrand(req, res) {
  const brand = req.params.brand;

  if (!brand) {
    return res.status(400).json({
      error: "Invalid brand",
      message: "Brand name is required",
    });
  }

  console.log(`🔍 Fetching stations for brand: ${brand}`);
  
  const stations = await stationRepository.getStationsByBrand(brand);
  const data = transformStationData(stations);
  
  console.log(`✅ Found ${data.length} ${brand} stations`);
  res.json(data);
}

/**
 * Submit a fuel price report (public endpoint)
 */
async function submitPriceReport(req, res) {
  const stationId = parseInt(req.params.id);

  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  // Check if station exists
  const station = await stationRepository.getStationById(stationId);
  if (!station) {
    return res.status(404).json({
      error: "Station not found",
      message: `No station found with ID ${stationId}`,
    });
  }

  const { fuel_type = "Regular", price, notes } = req.body;

  // Validate price
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({
      error: "Invalid price",
      message: "Price must be a positive number",
    });
  }

  // Validate price range (reasonable limits for Philippine fuel prices)
  const priceNum = parseFloat(price);
  if (priceNum < 30 || priceNum > 200) {
    return res.status(400).json({
      error: "Invalid price range",
      message: "Price must be between ₱30 and ₱200 per liter",
    });
  }

  // Get reporter IP
  const reporter_ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    "unknown";

  console.log(`💰 Submitting price report for station ${stationId}: ₱${priceNum} (${fuel_type})`);

  // Submit report with anonymous reporter if not provided
  const report = await priceRepository.submitPriceReport({
    station_id: stationId,
    fuel_type,
    price: priceNum,
    reporter_name: "Anonymous",
    reporter_contact: reporter_ip,
    photo_url: notes || null,
  });

  console.log(`✅ Price report submitted (ID: ${report.id})`);

  res.status(201).json({
    success: true,
    message: "Price report submitted successfully. Thank you for contributing!",
    report: {
      id: report.id,
      station_id: report.station_id,
      fuel_type: report.fuel_type,
      price: report.price,
      created_at: report.created_at,
    },
  });
}

/**
 * Get price reports for a station
 */
async function getPriceReportsForStation(req, res) {
  const stationId = parseInt(req.params.id);
  const limit = parseInt(req.query.limit || "10");

  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  console.log(`📊 Fetching price reports for station ${stationId}...`);

  const reports = await priceRepository.getPriceReports(stationId, limit);

  console.log(`✅ Found ${reports.length} price reports`);

  res.json({ reports });
}

/**
 * Get average price from recent reports
 */
async function getAveragePriceFromReports(req, res) {
  const stationId = parseInt(req.params.id);
  const fuelType = req.query.fuel_type || "Regular";
  const days = parseInt(req.query.days || "7");

  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({
      error: "Invalid station ID",
      message: "Station ID must be a valid number",
    });
  }

  console.log(`📊 Calculating average price for station ${stationId} (${fuelType})...`);

  const stats = await priceRepository.getAveragePriceFromReports(stationId, fuelType, days);

  res.json(stats);
}

module.exports = {
  getAllStations,
  getNearbyStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  searchStations,
  getStationsByBrand,
  submitPriceReport,
  getPriceReportsForStation,
  getAveragePriceFromReports
};
