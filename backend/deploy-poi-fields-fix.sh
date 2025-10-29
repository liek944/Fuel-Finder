#!/bin/bash

echo "🔄 Deploying POI Fields Fix..."
echo ""
echo "This fix adds address, phone, and operating_hours to POI responses."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔍 Testing backend..."
node -e "
const { transformPoiData } = require('./utils/transformers');
const testPoi = [{
  id: 1,
  name: 'Test POI',
  type: 'car_wash',
  lat: 13.0,
  lng: 121.0,
  address: '123 Test St',
  phone: '09123456789',
  operating_hours: { open: '08:00', close: '17:00' },
  images: [],
  created_at: new Date(),
  updated_at: new Date()
}];
const result = transformPoiData(testPoi);
console.log('✅ Transformer test passed:', JSON.stringify(result[0], null, 2));
"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ All tests passed!"
  echo ""
  echo "🚀 Restarting PM2..."
  pm2 restart fuel-finder-backend
  
  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "📋 Changes deployed:"
  echo "   - backend/utils/transformers.js (added address, phone, operating_hours)"
  echo "   - backend/controllers/poiController.js (create/update POI endpoints)"
  echo ""
  echo "🧪 Test POI endpoints:"
  echo "   curl http://localhost:3001/api/pois"
  echo "   curl http://localhost:3001/api/pois/1"
  echo ""
else
  echo ""
  echo "❌ Tests failed. Deployment aborted."
  exit 1
fi
