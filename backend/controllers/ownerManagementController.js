/**
 * Owner Management Controller
 * Admin-level endpoints for managing station owners
 */

const ownerManagementService = require('../services/ownerManagementService');
const logger = require('../utils/logger');

/**
 * GET /api/admin/owners
 * List all owners with station counts
 */
async function getAllOwners(req, res) {
  try {
    const owners = await ownerManagementService.getAllOwners();
    res.json({
      success: true,
      data: owners,
      count: owners.length
    });
  } catch (error) {
    logger.error('Error fetching owners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch owners',
      error: error.message
    });
  }
}

/**
 * GET /api/admin/owners/:id
 * Get a single owner by ID
 */
async function getOwnerById(req, res) {
  try {
    const { id } = req.params;
    const owner = await ownerManagementService.getOwnerById(id);
    
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }
    
    // Get assigned stations
    const stations = await ownerManagementService.getOwnerStations(id);
    
    res.json({
      success: true,
      data: {
        ...owner,
        stations
      }
    });
  } catch (error) {
    logger.error('Error fetching owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch owner',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/owners
 * Create a new owner
 */
async function createOwner(req, res) {
  try {
    const { name, domain, email, contact_person, phone, theme_config, station_ids } = req.body;
    
    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        message: 'Name and domain are required'
      });
    }
    
    // Create the owner
    const owner = await ownerManagementService.createOwner({
      name,
      domain,
      email,
      contact_person,
      phone,
      theme_config
    });
    
    // Assign stations if provided
    let assignedStations = [];
    if (station_ids && station_ids.length > 0) {
      assignedStations = await ownerManagementService.assignStationsToOwner(owner.id, station_ids);
    }
    
    res.status(201).json({
      success: true,
      message: 'Owner created successfully',
      data: {
        ...owner,
        stations: assignedStations
      },
      portal_url: `https://${owner.domain}.fuelfinder.com`
    });
  } catch (error) {
    logger.error('Error creating owner:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create owner'
    });
  }
}

/**
 * PUT /api/admin/owners/:id
 * Update an existing owner
 */
async function updateOwner(req, res) {
  try {
    const { id } = req.params;
    const { name, domain, email, contact_person, phone, theme_config, is_active } = req.body;
    
    const owner = await ownerManagementService.updateOwner(id, {
      name,
      domain,
      email,
      contact_person,
      phone,
      theme_config,
      is_active
    });
    
    res.json({
      success: true,
      message: 'Owner updated successfully',
      data: owner
    });
  } catch (error) {
    logger.error('Error updating owner:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update owner'
    });
  }
}

/**
 * GET /api/admin/stations/unassigned
 * Get stations with no owner assigned
 */
async function getUnassignedStations(req, res) {
  try {
    const stations = await ownerManagementService.getUnassignedStations();
    res.json({
      success: true,
      data: stations,
      count: stations.length
    });
  } catch (error) {
    logger.error('Error fetching unassigned stations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned stations',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/owners/:id/stations
 * Assign stations to an owner
 */
async function assignStations(req, res) {
  try {
    const { id } = req.params;
    const { station_ids } = req.body;
    
    if (!station_ids || !Array.isArray(station_ids)) {
      return res.status(400).json({
        success: false,
        message: 'station_ids array is required'
      });
    }
    
    const stations = await ownerManagementService.assignStationsToOwner(id, station_ids);
    
    res.json({
      success: true,
      message: `Assigned ${stations.length} station(s) to owner`,
      data: stations
    });
  } catch (error) {
    logger.error('Error assigning stations:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign stations'
    });
  }
}

/**
 * DELETE /api/admin/owners/:id/stations
 * Unassign stations from an owner
 */
async function unassignStations(req, res) {
  try {
    const { station_ids } = req.body;
    
    if (!station_ids || !Array.isArray(station_ids)) {
      return res.status(400).json({
        success: false,
        message: 'station_ids array is required'
      });
    }
    
    const stations = await ownerManagementService.unassignStationsFromOwner(station_ids);
    
    res.json({
      success: true,
      message: `Unassigned ${stations.length} station(s)`,
      data: stations
    });
  } catch (error) {
    logger.error('Error unassigning stations:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to unassign stations'
    });
  }
}

/**
 * POST /api/admin/owners/:id/logo
 * Upload logo for an owner
 */
async function uploadOwnerLogo(req, res) {
  try {
    const { id } = req.params;
    const { logo } = req.body; // { base64: string, filename: string }
    
    if (!logo || !logo.base64) {
      return res.status(400).json({
        success: false,
        message: 'Logo base64 data is required'
      });
    }
    
    // Verify owner exists
    const owner = await ownerManagementService.getOwnerById(id);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }
    
    // Import imageService dynamically to avoid circular deps
    const imageService = require('../services/imageService');
    
    // Validate base64 data
    if (!imageService.validateBase64Image(logo.base64)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid base64 image data'
      });
    }
    
    // Process and upload image
    const imageResult = await imageService.processBase64Image(
      logo.base64,
      logo.filename || 'logo.jpg',
      'owner'  // targetType for folder organization
    );
    
    // Update owner's theme_config with logo URL
    const themeConfig = owner.theme_config || {};
    themeConfig.logoUrl = imageResult.imageUrl;
    
    const updatedOwner = await ownerManagementService.updateOwner(id, {
      theme_config: themeConfig
    });
    
    logger.info(`Uploaded logo for owner ${owner.name}: ${imageResult.imageUrl}`);
    
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: imageResult.imageUrl,
        thumbnailUrl: imageResult.thumbnailUrl,
        owner: updatedOwner
      }
    });
  } catch (error) {
    logger.error('Error uploading owner logo:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload logo'
    });
  }
}

module.exports = {
  getAllOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  getUnassignedStations,
  assignStations,
  unassignStations,
  uploadOwnerLogo
};

