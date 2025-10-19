# PostgreSQL + PostGIS Setup Guide for Fuel Finder

This guide will help you set up PostgreSQL with the PostGIS extension to power the Fuel Finder application's geospatial features.

## Prerequisites

Before starting, ensure you have:
- Node.js (v14 or higher)
- npm or yarn package manager
- Administrator/root access for database installation

## Step 1: Install PostgreSQL with PostGIS

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install PostgreSQL and PostGIS
sudo apt install postgresql postgresql-contrib postgresql-client
sudo apt install postgis postgresql-14-postgis-3

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (using Homebrew)
```bash
# Install PostgreSQL and PostGIS
brew install postgresql postgis

# Start PostgreSQL service
brew services start postgresql
```

### Windows
1. Download PostgreSQL installer from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Download PostGIS from: https://postgis.net/windows_downloads/
4. Install PostGIS using the downloaded installer

### Docker (Alternative - Cross-platform)
```bash
# Run PostgreSQL with PostGIS in Docker
docker run --name fuel-finder-db \
  -e POSTGRES_DB=fuel_finder \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgis/postgis:14-3.2
```

## Step 2: Database Setup

### Create Database and User

1. **Access PostgreSQL as superuser:**
```bash
# On Linux/macOS
sudo -u postgres psql

# On Windows (in Command Prompt as Administrator)
psql -U postgres
```

2. **Create the database:**
```sql
-- Create the fuel finder database
CREATE DATABASE fuel_finder;

-- Create a user (optional - you can use the default postgres user)
CREATE USER fuel_finder_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fuel_finder TO fuel_finder_user;

-- Connect to the new database
\c fuel_finder

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Exit psql
\q
```

3. **Verify the setup:**
```bash
# Test connection to the new database
psql -h localhost -U postgres -d fuel_finder -c "SELECT PostGIS_Version();"
```

## Step 3: Configure Environment Variables

1. **Navigate to the backend directory:**
```bash
cd "/home/keil/fuel finder/backend"
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Edit the .env file:**
```bash
# Use your preferred text editor
nano .env
# or
code .env
```

4. **Update the configuration:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fuel_finder
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Cache Configuration (2 minutes in milliseconds)
CACHE_TTL_MS=120000
```

**Important:** Replace `your_password_here` with your actual PostgreSQL password.

## Step 4: Install Dependencies and Initialize Database

1. **Install backend dependencies:**
```bash
cd "/home/keil/fuel finder/backend"
npm install
```

2. **Initialize the database schema:**
```bash
npm run db:init
```

3. **Verify the setup:**
```bash
npm run db:check
```

Expected output should show:
- ✅ PostGIS version information
- ✅ Tables created (stations)
- ✅ Sample station data loaded
- ✅ Spatial indexes created

## Step 5: Start the Application

1. **Start the backend server:**
```bash
cd "/home/keil/fuel finder/backend"
npm start
```

You should see:
```
✅ Database connected successfully
✅ PostGIS version: X.X.X
✅ Fuel Finder backend running at http://localhost:3001
```

2. **In a new terminal, start the frontend:**
```bash
cd "/home/keil/fuel finder/frontend"
npm start
```

## Step 6: Test the Setup

### Backend API Tests

1. **Health Check:**
```bash
curl http://localhost:3001/api/health
```

2. **Get all stations:**
```bash
curl http://localhost:3001/api/stations
```

3. **Get nearby stations (PostGIS spatial query):**
```bash
curl "http://localhost:3001/api/stations/nearby?lat=12.5966&lng=121.5258&radiusMeters=5000"
```

4. **Search stations:**
```bash
curl "http://localhost:3001/api/stations/search?q=shell"
```

### Frontend Test
- Open browser to `http://localhost:3000`
- Allow location access when prompted
- Verify that fuel stations appear on the map with rich popup information
- Test the radius adjustment slider

## Database Management Commands

After setup, you can use these npm scripts:

- **Initialize database:** `npm run db:init`
- **Reset database:** `npm run db:reset`
- **Check database status:** `npm run db:check`
- **Add sample data:** `npm run db:sample`

## New Features Available

### ✅ PostGIS Spatial Queries
- Efficient radius-based searches using `ST_DWithin`
- Precise distance calculations using PostgreSQL geography type
- Spatial indexing with GIST indexes for optimal performance

### ✅ Rich Station Data
- **Fuel Prices:** Real fuel prices in Philippine Peso per liter
- **Services:** WiFi, Car Wash, ATM, Convenience Store, etc.
- **Contact Info:** Addresses and phone numbers
- **Operating Hours:** Store operating hours (JSON format)

### ✅ Enhanced API Endpoints
- `GET /api/stations` - All stations from PostgreSQL
- `GET /api/stations/nearby` - PostGIS spatial search
- `GET /api/stations/:id` - Individual station details
- `GET /api/stations/search?q=term` - Text search
- `GET /api/stations/brand/:brand` - Filter by brand
- `GET /api/stats` - Database statistics

### ✅ Performance Optimizations
- In-memory caching with configurable TTL
- Spatial indexes for fast geospatial queries
- Connection pooling for database efficiency

## Troubleshooting

### Common Issues

1. **"Database connection failed"**
   - Ensure PostgreSQL is running: `sudo systemctl status postgresql`
   - Check connection settings in `.env` file
   - Verify database exists: `psql -l`

2. **"PostGIS extension not found"**
   - Install PostGIS: `sudo apt install postgresql-14-postgis-3`
   - Enable in database: `CREATE EXTENSION postgis;`

3. **"Permission denied"**
   - Check user permissions: `GRANT ALL PRIVILEGES ON DATABASE fuel_finder TO your_user;`
   - Verify pg_hba.conf allows connections

4. **"Port already in use"**
   - Change PORT in `.env` file
   - Kill existing processes: `lsof -ti:3001 | xargs kill`

### Useful Commands

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Connect to database directly
psql -h localhost -U postgres -d fuel_finder

# Reset everything and start fresh
npm run db:reset
```

## Production Considerations

For production deployment:

1. **Security:**
   - Use strong passwords
   - Configure firewall rules
   - Enable SSL connections
   - Restrict database access

2. **Performance:**
   - Tune PostgreSQL configuration
   - Monitor query performance
   - Set up connection pooling
   - Configure appropriate cache settings

3. **Backup:**
   - Set up automated backups
   - Test backup restoration
   - Monitor disk space

4. **Monitoring:**
   - Set up logging
   - Monitor database connections
   - Track query performance

## Next Steps

Now that PostgreSQL + PostGIS is set up, you can:

1. **Add more stations:** Use the database management scripts
2. **Implement CRUD operations:** Build admin panel for station management
3. **Add user accounts:** Implement authentication and user favorites
4. **Enhance search:** Add full-text search capabilities
5. **Optimize performance:** Fine-tune spatial indexes and queries

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure PostgreSQL and PostGIS versions are compatible
4. Check application logs for specific error messages

The application now uses enterprise-grade PostgreSQL with PostGIS for all geospatial operations, providing much better performance and scalability compared to the previous static data approach.