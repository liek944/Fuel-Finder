# Brand API - Sample Route Implementations

## Admin Routes for Brand Management

```javascript
// /backend/routes/admin.js

const express = require('express');
const router = express.Router();
const pool = require('../database/db').pool;
const { createApiKey, revokeApiKey } = require('../utils/apiKeyManager');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

function requireAdminKey(req, res, next) {
  const apiKey = req.header('x-api-key');
  if (!ADMIN_API_KEY || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Create brand
router.post('/brands', requireAdminKey, async (req, res) => {
  try {
    const { name, display_name, contact_email, webhook_url } = req.body;
    
    const result = await pool.query(
      `INSERT INTO brands (name, display_name, contact_email, webhook_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, display_name, contact_email, webhook_url]
    );
    
    res.status(201).json({ success: true, brand: result.rows[0] });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Generate API key for brand
router.post('/brands/:brandId/api-keys', requireAdminKey, async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name, permission_level, permissions, rate_limit_per_hour } = req.body;
    
    const keyData = await createApiKey({
      brandId: parseInt(brandId),
      name,
      permissionLevel: permission_level || 'brand_moderator',
      permissions: permissions || {},
      rateLimitPerHour: rate_limit_per_hour || 1000,
      createdBy: 'admin'
    });
    
    res.status(201).json({
      success: true,
      api_key: keyData.plainKey, // ⚠️ Show only once
      key_id: keyData.keyId,
      key_prefix: keyData.keyPrefix,
      warning: 'Store this key securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Revoke API key
router.delete('/api-keys/:keyId', requireAdminKey, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { reason } = req.body;
    
    await revokeApiKey(keyId, 'admin', reason);
    
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

module.exports = router;
```

## Integration with server.js

```javascript
// Add to /backend/server.js

const adminRoutes = require('./routes/admin');
const brandRoutes = require('./routes/brand');
const analyticsRoutes = require('./routes/analytics');

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/analytics', analyticsRoutes);
```

## Example Webhook Handler

```javascript
// /backend/utils/webhooks.js

const axios = require('axios');
const crypto = require('crypto');

async function sendWebhook(brandId, eventType, payload) {
  try {
    // Get brand webhook config
    const pool = require('../database/db').pool;
    const result = await pool.query(
      'SELECT webhook_url, webhook_secret FROM brands WHERE id = $1 AND webhook_url IS NOT NULL',
      [brandId]
    );
    
    if (result.rows.length === 0) {
      console.log(`No webhook configured for brand ${brandId}`);
      return;
    }
    
    const { webhook_url, webhook_secret } = result.rows[0];
    
    const webhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload
    };
    
    // Sign payload
    const signature = crypto
      .createHmac('sha256', webhook_secret || 'default_secret')
      .update(JSON.stringify(webhookPayload))
      .digest('hex');
    
    // Send webhook
    await axios.post(webhook_url, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-FuelFinder-Signature': signature,
        'X-FuelFinder-Event': eventType
      },
      timeout: 5000
    });
    
    console.log(`✅ Webhook sent to brand ${brandId}: ${eventType}`);
  } catch (error) {
    console.error(`❌ Webhook error for brand ${brandId}:`, error.message);
  }
}

module.exports = { sendWebhook };
```

## Testing with cURL

```bash
# 1. Create brand (admin)
curl -X POST http://localhost:3001/api/admin/brands \
  -H "x-api-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shell",
    "display_name": "Shell Philippines",
    "contact_email": "api@shell.com.ph",
    "webhook_url": "https://shell.com.ph/webhooks"
  }'

# 2. Generate API key (admin)
curl -X POST http://localhost:3001/api/admin/brands/1/api-keys \
  -H "x-api-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shell Production Key",
    "permission_level": "brand_moderator",
    "permissions": {
      "canVerifyReports": true,
      "canViewAnalytics": true
    },
    "rate_limit_per_hour": 5000
  }'

# 3. Get brand stations (brand key)
curl http://localhost:3001/api/brand/stations \
  -H "x-api-key: fuelffdr_prod_shell_..."

# 4. Verify price report (brand key)
curl -X PATCH http://localhost:3001/api/brand/price-reports/123/verify \
  -H "x-api-key: fuelffdr_prod_shell_..." \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": true,
    "apply_to_official_price": true,
    "notes": "Verified by Shell admin"
  }'
```
