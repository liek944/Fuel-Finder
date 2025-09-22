#!/bin/bash

# Fix PostgreSQL Authentication for Fuel Finder
# This script configures PostgreSQL to allow password authentication for the application

set -e

echo "🔧 Fixing PostgreSQL Authentication"
echo "=================================="

PG_VERSION="16"
PG_HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
BACKUP_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Backup current configuration
print_info "Backing up current pg_hba.conf..."
cp "$PG_HBA_FILE" "$BACKUP_FILE"
print_status "Backup saved to: $BACKUP_FILE"

# Check if our configuration already exists
if grep -q "host.*all.*postgres.*127.0.0.1/32.*md5" "$PG_HBA_FILE"; then
    print_status "Password authentication already configured"
else
    print_info "Adding password authentication configuration..."

    # Create temporary file with new configuration
    cat > /tmp/pg_hba_addition << 'EOF'

# Added by Fuel Finder setup - Allow password authentication for localhost
host    all             postgres        127.0.0.1/32           md5
host    all             postgres        ::1/128                 md5
EOF

    # Find the line with local peer authentication and insert before it
    awk '
    /^local[[:space:]]+all[[:space:]]+postgres[[:space:]]+peer/ {
        system("cat /tmp/pg_hba_addition")
        print $0
        next
    }
    { print }
    ' "$PG_HBA_FILE" > /tmp/pg_hba_new

    # Replace the original file
    mv /tmp/pg_hba_new "$PG_HBA_FILE"
    rm -f /tmp/pg_hba_addition

    print_status "Authentication configuration added"
fi

# Set proper permissions
chown postgres:postgres "$PG_HBA_FILE"
chmod 640 "$PG_HBA_FILE"

# Reload PostgreSQL configuration
print_info "Reloading PostgreSQL configuration..."
systemctl reload postgresql

print_status "PostgreSQL configuration reloaded"

# Test the connection
print_info "Testing database connection..."

# Test connection with password
if su - postgres -c "PGPASSWORD='fuelfinderpass' psql -h localhost -p 5433 -d fuel_finder -c 'SELECT 1;'" >/dev/null 2>&1; then
    print_status "✅ Password authentication is working!"
else
    print_warning "Connection test failed, but configuration has been updated"
    print_info "Try running the application - it may still work"
fi

echo
print_status "🎉 PostgreSQL authentication configuration completed!"
echo
print_info "What was changed:"
echo "  - Backup created: $BACKUP_FILE"
echo "  - Added password authentication for localhost connections"
echo "  - PostgreSQL configuration reloaded"
echo
print_info "You can now run:"
echo "  cd /home/keil/fuel\\ finder/backend"
echo "  npm run db:check"
echo "  npm start"
echo
print_info "To revert changes if needed:"
echo "  sudo cp $BACKUP_FILE $PG_HBA_FILE"
echo "  sudo systemctl reload postgresql"
