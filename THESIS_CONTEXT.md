# 📚 Fuel Finder BSCS Thesis Context & Documentation

## 🎓 Academic Information

### Thesis Details
- **Title**: "Fuel Finder: An Online Fuel Station Locator and Navigation Web-App using OSRM A*-based Routing and OpenStreetMap"
- **Field**: BS Computer Science (BSCS Thesis)
- **Location**: Oriental Mindoro, Philippines
- **Data Source**: OpenStreetMap (OSM) extract for Oriental Mindoro

### Research Objectives
- **Primary Goal**: Help drivers locate nearby fuel stations, view fuel prices, and navigate using optimized routes with A*-based routing
- **Technical Focus**: Integration of web mapping technologies, geospatial databases, and algorithmic routing in a practical application

---

## 🏗️ Technical Architecture

### System Overview
```
Internet → [Frontend (Vercel)] → [Backend API (Render)] → [PostgreSQL+PostGIS (Render)]
                                      ↓
                              [OSRM Routing Engine (AWS EC2)]
```

### Technology Stack

#### Frontend
- **Platform**: Vercel
- **Technologies**: HTML, CSS, JavaScript
- **Map Library**: Leaflet.js with OpenStreetMap tiles
- **Deployment URL**: https://fuel-finder.vercel.app (example)

#### Backend
- **Platform**: Render
- **Runtime**: Node.js with Express.js
- **Deployment URL**: https://fuel-finder-backend-iw23.onrender.com
- **API Documentation**: RESTful API with comprehensive endpoints

#### Database
- **Type**: PostgreSQL with PostGIS extension
- **Provider**: Render Managed PostgreSQL
- **Capabilities**: Spatial queries, geospatial indexing, distance calculations

#### Routing Engine
- **Service**: OSRM (Open Source Routing Machine)
- **Platform**: AWS EC2
- **Algorithm**: A*-based routing
- **Data Source**: Oriental Mindoro .osm.pbf extract processed with osmium-tool

#### Storage
- **Primary**: Supabase Storage for images
- **Fallback**: Local file system storage
- **Content**: Station images, POI images, thumbnails

---

## 🔧 System Features & Functionalities

### Core Features
1. **Geolocation-based Station Discovery**
   - PostGIS spatial queries using ST_DWithin
   - Configurable search radius (100m - 50km)
   - Real-time location detection

2. **Route Optimization**
   - OSRM A*-based pathfinding
   - Turn-by-turn navigation support
   - Distance and duration calculations
   - Caching for performance optimization

3. **Station Management**
   - CRUD operations for fuel stations
   - Brand-based filtering
   - Search functionality by name/address
   - Fuel price tracking

4. **Point of Interest (POI) System**
   - Custom markers for emergency services
   - Types: gas, convenience, repair, car_wash, motor_shop
   - Spatial proximity searches

5. **Image Management**
   - Base64 image upload system
   - Automatic thumbnail generation
   - Primary image designation
   - Supabase Storage integration

6. **Admin Dashboard**
   - API key-protected endpoints
   - Station/POI CRUD operations
   - Image management interface
   - System monitoring and statistics

### Performance Optimizations
- **Caching Strategy**: In-memory caching with configurable TTL
- **Rate Limiting**: IP-based request throttling
- **Database Indexing**: Spatial indexes for geospatial queries
- **Image Optimization**: Thumbnail generation and compression

---

## 📡 API Endpoints

### Station Management
- `GET /api/stations` - Retrieve all stations
- `POST /api/stations` - Create new station (protected)
- `GET /api/stations/nearby?lat=X&lng=Y&radiusMeters=R` - Spatial search
- `GET /api/stations/:id` - Get station by ID
- `DELETE /api/stations/:id` - Delete station (protected)
- `GET /api/stations/search?q=term` - Search stations
- `GET /api/stations/brand/:brand` - Filter by brand

### POI Management
- `GET /api/pois` - Retrieve all POIs
- `POST /api/pois` - Create new POI (protected)
- `GET /api/pois/nearby?lat=X&lng=Y&radiusMeters=R` - Spatial POI search
- `DELETE /api/pois/:id` - Delete POI (protected)

### Routing
- `GET /api/route?start=lat,lng&end=lat,lng` - OSRM route calculation

### Image Management
- `POST /api/stations/:id/images` - Upload station images (protected)
- `GET /api/stations/:id/images` - Get station images
- `POST /api/pois/:id/images` - Upload POI images (protected)
- `GET /api/pois/:id/images` - Get POI images
- `DELETE /api/images/:id` - Delete image (protected)
- `PATCH /api/images/:id/primary` - Set primary image (protected)

### System Monitoring
- `GET /api/health` - Health check with database stats
- `POST /api/cache/clear` - Clear application cache
- `GET /api/stats` - Database statistics

---

## 🗄️ Database Schema

