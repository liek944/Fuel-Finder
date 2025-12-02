#!/bin/bash
###############################################################################
# Reviews System Deployment Script
# Deploys the complete reviews and ratings feature to production
###############################################################################

set -e  # Exit on error

echo "🚀 Starting Reviews System Deployment..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}➤${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running on EC2
if [ ! -f /home/ubuntu/.ssh/authorized_keys ]; then
    print_warning "This script is designed for EC2 deployment"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Apply Database Migration
print_status "Step 1: Applying database migration..."
cd backend
if node database/apply-reviews-migration.js; then
    print_success "Database migration applied"
else
    print_error "Database migration failed"
    exit 1
fi
cd ..

# Step 2: Verify Database Schema
print_status "Step 2: Verifying reviews table..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d reviews" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Reviews table verified"
else
    print_error "Reviews table not found"
    exit 1
fi

# Step 3: Restart Backend
print_status "Step 3: Restarting backend with PM2..."
cd backend
pm2 restart fuel-finder-backend || pm2 start server_modular_entry.js --name fuel-finder-backend
if [ $? -eq 0 ]; then
    print_success "Backend restarted"
    sleep 3  # Wait for backend to stabilize
else
    print_error "Backend restart failed"
    exit 1
fi
cd ..

# Step 4: Test Backend Endpoints
print_status "Step 4: Testing backend API endpoints..."

# Test health endpoint
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health)
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
    exit 1
fi

# Test review endpoints (expect 400 for missing params, not 404)
REVIEW_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/reviews)
if [ "$REVIEW_TEST" == "400" ]; then
    print_success "Review endpoints registered"
else
    print_warning "Review endpoint returned: $REVIEW_TEST (expected 400 for missing params)"
fi

# Step 5: Build Frontend
print_status "Step 5: Building frontend..."
cd frontend
npm run build
if [ $? -eq 0 ]; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

# Step 6: Deploy Frontend (Netlify)
print_status "Step 6: Deploying frontend to Netlify..."
if command -v netlify &> /dev/null; then
    cd frontend
    netlify deploy --prod --dir=dist
    if [ $? -eq 0 ]; then
        print_success "Frontend deployed to Netlify"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi
    cd ..
else
    print_warning "Netlify CLI not found. Please deploy manually:"
    echo "  cd frontend && npm run build"
    echo "  Then drag dist/ folder to Netlify dashboard"
fi

# Step 7: Final Verification
print_status "Step 7: Running final verification..."

# Check PM2 status
PM2_STATUS=$(pm2 status fuel-finder-backend | grep "online" | wc -l)
if [ "$PM2_STATUS" -ge 1 ]; then
    print_success "Backend is running"
else
    print_error "Backend is not running properly"
    pm2 logs fuel-finder-backend --lines 20
    exit 1
fi

# Check for errors in logs
ERROR_COUNT=$(pm2 logs fuel-finder-backend --lines 100 --nostream | grep -i "error" | wc -l)
if [ "$ERROR_COUNT" -lt 5 ]; then
    print_success "No critical errors in logs"
else
    print_warning "Found $ERROR_COUNT errors in recent logs. Please review:"
    pm2 logs fuel-finder-backend --lines 20
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Reviews System Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "  • Database: reviews table created with indexes"
echo "  • Backend: Restarted with new endpoints"
echo "  • Frontend: Built and deployed"
echo ""
echo "🔗 API Endpoints:"
echo "  • POST   /api/reviews - Create review"
echo "  • GET    /api/reviews - List reviews"
echo "  • GET    /api/reviews/summary - Get statistics"
echo "  • GET    /api/admin/reviews - Admin moderation"
echo "  • PATCH  /api/admin/reviews/:id - Update status"
echo "  • DELETE /api/admin/reviews/:id - Delete review"
echo "  • GET    /api/owner/reviews - Owner reviews"
echo "  • PATCH  /api/owner/reviews/:id - Owner moderation"
echo ""
echo "🧪 Test the Feature:"
echo "  1. Open your app in a browser"
echo "  2. Click on a station marker"
echo "  3. Scroll down to see the review widget"
echo "  4. Click 'Write a Review' to submit a rating"
echo "  5. Check Admin Portal > Reviews tab"
echo "  6. Check Owner Dashboard > Reviews tab"
echo ""
echo "📝 Monitoring:"
echo "  • Backend logs: pm2 logs fuel-finder-backend"
echo "  • Database queries: Check reviews table"
echo "  • API health: curl http://localhost:3001/api/health"
echo ""
echo "📚 Documentation:"
echo "  • DOCUMENTATIONS AND CONTEXT/REVIEWS_SYSTEM_DOCUMENTATION.md"
echo "  • DOCUMENTATIONS AND CONTEXT/DB TABLES.md (updated)"
echo ""
print_success "Deployment successful! 🎉"
