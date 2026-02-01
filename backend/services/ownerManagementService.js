/**
 * Owner Management Service
 * Handles CRUD operations for station owners (admin-level access)
 */

const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate a secure API key for a new owner
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Get all owners with station counts
 */
async function getAllOwners() {
  const query = `
    SELECT 
      o.id,
      o.name,
      o.domain,
      o.email,
      o.contact_person,
      o.phone,
      o.is_active,
      o.theme_config,
      o.created_at,
      o.updated_at,
      COUNT(s.id)::int as station_count
    FROM owners o
    LEFT JOIN stations s ON s.owner_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get a single owner by ID
 */
async function getOwnerById(ownerId) {
  const query = `
    SELECT 
      o.*,
      COUNT(s.id)::int as station_count
    FROM owners o
    LEFT JOIN stations s ON s.owner_id = o.id
    WHERE o.id = $1
    GROUP BY o.id
  `;
  
  const result = await pool.query(query, [ownerId]);
  return result.rows[0] || null;
}

/**
 * Check if a subdomain is available
 */
async function isSubdomainAvailable(domain, excludeOwnerId = null) {
  let query = 'SELECT id FROM owners WHERE domain = $1';
  const params = [domain.toLowerCase()];
  
  if (excludeOwnerId) {
    query += ' AND id != $2';
    params.push(excludeOwnerId);
  }
  
  const result = await pool.query(query, params);
  return result.rows.length === 0;
}

/**
 * Create a new owner
 */
async function createOwner(ownerData) {
  const apiKey = generateApiKey();
  const domain = ownerData.domain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  // Validate subdomain
  if (!domain) {
    throw new Error('Invalid domain format');
  }
  
  const isAvailable = await isSubdomainAvailable(domain);
  if (!isAvailable) {
    throw new Error(`Subdomain "${domain}" is already taken`);
  }
  
  const query = `
    INSERT INTO owners (
      name, domain, api_key, email, contact_person, phone, theme_config, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    RETURNING id, name, domain, api_key, email, contact_person, phone, theme_config, is_active, created_at
  `;
  
  const themeConfig = ownerData.theme_config || {
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B'
    }
  };
  
  const result = await pool.query(query, [
    ownerData.name,
    domain,
    apiKey,
    ownerData.email || null,
    ownerData.contact_person || null,
    ownerData.phone || null,
    JSON.stringify(themeConfig)
  ]);
  
  logger.info(`Created new owner: ${ownerData.name} (${domain})`);
  return result.rows[0];
}

/**
 * Update an existing owner
 */
async function updateOwner(ownerId, ownerData) {
  // Check if changing domain
  if (ownerData.domain) {
    const domain = ownerData.domain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const isAvailable = await isSubdomainAvailable(domain, ownerId);
    if (!isAvailable) {
      throw new Error(`Subdomain "${domain}" is already taken`);
    }
    ownerData.domain = domain;
  }
  
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  const allowedFields = ['name', 'domain', 'email', 'contact_person', 'phone', 'theme_config', 'is_active'];
  
  for (const field of allowedFields) {
    if (ownerData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(field === 'theme_config' ? JSON.stringify(ownerData[field]) : ownerData[field]);
      paramIndex++;
    }
  }
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  fields.push(`updated_at = NOW()`);
  values.push(ownerId);
  
  const query = `
    UPDATE owners 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, domain, email, contact_person, phone, theme_config, is_active, created_at, updated_at
  `;
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Owner not found');
  }
  
  logger.info(`Updated owner: ${result.rows[0].name}`);
  return result.rows[0];
}

/**
 * Get unassigned stations (stations with no owner)
 */
async function getUnassignedStations() {
  const query = `
    SELECT id, name, brand, address
    FROM stations
    WHERE owner_id IS NULL
    ORDER BY name
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Assign stations to an owner
 */
async function assignStationsToOwner(ownerId, stationIds) {
  if (!stationIds || stationIds.length === 0) {
    return [];
  }
  
  // Verify owner exists
  const owner = await getOwnerById(ownerId);
  if (!owner) {
    throw new Error('Owner not found');
  }
  
  const query = `
    UPDATE stations 
    SET owner_id = $1
    WHERE id = ANY($2::int[])
    RETURNING id, name, brand
  `;
  
  const result = await pool.query(query, [ownerId, stationIds]);
  
  logger.info(`Assigned ${result.rows.length} stations to owner ${owner.name}`);
  return result.rows;
}

/**
 * Get stations assigned to an owner
 */
async function getOwnerStations(ownerId) {
  const query = `
    SELECT id, name, brand, address
    FROM stations
    WHERE owner_id = $1
    ORDER BY name
  `;
  
  const result = await pool.query(query, [ownerId]);
  return result.rows;
}

/**
 * Unassign stations from an owner
 */
async function unassignStationsFromOwner(stationIds) {
  if (!stationIds || stationIds.length === 0) {
    return [];
  }
  
  const query = `
    UPDATE stations 
    SET owner_id = NULL
    WHERE id = ANY($1::int[])
    RETURNING id, name, brand
  `;
  
  const result = await pool.query(query, [stationIds]);
  return result.rows;
}

module.exports = {
  generateApiKey,
  getAllOwners,
  getOwnerById,
  isSubdomainAvailable,
  createOwner,
  updateOwner,
  getUnassignedStations,
  assignStationsToOwner,
  getOwnerStations,
  unassignStationsFromOwner
};
