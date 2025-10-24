#!/bin/bash

# Deploy Owner Portal to Netlify
# This script builds and deploys the frontend with owner portal support

set -e

echo "🚀 Deploying Owner Portal to Netlify"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Navigate to frontend
cd frontend

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building production bundle..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📤 Now deploying to Netlify..."
echo ""
echo "Choose deployment method:"
echo "  1) Deploy with Netlify CLI (if installed)"
echo "  2) Manual deployment (GitHub/Netlify dashboard)"
echo ""

read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    # Check if Netlify CLI is installed
    if command -v netlify &> /dev/null; then
        echo ""
        echo "🌐 Deploying to Netlify..."
        netlify deploy --prod --dir=dist
        echo ""
        echo "✅ Deployment complete!"
    else
        echo ""
        echo "⚠️  Netlify CLI not found. Install with:"
        echo "   npm install -g netlify-cli"
        echo ""
        echo "Or deploy manually via GitHub/Netlify dashboard"
    fi
else
    echo ""
    echo "📋 Manual Deployment Steps:"
    echo ""
    echo "1. Push your code to GitHub"
    echo "2. Go to https://netlify.com"
    echo "3. Click 'Add new site' → 'Import from Git'"
    echo "4. Select your repository"
    echo "5. Configure build settings:"
    echo "   - Build command: npm run build"
    echo "   - Publish directory: dist"
    echo "   - Base directory: frontend"
    echo ""
    echo "6. Add environment variable:"
    echo "   VITE_API_BASE_URL=https://fuelfinder.duckdns.org"
    echo ""
    echo "7. Configure custom domain (optional):"
    echo "   - Add domain: ifuel-dangay.fuelfinder.com"
    echo "   - Follow DNS instructions from Netlify"
    echo ""
fi

echo ""
echo "🎉 Next Steps:"
echo ""
echo "1. Configure DNS to point to your Netlify site"
echo "2. Test owner portal: https://ifuel-dangay.YOUR-SITE.com"
echo "3. Login with API key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I="
echo ""
echo "📚 See OWNER_PORTAL_SETUP_GUIDE.md for detailed instructions"
echo ""
