#!/bin/bash
# Fix Owner Dashboard Issues
# Run this script on your backend server

echo "🔧 Fixing Owner Dashboard Issues..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to backend directory
cd "$(dirname "$0")"

echo ""
echo "${YELLOW}Step 1: Applying database fixes...${NC}"
echo "This will:"
echo "  - Add reporter_name column to fuel_price_reports"
echo "  - Update owner_dashboard_stats view to exclude auth logs"
echo ""

# Apply the database fix
node -e "
const { pool } = require('./config/database');
const fs = require('fs');

async function applyFix() {
  try {
    console.log('📊 Reading SQL fix script...');
    const sql = fs.readFileSync('./database/fix-owner-dashboard.sql', 'utf8');
    
    console.log('🔄 Executing SQL fixes...');
    await pool.query(sql);
    
    console.log('✅ Database fixes applied successfully!');
    
    // Verify the fix
    const result = await pool.query('SELECT * FROM owner_dashboard_stats LIMIT 1');
    console.log('');
    console.log('📊 Sample dashboard stats:');
    console.log(result.rows[0]);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying fixes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

applyFix();
"

if [ $? -eq 0 ]; then
    echo ""
    echo "${GREEN}Step 2: Restarting backend service...${NC}"
    
    # Check if PM2 is being used
    if command -v pm2 &> /dev/null; then
        echo "Using PM2..."
        pm2 restart fuelfinder-backend || pm2 restart all
        pm2 logs --lines 50
    else
        echo "${YELLOW}PM2 not found. Please manually restart your backend service.${NC}"
    fi
    
    echo ""
    echo "${GREEN}================================================${NC}"
    echo "${GREEN}✅ Owner Dashboard fixes applied successfully!${NC}"
    echo "${GREEN}================================================${NC}"
    echo ""
    echo "Fixed issues:"
    echo "  ✅ Total Actions counter no longer increments on refresh"
    echo "  ✅ Stations tab now loads correctly (image schema fixed)"
    echo "  ✅ Reporter name now displays in price reports"
    echo "  ✅ View excludes auth logs from activity count"
    echo ""
    echo "Test the dashboard at: https://ifuel-dangay-portal.netlify.app"
else
    echo ""
    echo "${RED}================================================${NC}"
    echo "${RED}❌ Fix failed! Please check the error above.${NC}"
    echo "${RED}================================================${NC}"
    exit 1
fi
