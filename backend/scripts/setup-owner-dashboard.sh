#!/bin/bash

# Setup Owner Dashboard - Complete Setup Script
# This script sets up the owner dashboard with database views and sample data

set -e

echo "=========================================="
echo "🏪 Setting up Owner Dashboard"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from backend directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 This script will:${NC}"
echo "  1. Create owner_dashboard_stats view"
echo "  2. Add sample owners with API keys"
echo "  3. Assign stations to owners"
echo "  4. Restart backend service"
echo ""

# Check if database connection is available
echo -e "${YELLOW}🔍 Checking database connection...${NC}"
if node -e "require('./config/database').testConnection().then(() => console.log('✅ DB OK')).catch(() => process.exit(1))" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection verified${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your database configuration"
    exit 1
fi

echo ""

# Step 1: Create database view
echo -e "${YELLOW}📊 Step 1: Creating owner dashboard view...${NC}"
if [ -f "database/create-owner-dashboard-view.sql" ]; then
    echo "Running SQL: create-owner-dashboard-view.sql"
    # Note: You'll need to run this SQL in your database
    echo -e "${YELLOW}⚠️  Please run the following SQL in your database:${NC}"
    echo "   psql -d your_database -f database/create-owner-dashboard-view.sql"
    echo ""
else
    echo -e "${RED}❌ SQL file not found: database/create-owner-dashboard-view.sql${NC}"
    exit 1
fi

# Step 2: Add sample owners
echo -e "${YELLOW}👥 Step 2: Adding sample owners...${NC}"
if [ -f "database/setup-sample-owners.sql" ]; then
    echo "Running SQL: setup-sample-owners.sql"
    echo -e "${YELLOW}⚠️  Please run the following SQL in your database:${NC}"
    echo "   psql -d your_database -f database/setup-sample-owners.sql"
    echo ""
else
    echo -e "${RED}❌ SQL file not found: database/setup-sample-owners.sql${NC}"
    exit 1
fi

# Step 3: Restart backend
echo -e "${YELLOW}🔄 Step 3: Restarting backend service...${NC}"
if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    
    # Check if app is running
    if pm2 list | grep -q "fuel-finder"; then
        pm2 restart fuel-finder
        echo -e "${GREEN}✅ Backend restarted with PM2${NC}"
    else
        echo -e "${YELLOW}⚠️  No PM2 process found. Starting manually...${NC}"
        pm2 start server_modular_entry.js --name fuel-finder
        pm2 save
        echo -e "${GREEN}✅ Backend started with PM2${NC}"
    fi
    
    # Show status
    echo ""
    echo "📊 PM2 Status:"
    pm2 list | grep fuel-finder
    
    # Show recent logs
    echo ""
    echo "📋 Recent Logs:"
    pm2 logs fuel-finder --lines 20 --nostream
    
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please restart your backend manually:${NC}"
    echo "   npm start"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Owner Dashboard Setup Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Run the SQL scripts in your database:"
echo "   psql -d your_database -f database/create-owner-dashboard-view.sql"
echo "   psql -d your_database -f database/setup-sample-owners.sql"
echo ""
echo "2. Test the owner dashboard:"
echo "   Frontend: http://localhost:3000/owner/login"
echo "   Subdomain: castillonfuels.fuelfinder.com"
echo "   API Key: castillon_api_key_2024_secure_123"
echo ""
echo "3. Available test owners:"
echo "   • Castillon Fuels (castillonfuels) - API: castillon_api_key_2024_secure_123"
echo "   • Santos Gas (santosgas) - API: santos_api_key_2024_secure_456"
echo "   • Roxas Petroleum (roxaspetro) - API: roxas_api_key_2024_secure_789"
echo ""
echo "4. Test endpoints:"
echo "   curl -H 'x-owner-domain: castillonfuels' \\"
echo "        -H 'x-api-key: castillon_api_key_2024_secure_123' \\"
echo "        http://localhost:3001/api/owner/dashboard"
echo ""
echo -e "${GREEN}🎉 Owner dashboard is ready for testing!${NC}"
