/**
 * Station Controller
 * Handles business logic for station-related operations
 */

const stationRepository = require("../repositories/stationRepository");
const { transformStationData } = require("../utils/transformers");

/**
 * Get all stations
 */
async function getAllStations(req, res) {
  console.log("📋 Fetching all stations from PostgreSQL database...");
  
  const stations = await stationRepository.getAllStations();
  const data = transformStationData(stations);
  
  console.log(`✅ Found ${data.length} stations`);
  res.json(data);
}

/**
 * Get nearby stations
 */
async function getNearbyStations(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseInt(req.query.radius) || 3000;

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

  console.log(`🔍 Finding stations near [${lat}, ${lng}] within ${radius}m...`);
  
  const stations = await stationRepository.getNearbyStations(lat, lng, radius);
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
  const { name, brand, fuel_price, services, address, phone, operating_hours, location } = req.body;

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

  const data = transformStationData([newStation])[0];
  
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

module.exports = {
  getAllStations,
  getNearbyStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  searchStations,
  getStationsByBrand
};
