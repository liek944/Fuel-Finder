/**
 * Central export point for all validation schemas
 */

const stationSchemas = require('./stationSchemas');
const poiSchemas = require('./poiSchemas');
const ownerSchemas = require('./ownerSchemas');
const reviewSchemas = require('./reviewSchemas');

module.exports = {
  station: stationSchemas,
  poi: poiSchemas,
  owner: ownerSchemas,
  review: reviewSchemas
};
