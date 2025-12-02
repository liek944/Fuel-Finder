/**
 * Station Service
 * Handles business logic for station-related operations
 */

const stationRepository = require("../repositories/stationRepository");
const priceRepository = require("../repositories/priceRepository");
const { transformStationData } = require("../utils/transformers");
const logger = require("../utils/logger");

/**
 * Get all stations
 * If accessed via owner subdomain, returns only owner's stations
 */
async function getAllStations(ownerData) {
  const ownerFilter = ownerData ? ownerData.id : null;

  if (ownerFilter) {
    logger.info(`Fetching stations for owner: ${ownerData.name}`);
  } else {
    logger.info("Fetching all stations from PostgreSQL database...");
  }

  const stations = await stationRepository.getAllStations(ownerFilter);
  const data = transformStationData(stations);

  logger.info(`Found ${data.length} stations`);
  return data;
}

/**
 * Get nearby stations
 * If accessed via owner subdomain, returns only owner's nearby stations
 */
async function getNearbyStations(lat, lng, radius, ownerData) {
  const ownerFilter = ownerData ? ownerData.id : null;

  if (ownerFilter) {
    logger.info(`Finding ${ownerData.name}'s stations near [${lat}, ${lng}] within ${radius}m...`);
  } else {
    logger.info(`Finding stations near [${lat}, ${lng}] within ${radius}m...`);
  }

  const stations = await stationRepository.getNearbyStations(lat, lng, radius, ownerFilter);
  const data = transformStationData(stations);

  logger.info(`Found ${data.length} nearby stations`);
  return data;
}

/**
 * Get station by ID
 */
async function getStationById(stationId) {
  logger.info(`Fetching station with ID ${stationId}...`);

  const station = await stationRepository.getStationById(stationId);

  if (!station) {
    return null;
  }

  const data = transformStationData([station])[0];
  logger.info(`Found station: ${data.name}`);
  return data;
}

/**
 * Create a new station
 */
async function createStation(stationData) {
  const { name, brand, fuel_price, services, address, phone, operating_hours, location, fuel_prices } = stationData;

  logger.info(`Creating new station: ${name}`);

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
    logger.info(`Adding ${fuel_prices.length} fuel price(s) for station ${newStation.id}`);
    for (const fp of fuel_prices) {
      const fuelType = fp && typeof fp.fuel_type === 'string' ? fp.fuel_type.trim() : '';
      if (!fuelType) continue;

      const rawPrice = fp.price;
      const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice));

      // Allow 0 as a valid stored value (interpreted as Unknown on frontend).
      // Ignore invalid (NaN) or negative values entirely.
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        continue;
      }

      try {
        await priceRepository.updateStationFuelPrice(
          newStation.id,
          fuelType,
          priceNum,
          'admin'
        );
      } catch (err) {
        logger.error(`Error adding fuel price ${fuelType}:`, err);
      }
    }
  }

  // Re-fetch the station to get the fuel_prices array populated
  const stationWithPrices = await stationRepository.getStationById(newStation.id);
  const data = transformStationData([stationWithPrices])[0];

  logger.info(`Created station: ${data.name} (ID: ${data.id})`);
  return data;
}

/**
 * Update a station
 */
async function updateStation(stationId, updateData) {
  const { name, brand, fuel_price, services, address, phone, operating_hours, location } = updateData;

  // Check if station exists
  const existing = await stationRepository.getStationById(stationId);
  if (!existing) {
    return null;
  }

  logger.info(`Updating station ${stationId}: ${name || existing.name}`);

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

  logger.info(`Updated station: ${data.name}`);
  return data;
}

/**
 * Delete a station
 */
async function deleteStation(stationId) {
  // Check if station exists
  const existing = await stationRepository.getStationById(stationId);
  if (!existing) {
    return null;
  }

  logger.info(`Deleting station ${stationId}: ${existing.name}`);

  await stationRepository.deleteStation(stationId);

  logger.info(`Deleted station: ${existing.name}`);
  return existing;
}

/**
 * Search stations
 */
async function searchStations(query) {
  logger.info(`Searching stations for: "${query}"`);

  const stations = await stationRepository.searchStations(query);
  const data = transformStationData(stations);

  logger.info(`Found ${data.length} stations matching "${query}"`);
  return data;
}

/**
 * Get stations by brand
 */
async function getStationsByBrand(brand) {
  logger.info(`Fetching stations for brand: ${brand}`);

  const stations = await stationRepository.getStationsByBrand(brand);
  const data = transformStationData(stations);

  logger.info(`Found ${data.length} ${brand} stations`);
  return data;
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
