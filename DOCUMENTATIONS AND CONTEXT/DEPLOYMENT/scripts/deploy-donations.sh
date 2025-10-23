#!/bin/bash
# Quick deployment script for donation feature

echo "🚀 Deploying Donation System to EC2..."
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Commit changes
echo -e "${YELLOW}📝 Committing changes...${NC}"
git add backend/server.js backend/database/db.js backend/services/paymentService.js
git add backend/database/migrations/002_add_donations.sql
git add frontend/src/components/DonationWidget.tsx frontend/src/components/DonationWidget.css
git add "DOCUMENTATIONS AND CONTEXT"/*.md
git add backend/.env.production

git commit -m "feat: Add donation system with PayMongo integration

- Database migration for donations and impact tracking
- PayMongo payment service integration
- 8 API endpoints (6 public, 2 admin)
- React donation widget with beautiful UI
- Webhook handler for automatic status updates
- Comprehensive documentation"

# Step 2: Push to repository
echo -e "${YELLOW}⬆️  Pushing to GitHub...${NC}"
git push origin main

# Step 3: SSH and deploy
echo -e "${YELLOW}🔌 Connecting to EC2 and deploying...${NC}"
echo ""
echo "Run these commands on your EC2 instance:"
echo "============================================"
echo "cd ~/Fuel-FInder"
echo "git pull origin main"
echo "cd backend"
echo "pm2 restart all"
echo "pm2 logs --lines 20"
echo "============================================"
echo ""
echo -e "${GREEN}✅ Local changes committed and pushed!${NC}"
echo -e "${YELLOW}⚠️  Now SSH into your EC2 and run the commands above${NC}"
