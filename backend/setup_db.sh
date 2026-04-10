#!/bin/bash

# Fuel Finder Database Setup Script
# This script sets up PostgreSQL with PostGIS for the Fuel Finder application

set -e  # Exit on any error

echo "🚀 Fuel Finder Database Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="fuel_finder"
DB_USER="postgres"
DB_PASSWORD=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if PostgreSQL is running
check_postgresql() {
    print_info "Checking PostgreSQL status..."
    if sudo systemctl is-active --quiet postgresql; then
        print_status "PostgreSQL is running"
    else
        print_info "Starting PostgreSQL..."
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        print_status "PostgreSQL started and enabled"
    fi
}

# Check if PostGIS is installed
check_postgis() {
    print_info "Checking PostGIS installation..."
    if dpkg -l | grep -q postgresql-16-postgis-3; then
        print_status "PostGIS is installed"
    else
        print_error "PostGIS is not installed. Please run:"
        print_error "sudo apt install postgresql-16-postgis-3"
        exit 1
    fi
}

# Create database and enable PostGIS
setup_database() {
    print_info "Setting up database..."

    # Create database if it doesn't exist
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1 || {
        print_info "Creating database: $DB_NAME"
        sudo -u postgres createdb $DB_NAME
        print_status "Database created: $DB_NAME"
    }

    # Enable PostGIS extension
    print_info "Enabling PostGIS extension..."
    sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"

    # Verify PostGIS installation
    POSTGIS_VERSION=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT PostGIS_Version();" | xargs)
    print_status "PostGIS enabled. Version: $POSTGIS_VERSION"
}

# Set up authentication (optional)
setup_auth() {
    print_info "Setting up database authentication..."

    # Check if we can connect without password
    if sudo -u postgres psql -d $DB_NAME -c "\q" 2>/dev/null; then
        print_status "Database authentication is working"
    else
        print_warning "You may need to configure pg_hba.conf for local connections"
        print_info "Current pg_hba.conf settings for local connections:"
        sudo grep -E "^local.*all.*postgres" /etc/postgresql/16/main/pg_hba.conf || true
    fi
}

# Initialize database schema and data
initialize_schema() {
    print_info "Initializing database schema and sample data..."

    # Navigate to backend directory
    cd "$(dirname "$0")"

    # Check if node_modules exist
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node.js dependencies..."
        npm install
    fi

    # Run database initialization
    print_info "Running database initialization script..."
    node database/init.js

    print_status "Database schema and sample data initialized!"
}

# Create .env file if it doesn't exist
create_env_file() {
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cp .env.example .env

        # Update .env with local settings
        sed -i "s/DB_PASSWORD=password/DB_PASSWORD=/" .env
        sed -i "s/DB_USER=postgres/DB_USER=postgres/" .env

        print_status "Created .env file with local settings"
        print_warning "Review the .env file and update database credentials if needed"
    else
        print_status ".env file already exists"
    fi
}

# Test the setup
test_setup() {
    print_info "Testing database setup..."

    # Test database connection
    if node database/init.js check 2>/dev/null; then
        print_status "Database setup test passed!"
    else
        print_warning "Database test had some issues, but setup may still work"
    fi

    # Show database stats
    print_info "Database statistics:"
    sudo -u postgres psql -d $DB_NAME -c "
        SELECT
            'Total stations' as metric,
            COUNT(*)::text as value
        FROM stations
        UNION ALL
        SELECT
            'Brands',
            COUNT(DISTINCT brand)::text
        FROM stations
        UNION ALL
        SELECT
            'PostGIS version',
            split_part(PostGIS_Version(), ' ', 1)
        ;
    " 2>/dev/null || print_warning "Could not retrieve database statistics"
}

# Main execution
main() {
    echo
    print_info "Starting Fuel Finder database setup..."
    echo

    # Check prerequisites
    check_postgresql
    check_postgis

    # Setup database
    setup_database
    setup_auth

    # Setup application
    create_env_file
    initialize_schema

    # Test everything
    test_setup

    echo
    print_status "🎉 Database setup completed successfully!"
    echo
    print_info "Next steps:"
    echo "  1. Review the .env file: nano .env"
    echo "  2. Start the backend server: npm start"
    echo "  3. Test the API: curl http://localhost:3001/api/health"
    echo
    print_info "Available npm commands:"
    echo "  npm run db:check   - Check database status"
    echo "  npm run db:reset   - Reset database (caution!)"
    echo "  npm run db:sample  - Add more sample data"
    echo
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Don't run this script as root. Run as your normal user."
    print_info "The script will use sudo when needed."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "database" ]; then
    print_error "Please run this script from the backend directory"
    print_error "Expected files: package.json, database/"
    exit 1
fi

# Run main function
main

# Cleanup
trap 'print_info "Setup interrupted"' INT TERM
