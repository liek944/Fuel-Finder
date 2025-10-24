#!/bin/bash
# Deploy Services Field Fix
# Fixes newly created station markers not displaying services

echo "🚀 Deploying Services Field Fix..."
echo ""
echo "This fix adds the missing 'services' field to the station creation payload."
echo "Previously, services were being collected via checkboxes but not sent to the backend."
echo ""

# Build frontend
echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🌐 The frontend has been built to the build/ directory."
echo ""
echo "📋 Next steps:"
echo "   1. Deploy build/ directory to your hosting service (Netlify, Vercel, etc.)"
echo "   2. Test by creating a new station with services selected"
echo "   3. Verify services appear in the station marker popup"
echo ""
echo "🐛 What was fixed:"
echo "   - Added payload.services = formServices to submitStationForm()"
echo "   - Services are now properly sent when creating new stations"
echo "   - Previously created stations are unaffected (they have empty services)"
echo ""
