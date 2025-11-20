/**
 * POI Service
 * Handles business logic for POI-related operations
 */

const poiRepository = require("../repositories/poiRepository");
const { transformPoiData } = require("../utils/transformers");
const logger = require("../utils/logger");

/**
 * Get all POIs
 */
async function getAllPois() {
  logger.info("Fetching all POIs...");
  const pois = await poiRepository.getAllPois();
  const data = transformPoiData(pois);
  logger.info(`Found ${data.length} POIs`);
  return data;
}

/**
 * Get nearby POIs
 */
async function getNearbyPois(lat, lng, radius) {
  logger.info(`Finding POIs near [${lat}, ${lng}] within ${radius}m...`);

  const pois = await poiRepository.getNearbyPois(lat, lng, radius);
  const data = transformPoiData(pois);

  logger.info(`Found ${data.length} nearby POIs`);
  return data;
}

/**
 * Get POI by ID
 */
async function getPoiById(poiId) {
  logger.info(`Fetching POI with ID ${poiId}...`);

  const poi = await poiRepository.getPoiById(poiId);

  if (!poi) {
    return null;
  }

  const data = transformPoiData([poi])[0];
  logger.info(`Found POI: ${data.name}`);
  return data;
}

/**
 * Create a new POI
 */
async function createPoi(poiData) {
  const { name, type, location, address, phone, operating_hours } = poiData;

  logger.info(`Creating new POI: ${name} (${type})`);

  const newPoi = await poiRepository.addPoi({
    name,
    type,
    lat: location.lat,
    lng: location.lng,
    address,
    phone,
    operating_hours,
  });

  const data = transformPoiData([newPoi])[0];

  logger.info(`Created POI: ${data.name} (ID: ${data.id})`);
  return data;
}

/**
 * Update a POI
 */
async function updatePoi(poiId, updateData) {
  const { name, type, location, address, phone, operating_hours } = updateData;

  // Check if POI exists
  const existing = await poiRepository.getPoiById(poiId);
  if (!existing) {
    return null;
  }

  logger.info(`Updating POI ${poiId}: ${name || existing.name}`);

  const updated = await poiRepository.updatePoi(poiId, {
    name: name || existing.name,
    type: type || existing.type,
    lat: location?.lat || existing.lat,
    lng: location?.lng || existing.lng,
    address: address !== undefined ? address : existing.address,
    phone: phone !== undefined ? phone : existing.phone,
    operating_hours: operating_hours !== undefined ? operating_hours : existing.operating_hours,
  });

  const data = transformPoiData([updated])[0];

  logger.info(`Updated POI: ${data.name}`);
  return data;
}

/**
 * Delete a POI
 */
async function deletePoi(poiId) {
  // Check if POI exists
  const existing = await poiRepository.getPoiById(poiId);
  if (!existing) {
    return null;
  }

  logger.info(`Deleting POI ${poiId}: ${existing.name}`);

  await poiRepository.deletePoi(poiId);

  logger.info(`Deleted POI: ${existing.name}`);
  return existing;
}

module.exports = {
  getAllPois,
  getNearbyPois,
  getPoiById,
  createPoi,
  updatePoi,
  deletePoi
};
