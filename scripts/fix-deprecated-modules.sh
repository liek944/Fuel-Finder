#!/bin/bash
# Conservative Dependency Update Script
# This script implements Option 1 from the migration plan

set -e

echo "🚀 Starting conservative dependency updates..."

# Backup current package.json
cp package.json package.json.backup
echo "✅ Backed up package.json"

# Update package.json with safer versions
echo "📦 Updating package.json with compatible versions..."

# Create temporary package.json with updated versions
cat > package.json.tmp << 'EOF'
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.5.2",
    "@turf/simplify": "^7.2.0",
    "@turf/turf": "^7.2.0",
    "@types/jest": "^29.5.14",
    "@types/leaflet": "^1.9.20",
    "@types/node": "^20.17.11",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "leaflet": "^1.9.4",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-leaflet": "^5.0.0",
    "react-router-dom": "^7.9.1",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.5",
    "web-vitals": "^3.5.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "sharp": "^0.34.4"
  }
}
EOF

# Replace package.json with updated version
mv package.json.tmp package.json
echo "✅ Updated package.json"

# Clean install
echo "🧹 Cleaning node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "📥 Installing updated dependencies..."
npm install

# Test build
echo "🔨 Testing build..."
if npm run build; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Reverting changes..."
    mv package.json.backup package.json
    npm install
    exit 1
fi

# Run audit (informational only)
echo "🔍 Running security audit..."
npm audit || echo "⚠️  Security vulnerabilities detected (see migration plan for solutions)"

echo ""
echo "🎉 Conservative updates completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "  • @testing-library/user-event: updated to ^14.5.2"
echo "  • @types/jest: updated to ^29.5.14"
echo "  • @types/node: updated to ^20.17.11" 
echo "  • web-vitals: updated to ^3.5.2"
echo ""
echo "⚠️  Note: Security vulnerabilities remain due to react-scripts 5.0.1"
echo "📖 See DEPRECATED_MODULES_MIGRATION_PLAN.md for long-term solutions"
echo ""
echo "🗑️  Backup saved as: package.json.backup"