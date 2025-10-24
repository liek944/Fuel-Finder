#!/bin/bash
# Automated Cleanup Script for Deprecated Files
# Post-Modularization Cleanup
# Created: October 24, 2025
# Audit Reference: DEPRECATED_FILES_AUDIT.md

# Note: We don't use 'set -e' because we want to continue even if some files don't exist

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
MOVED_COUNT=0
ARCHIVED_COUNT=0
DUPLICATE_COUNT=0

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Fuel Finder - Deprecated Files Cleanup Script          ║${NC}"
echo -e "${CYAN}║  Post-Modularization Organization                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to create backup
create_backup() {
    echo -e "${YELLOW}📦 Creating backup...${NC}"
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup files that will be moved
    cp -r DOCUMENTATIONS\ AND\ CONTEXT "$BACKUP_DIR/" 2>/dev/null || true
    cp *.md "$BACKUP_DIR/" 2>/dev/null || true
    cp *.sh "$BACKUP_DIR/" 2>/dev/null || true
    cp backend/*.sh "$BACKUP_DIR/" 2>/dev/null || true
    cp frontend/*.sh "$BACKUP_DIR/" 2>/dev/null || true
    
    echo -e "${GREEN}✓ Backup created: $BACKUP_DIR${NC}"
    echo ""
}

# Function to move file with git tracking
move_file() {
    local src="$1"
    local dest_dir="$2"
    
    if [ -f "$src" ]; then
        # Create destination directory if it doesn't exist
        mkdir -p "$dest_dir"
        
        # Use git mv if in git repo, otherwise regular mv
        if git rev-parse --git-dir > /dev/null 2>&1; then
            git mv "$src" "$dest_dir/" 2>/dev/null || mv "$src" "$dest_dir/"
        else
            mv "$src" "$dest_dir/"
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓${NC} $(basename "$src")"
            return 0
        else
            echo -e "  ${RED}✗${NC} Failed: $(basename "$src")"
            return 1
        fi
    else
        echo -e "  ${YELLOW}⊘${NC} Not found: $(basename "$src")"
        return 2
    fi
}

# Function to check if file exists and is not duplicate
check_duplicate() {
    local file="$1"
    local target_dir="$2"
    local filename=$(basename "$file")
    
    if [ -f "$target_dir/$filename" ]; then
        # Files exist in both locations - check if identical
        if cmp -s "$file" "$target_dir/$filename"; then
            echo -e "  ${MAGENTA}≈${NC} Duplicate (identical): $filename"
            return 0  # Is duplicate
        else
            echo -e "  ${YELLOW}⚠${NC}  Different versions: $filename"
            return 1  # Different files
        fi
    fi
    return 2  # Not a duplicate
}

# Create necessary directories
echo -e "${BLUE}[Setup] Creating directory structure...${NC}"
mkdir -p "DOCUMENTATIONS AND CONTEXT/FIXES"
mkdir -p "DOCUMENTATIONS AND CONTEXT/ARCHIVE"
mkdir -p "DOCUMENTATIONS AND CONTEXT/ARCHIVE/scripts"
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  This script will:${NC}"
echo "  1. Create a timestamped backup"
echo "  2. Move 17 fix documentation files to DOCUMENTATIONS/FIXES/"
echo "  3. Archive 22 deployment scripts to ARCHIVE/scripts/"
echo "  4. Remove 3 duplicate files from root"
echo ""
echo -e "${YELLOW}Total files to be reorganized: ~42${NC}"
echo ""
read -p "$(echo -e ${CYAN}Continue with cleanup? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cleanup cancelled.${NC}"
    exit 0
fi

# Create backup first
create_backup

# ========================================
# PHASE 1: Move Fix Documentation to FIXES/
# ========================================
echo -e "${BLUE}[Phase 1/4] Moving Fix Documentation to FIXES/...${NC}"

FIX_DOCS=(
    "PRICE_DISPLAY_FIX.md"
    "PRICE_STATS_FIX.md"
    "ALL_FIXES_SUMMARY.md"
    "ALL_BUGS_FIXED.md"
    "SERVICES_FIX_DOCUMENTATION.md"
    "IMAGE_FIX_SUMMARY.md"
    "IMAGE_UPLOAD_AND_POI_TYPE_FIX.md"
    "IMAGE_DUPLICATION_FIX_CORRECTED.md"
    "REAL_ANALYTICS_INTEGRATION.md"
    "FINAL_DATABASE_FIXES.md"
    "EMERGENCY_FIX_500_ERRORS.md"
    "COMPLETE_MARKER_FIX.md"
    "QUICK_FIX_SUMMARY.md"
    "PRICE_REPORTING_FIX.md"
    "IMAGE_DUPLICATION_FIX.md"
    "OWNER_DASHBOARD_IMPLEMENTATION_PLAN.md"
    "POTENTIAL_BUGS_FOUND.md"
    "ADMIN_ANALYTICS_FIX.md"
)

for doc in "${FIX_DOCS[@]}"; do
    if move_file "$doc" "DOCUMENTATIONS AND CONTEXT/FIXES"; then
        ((MOVED_COUNT++))
    fi
done

echo ""

# ========================================
# PHASE 2: Archive Obsolete Documentation
# ========================================
echo -e "${BLUE}[Phase 2/4] Archiving Obsolete Documentation...${NC}"

OBSOLETE_DOCS=(
    "URGENT_DEPLOY_NOW.md"
    "QUICK_DEPLOY_INSTRUCTIONS.md"
)

for doc in "${OBSOLETE_DOCS[@]}"; do
    if move_file "$doc" "DOCUMENTATIONS AND CONTEXT/ARCHIVE"; then
        ((ARCHIVED_COUNT++))
    fi
done

echo ""

# ========================================
# PHASE 3: Archive Deployment Scripts
# ========================================
echo -e "${BLUE}[Phase 3/4] Archiving Deployment Scripts...${NC}"

# Root deployment scripts
ROOT_SCRIPTS=(
    "cleanup-docs.sh"
    "deploy-verify-fix.sh"
    "deploy-price-chart-fix.sh"
    "deploy-complete-fix.sh"
)

echo -e "${CYAN}  Root scripts:${NC}"
for script in "${ROOT_SCRIPTS[@]}"; do
    if move_file "$script" "DOCUMENTATIONS AND CONTEXT/ARCHIVE/scripts"; then
        ((ARCHIVED_COUNT++))
    fi
done

# Backend deployment scripts
BACKEND_SCRIPTS=(
    "backend/deploy-all-bug-fixes.sh"
    "backend/deploy-price-reports-fix.sh"
    "backend/deploy-image-and-poi-fix.sh"
    "backend/deploy-real-analytics.sh"
    "backend/apply-emergency-fix.sh"
    "backend/deploy-rate-limit-fix.sh"
    "backend/deploy-final-fixes.sh"
    "backend/deploy-multi-owner-fixes.sh"
    "backend/deploy-price-stats-fix.sh"
    "backend/deploy-image-fix-urgent.sh"
    "backend/deploy-admin-analytics-fix.sh"
    "backend/restart-with-fix.sh"
    "backend/deploy-image-duplication-fix.sh"
    "backend/diagnose-triple-upload.sh"
)

echo -e "${CYAN}  Backend scripts:${NC}"
for script in "${BACKEND_SCRIPTS[@]}"; do
    if move_file "$script" "DOCUMENTATIONS AND CONTEXT/ARCHIVE/scripts"; then
        ((ARCHIVED_COUNT++))
    fi
done

# Frontend deployment scripts
FRONTEND_SCRIPTS=(
    "frontend/deploy-services-fix.sh"
    "frontend/deploy-price-fix.sh"
)

echo -e "${CYAN}  Frontend scripts:${NC}"
for script in "${FRONTEND_SCRIPTS[@]}"; do
    if move_file "$script" "DOCUMENTATIONS AND CONTEXT/ARCHIVE/scripts"; then
        ((ARCHIVED_COUNT++))
    fi
done

echo ""

# ========================================
# PHASE 4: Handle Duplicates
# ========================================
echo -e "${BLUE}[Phase 4/4] Handling Duplicate Files...${NC}"

# Check for duplicates and remove if identical
DUPLICATES=(
    "ADMIN_DASHBOARD_FIXES_OCT24.md:DOCUMENTATIONS AND CONTEXT"
    "VERIFY_ROUTE_FIX.md:DOCUMENTATIONS AND CONTEXT"
    "PRICE_CHART_FIX.md:DOCUMENTATIONS AND CONTEXT"
)

for dup in "${DUPLICATES[@]}"; do
    IFS=':' read -r file target_dir <<< "$dup"
    
    if [ -f "$file" ]; then
        check_duplicate "$file" "$target_dir"
        result=$?
        
        if [ $result -eq 0 ]; then
            # Identical duplicate - safe to remove
            if git rev-parse --git-dir > /dev/null 2>&1; then
                git rm "$file" 2>/dev/null || rm "$file"
            else
                rm "$file"
            fi
            echo -e "    ${GREEN}→ Removed duplicate from root${NC}"
            ((DUPLICATE_COUNT++))
        elif [ $result -eq 1 ]; then
            # Different versions - manual review needed
            echo -e "    ${YELLOW}→ Manual review needed (files differ)${NC}"
        fi
    fi
done

echo ""

# ========================================
# SUMMARY
# ========================================
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      CLEANUP SUMMARY                     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Files moved to FIXES/:        $MOVED_COUNT${NC}"
echo -e "${GREEN}✓ Files archived:               $ARCHIVED_COUNT${NC}"
echo -e "${GREEN}✓ Duplicates removed:           $DUPLICATE_COUNT${NC}"
echo -e "${GREEN}✓ Total files organized:        $((MOVED_COUNT + ARCHIVED_COUNT + DUPLICATE_COUNT))${NC}"
echo ""

# Show remaining files in root
echo -e "${YELLOW}Remaining .md files in root directory:${NC}"
ls -1 *.md 2>/dev/null | grep -v "README.md" | grep -v "WARP.md" | grep -v "DEPRECATED_FILES_AUDIT.md" || echo -e "${GREEN}  ✓ Root directory is clean!${NC}"
echo ""

# Show remaining scripts
echo -e "${YELLOW}Remaining .sh scripts in root directory:${NC}"
ls -1 *.sh 2>/dev/null || echo -e "${GREEN}  ✓ No scripts in root!${NC}"
echo ""

echo -e "${YELLOW}Remaining .sh scripts in backend/:${NC}"
ls -1 backend/*.sh 2>/dev/null | grep -E "(setup_db|fix_pg_auth)" && echo -e "${GREEN}  ✓ Only essential scripts remain${NC}" || true
echo ""

# Git status
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${BLUE}Git Status:${NC}"
    echo -e "${YELLOW}  Changes ready to commit:${NC}"
    git status --short | head -10
    echo ""
fi

# ========================================
# NEXT STEPS
# ========================================
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                       NEXT STEPS                         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1.${NC} Review the changes:"
echo -e "   ${BLUE}git status${NC}"
echo ""
echo -e "${YELLOW}2.${NC} Test that nothing is broken:"
echo -e "   ${BLUE}cd backend && npm start${NC}"
echo ""
echo -e "${YELLOW}3.${NC} Commit the cleanup:"
echo -e "   ${BLUE}git add .${NC}"
echo -e "   ${BLUE}git commit -m 'docs: Organize documentation after modularization'${NC}"
echo ""
echo -e "${YELLOW}4.${NC} Push to repository:"
echo -e "   ${BLUE}git push${NC}"
echo ""
echo -e "${YELLOW}5.${NC} Backup location (if rollback needed):"
echo -e "   ${BLUE}$BACKUP_DIR/${NC}"
echo ""
echo -e "${GREEN}✨ Cleanup complete!${NC}"
echo ""
