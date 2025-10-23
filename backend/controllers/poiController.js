/**
 * POI Controller
 * Handles business logic for POI-related operations
 */

const poiRepository = require("../repositories/poiRepository");
const { transformPoiData } = require("../utils/transformers");

/**
 * Get all POIs
 */
async function getAllPois(req, res) {
  const pois = await poiRepository.getAllPois();
  const data = transformPoiData(pois);
  res.json(data);
}

/**
 * Get nearby POIs
 */
async function getNearbyPois(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;

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

  console.log(`🔍 Finding POIs near [${lat}, ${lng}] within ${radius}m...`);
  
  const pois = await poiRepository.getNearbyPois(lat, lng, radius);
  const data = transformPoiData(pois);
  
  console.log(`✅ Found ${data.length} nearby POIs`);
  res.json(data);
}

/**
 * Get POI by ID
 */
async function getPoiById(req, res) {
  const poiId = parseInt(req.params.id);

  if (!poiId || isNaN(poiId)) {
    return res.status(400).json({
      error: "Invalid ID",
      message: "POI ID must be a valid number",
    });
  }

  const poi = await poiRepository.getPoiById(poiId);
  
  if (!poi) {
    return res.status(404).json({
      error: "POI not found",
      message: `POI with ID ${poiId} does not exist`,
    });
  }

  const data = transformPoiData([poi])[0];
  res.json(data);
}

/**
 * Create a new POI
 */
async function createPoi(req, res) {
  const { name, type, location } = req.body;

  // Validation
  if (!name || !type || !location || !location.lat || !location.lng) {
    return res.status(400).json({
      error: "Missing required fields",
      message: "Name, type, and location (lat, lng) are required",
    });
  }

  if (!["gas", "convenience", "repair"].includes(type)) {
    return res.status(400).json({
      error: "Invalid type",
      message: "Type must be one of: gas, convenience, repair",
    });
  }

  console.log(`➕ Creating new POI: ${name} (${type})`);
  
  const newPoi = await poiRepository.addPoi({
    name,
    type,
    lat: location.lat,
    lng: location.lng,
  });

  const data = transformPoiData([newPoi])[0];
  
  console.log(`✅ Created POI: ${data.name} (ID: ${data.id})`);
  res.status(201).json(data);
}

/**
 * Update a POI
 */
async function updatePoi(req, res) {
  const poiId = parseInt(req.params.id);
  const { name, type, location } = req.body;

  if (!poiId || isNaN(poiId)) {
    return res.status(400).json({
      error: "Invalid ID",
      message: "POI ID must be a valid number",
    });
  }

  // Check if POI exists
  const existing = await poiRepository.getPoiById(poiId);
  if (!existing) {
    return res.status(404).json({
      error: "POI not found",
      message: `POI with ID ${poiId} does not exist`,
    });
  }

  // Validate type if provided
  if (type && !["gas", "convenience", "repair"].includes(type)) {
    return res.status(400).json({
      error: "Invalid type",
      message: "Type must be one of: gas, convenience, repair",
    });
  }

  console.log(`🔄 Updating POI ${poiId}: ${name || existing.name}`);
  
  const updated = await poiRepository.updatePoi(poiId, {
    name: name || existing.name,
    type: type || existing.type,
    lat: location?.lat || existing.lat,
    lng: location?.lng || existing.lng,
  });

  const data = transformPoiData([updated])[0];
  
  console.log(`✅ Updated POI: ${data.name}`);
  res.json(data);
}

/**
 * Delete a POI
 */
async function deletePoi(req, res) {
  const poiId = parseInt(req.params.id);

  if (!poiId || isNaN(poiId)) {
    return res.status(400).json({
      error: "Invalid ID",
      message: "POI ID must be a valid number",
    });
  }

  // Check if POI exists
  const existing = await poiRepository.getPoiById(poiId);
  if (!existing) {
    return res.status(404).json({
      error: "POI not found",
      message: `POI with ID ${poiId} does not exist`,
    });
  }

  console.log(`🗑️  Deleting POI ${poiId}: ${existing.name}`);
  
  await poiRepository.deletePoi(poiId);
  
  console.log(`✅ Deleted POI: ${existing.name}`);
  res.json({
    success: true,
    message: `POI ${existing.name} deleted successfully`,
    deletedId: poiId,
  });
}

module.exports = {
  getAllPois,
  getNearbyPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi
};