### Stations Table
```sql
CREATE TABLE stations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  fuel_price DECIMAL(10,2),
  services TEXT[],
  address TEXT,
  phone VARCHAR(20),
  operating_hours TEXT,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### POIs Table
```sql
CREATE TABLE pois (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Images Table
```sql
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES stations(id),
  poi_id INTEGER REFERENCES pois(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 BSCS Thesis Outline Alignment

### Chapter 1: Introduction
- **Background**: Fuel station location challenges in Oriental Mindoro
- **Problem Statement**: Navigation difficulties and fuel price transparency
- **Objectives**: 
  - General: Develop a comprehensive fuel station locator
  - Specific: Implement A*-based routing, spatial search, price tracking
- **Scope**: Oriental Mindoro geographic area, web-based platform
- **Significance**: Benefits to drivers, tourism, local economy

### Chapter 2: Review of Related Literature
- **Local Studies**: Philippine GIS applications, transportation systems
- **Foreign Studies**: Web mapping technologies, routing algorithms
- **Related Systems**: Google Maps, Waze, GasBuddy comparative analysis
- **Gap Analysis**: A*-based routing with local OSM data integration

### Chapter 3: Methodology
- **Research Design**: Descriptive-developmental approach
- **System Architecture**: Detailed technical documentation
- **Development Environment**: Node.js, PostgreSQL, OSRM, Vercel, Render
- **Data Sources**: OpenStreetMap, manual fuel price collection
- **System Development**: Agile methodology with iterative development

### Chapter 4: Results and Discussion
- **System Output**: Functional web application
- **Performance Testing**: Response times, accuracy metrics
- **User Interface**: Screenshots and usability analysis
- **Spatial Query Performance**: PostGIS optimization results

### Chapter 5: Summary and Recommendations
- **Findings**: Successful A*-based routing implementation
- **Conclusions**: Effective integration of web mapping technologies
- **Future Work**: ML price prediction, traffic integration, mobile app

---

## 📊 Key Metrics & Performance Data

### System Performance
- **Average API Response Time**: < 200ms for cached queries
- **Spatial Query Performance**: PostGIS ST_DWithin optimization
- **Route Calculation**: OSRM sub-second response times
- **Image Processing**: Base64 upload with thumbnail generation

### Database Statistics
- **Stations**: Configurable dataset for Oriental Mindoro
- **POIs**: Emergency services and amenities
- **Images**: Multi-format support with compression
- **Spatial Indexes**: Optimized for geographic queries

---

## 🔒 Security & Deployment

### Security Features
- **API Key Protection**: Admin endpoints secured
- **Rate Limiting**: IP-based request throttling
- **Input Validation**: SQL injection prevention
- **CORS Configuration**: Frontend domain restrictions
- **HTTPS Enforcement**: SSL certificates on all endpoints

### Deployment Configuration
- **Environment Variables**: Production-ready configuration
- **Health Monitoring**: Automated health checks
- **Error Handling**: Comprehensive error logging
- **Graceful Shutdown**: SIGINT/SIGTERM handling

---

## 📝 Academic Writing Guidelines

### Tone & Style
- **Perspective**: Third person, objective
- **Language**: Formal academic tone
- **Terminology**: Consistent technical vocabulary
- **Citations**: Placeholder format (Author, Year)

### Key Terms to Use Consistently
- "A*-based routing" (not "A-star" or "A* algorithm")
- "OpenStreetMap" (not "OSM" in formal writing)
- "PostGIS spatial queries" (not just "spatial queries")
- "OSRM routing engine" (not just "OSRM")
- "Oriental Mindoro geographic region"

### Figure & Table Suggestions
- System architecture diagram
- Database schema visualization
- API endpoint documentation table
- Performance comparison charts
- User interface screenshots
- Route calculation flowchart

---

## 🚀 Future Enhancements (for Recommendations)

### Technical Improvements
- **Machine Learning**: Fuel price prediction algorithms
- **Real-time Data**: Traffic-aware routing integration
- **Mobile Application**: React Native or Flutter implementation
- **Offline Capabilities**: Progressive Web App features
- **Multi-modal Routing**: Walking, cycling route options

### Feature Expansions
- **User Reviews**: Station rating and review system
- **Favorites**: Bookmarking and user preferences
- **Multi-stop Routing**: Complex trip planning
- **Fuel Consumption**: Vehicle-specific calculations
- **Social Features**: Community-driven price updates

---

## 📞 Contact & Resources

### Deployment URLs
- **Frontend**: https://fuel-finder.vercel.app
- **Backend**: https://fuel-finder-backend-iw23.onrender.com
- **Health Check**: https://fuel-finder-backend-iw23.onrender.com/api/health

### Documentation References
- **OSRM Documentation**: http://project-osrm.org/docs/
- **PostGIS Manual**: https://postgis.net/documentation/
- **OpenStreetMap**: https://www.openstreetmap.org/
- **Leaflet.js**: https://leafletjs.com/

---

*This document serves as the comprehensive technical and academic context for the Fuel Finder BSCS thesis project. It should be referenced throughout the thesis writing process to ensure accuracy and consistency.*
