#!/bin/bash
# Deploy Visual Alerts Feature
# Converts visual notifications from browser notifications to in-app UI alerts

set -e

echo "======================================"
echo "Visual Alerts Feature Deployment"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from frontend directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building frontend..."
npm run build

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📋 Changes included:"
echo "   ✓ New VisualAlert component with animations"
echo "   ✓ In-app alerts replace browser notifications"
echo "   ✓ Beautiful gradient UI at top-center of map"
echo "   ✓ Confirmation alert when enabled"
echo "   ✓ Settings button updated (Visual alerts)"
echo ""
echo "🎯 Alert Types:"
echo "   • 500m: 🎯 Destination nearby"
echo "   • 200m: 🚗 Approaching destination"
echo "   • 100m: 📍 Almost there!"
echo "   • 20m:  🎉 You have arrived!"
echo ""
echo "📱 Features:"
echo "   • Slide-in animations with bounce effect"
echo "   • Auto-dismiss after 5 seconds"
echo "   • Click to dismiss instantly"
echo "   • Mobile responsive design"
echo "   • No browser permissions needed"
echo ""
echo "🚀 Next Steps:"
echo "   1. Test locally: npm run dev"
echo "   2. Deploy build/ directory to Netlify"
echo "   3. Test visual alerts in production"
echo ""
echo "📖 Documentation: ../VISUAL_ALERTS_FEATURE.md"
echo ""
echo "======================================"
echo "✅ DEPLOYMENT READY"
echo "======================================"
