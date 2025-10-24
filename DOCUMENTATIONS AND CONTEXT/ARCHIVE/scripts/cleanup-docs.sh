#!/bin/bash
# Documentation Cleanup Script - Post Modularization
# Created: Oct 23, 2025
# Purpose: Organize scattered documentation into proper directories

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Fuel Finder Documentation Cleanup Script    ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}\n"

# Counter for moved files
MOVED_COUNT=0

# Function to move file with feedback
move_file() {
    local src="$1"
    local dest="$2"
    if [ -f "$src" ]; then
        mv "$src" "$dest" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Moved: $(basename "$src")"
            ((MOVED_COUNT++))
            return 0
        else
            echo -e "${RED}✗${NC} Failed: $(basename "$src")"
            return 1
        fi
    else
        echo -e "${YELLOW}⊘${NC} Not found: $(basename "$src")"
        return 2
    fi
}

# Create necessary directories
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p "DOCUMENTATIONS AND CONTEXT/MODULARIZATION"
mkdir -p "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts"
mkdir -p "DOCUMENTATIONS AND CONTEXT/ARCHIVE"
echo -e "${GREEN}✓${NC} Directories created\n"

# ===== MODULARIZATION DOCUMENTATION =====
echo -e "${BLUE}[1/5] Moving Modularization Documentation...${NC}"
move_file "MODULARIZATION_PLAN.md" "DOCUMENTATIONS AND CONTEXT/MODULARIZATION/"
move_file "MIGRATION_GUIDE.md" "DOCUMENTATIONS AND CONTEXT/MODULARIZATION/"
move_file "SETUP_INSTRUCTIONS.md" "DOCUMENTATIONS AND CONTEXT/MODULARIZATION/"
move_file "MODULARIZATION_FIXES_SUMMARY.md" "DOCUMENTATIONS AND CONTEXT/MODULARIZATION/"
echo ""

# ===== FIX DOCUMENTATION =====
echo -e "${BLUE}[2/5] Moving Fix Documentation...${NC}"
move_file "API_KEY_FIX.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
move_file "API_KEY_SIGNIN_FIX_COMPLETE.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
move_file "COORDINATE_ACCURACY_FIX.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
move_file "STATION_CREATION_400_FIX.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
move_file "SUPABASE_IMAGE_DISPLAY_FIX.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
move_file "URGENT_FIX_COMPLETE.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
move_file "WEBHOOK_FIX_SUMMARY.md" "DOCUMENTATIONS AND CONTEXT/FIXES/"
echo ""

# ===== RENAME DUPLICATE QUICK_FIX_GUIDE FILES =====
echo -e "${BLUE}[3/5] Renaming Duplicate Quick Fix Guides...${NC}"
if [ -f "QUICK_FIX_GUIDE.md" ]; then
    mv "QUICK_FIX_GUIDE.md" "DOCUMENTATIONS AND CONTEXT/FIXES/COORDINATE_ACCURACY_QUICK_FIX.md" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Renamed: QUICK_FIX_GUIDE.md → COORDINATE_ACCURACY_QUICK_FIX.md"
        ((MOVED_COUNT++))
    fi
fi

if [ -f "DOCUMENTATIONS AND CONTEXT/FIXES/QUICK_FIX_GUIDE.md" ]; then
    mv "DOCUMENTATIONS AND CONTEXT/FIXES/QUICK_FIX_GUIDE.md" \
       "DOCUMENTATIONS AND CONTEXT/FIXES/IMAGE_UPLOAD_QUICK_FIX.md" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Renamed: QUICK_FIX_GUIDE.md → IMAGE_UPLOAD_QUICK_FIX.md"
        ((MOVED_COUNT++))
    fi
fi
echo ""

# ===== DEPLOYMENT SCRIPTS =====
echo -e "${BLUE}[4/5] Moving Deployment Scripts...${NC}"
move_file "debug-upload-issue.sh" "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts/"
move_file "deploy-donations.sh" "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts/"
move_file "deploy-webhook-fix.sh" "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts/"
move_file "verify-donation-stats.sh" "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts/"
move_file "verify-pm2-status.sh" "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts/"

# Make scripts executable
if [ -d "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts" ]; then
    chmod +x "DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/scripts"/*.sh 2>/dev/null
    echo -e "${GREEN}✓${NC} Made scripts executable"
fi
echo ""

# ===== ARCHIVE OBSOLETE FILES =====
echo -e "${BLUE}[5/5] Archiving Potentially Obsolete Files...${NC}"
move_file "DEPRECATED_MODULES_MIGRATION_PLAN.md" "DOCUMENTATIONS AND CONTEXT/ARCHIVE/"
if [ -f "WARP.md" ]; then
    echo -e "${YELLOW}⚠${NC}  WARP.md found - review manually if needed"
fi
echo ""

# ===== SUMMARY =====
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    SUMMARY                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✓ Files moved/renamed: $MOVED_COUNT${NC}"
echo -e "${GREEN}✓ Directory structure created${NC}"
echo -e "${GREEN}✓ Scripts made executable${NC}\n"

# Check root directory cleanliness
echo -e "${YELLOW}Remaining documentation files in root:${NC}"
ls -1 *.md 2>/dev/null | grep -v "README.md" | head -5

if [ $? -ne 0 ]; then
    echo -e "${GREEN}✓ Root directory is clean!${NC}"
else
    echo -e "\n${YELLOW}Note: Some .md files remain in root (may be intentional)${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Review changes: ${YELLOW}git status${NC}"
echo -e "  2. Update README: See ${YELLOW}DOCUMENTATIONS AND CONTEXT/MODULARIZATION/CLEANUP_GUIDE.md${NC}"
echo -e "  3. Commit changes: ${YELLOW}git add . && git commit -m 'docs: Reorganize after modularization'${NC}\n"

echo -e "${GREEN}Cleanup complete! ✨${NC}\n"
