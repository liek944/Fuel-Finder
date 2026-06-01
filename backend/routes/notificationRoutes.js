const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { detectOwner, requireOwner } = require('../middleware/ownerDetection');
const { verifyOwnerApiKey } = require('../middleware/ownerAuth');

// Apply owner authentication middleware
router.use(detectOwner);
router.use(requireOwner);
router.use(verifyOwnerApiKey);

/**
 * Get all notifications for the authenticated owner
 */
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerData.id;
    
    const query = `
      SELECT * FROM owner_notifications 
      WHERE owner_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    const result = await pool.query(query, [ownerId]);
    
    res.json({
      success: true,
      notifications: result.rows
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Get unread notification count for the authenticated owner
 */
router.get('/unread-count', async (req, res) => {
  try {
    const ownerId = req.ownerData.id;
    
    const query = `
      SELECT COUNT(*) as count FROM owner_notifications 
      WHERE owner_id = $1 AND is_read = false
    `;
    const result = await pool.query(query, [ownerId]);
    
    res.json({
      success: true,
      count: parseInt(result.rows[0].count, 10)
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Mark a notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.ownerData.id;
    
    // Ensure the notification belongs to this owner
    const query = `
      UPDATE owner_notifications 
      SET is_read = true 
      WHERE id = $1 AND owner_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [id, ownerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.json({
      success: true,
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
