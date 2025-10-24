🧠 AI Prompt Guide: Owner-Based Access Control (Multi-Domain System)

Project Context:
Fuel Finder is a web app for locating fuel stations and navigating routes using OSRM + OpenStreetMap.
Each station owner (not brand) will have their own subdomain and API key to manage their stations, verify price reports, and view analytics in their admin dashboard.

🎯 Goal

Implement a multi-owner access control system that uses subdomains and API keys for authentication and data separation.

⚙️ Feature Description

Each owner gets:

A unique subdomain (e.g., castillonfuels.fuelfinder.com)

A unique API key

Access only to their own stations

Ability to verify or reject fuel price reports for their stations

The backend should automatically detect which owner is calling based on the subdomain and validate their API key before allowing restricted actions.

🧩 Technical Requirements

1. Subdomain Detection Middleware

Extract subdomain from req.hostname

Assign it to req.owner

Log all incoming owner requests

2. Database Schema Changes
Create a new table: owners

Column	Type	Description
id	UUID (PK)	Owner ID
name	VARCHAR	Owner name
domain	VARCHAR	Subdomain identifier (e.g., castillonfuels)
api_key	TEXT	Secure API key
email	VARCHAR	(optional)
created_at	TIMESTAMP	Default NOW()

Update stations table to include:

owner_id → foreign key to owners.id

3. API Key Authentication Middleware

Check req.headers['x-api-key']

Validate against owners.api_key for that req.owner

If invalid, return 403 Forbidden

4. Endpoint Protection
Apply middleware to sensitive routes:

/api/verify-price

/api/update-station

/api/owner-dashboard

5. Integration Behavior
Example flow:

Owner visits https://castillonfuels.fuelfinder.com

Frontend makes requests to backend (same domain)

Express middleware detects req.owner = 'castillonfuels'

API key in request header is verified against DB

If valid → allow access only to that owner’s stations

🧱 Implementation Steps (for the AI to follow)

Create a migration for the new owners table in PostgreSQL

Add subdomain detection middleware in app.js

Add API key verification middleware (Express)

Update station routes to filter by req.owner

Protect verification and update routes with API key middleware

Add sample data for 2–3 owners for testing

Test endpoints:

GET /api/stations (should show only owner’s stations)

POST /api/verify-price (requires valid API key)

Log attempts with invalid keys (for security monitoring)

🧠 Example Middleware Concepts (Docs to Review)

Express.js req.hostname: https://expressjs.com/en/api.html#req.hostname

Express Middleware: https://expressjs.com/en/guide/using-middleware.html

PostgreSQL Foreign Keys: https://www.postgresql.org/docs/current/ddl-constraints.html

Node.js crypto for key generation: https://nodejs.org/api/crypto.html

💡 Stretch Features (Future Thesis Enhancements)

Owner dashboard showing analytics (price verification logs, map traffic, etc.)

API key rotation feature (generate new keys securely)

Owner registration portal (admin-managed)

Audit logs for all owner actions

Optional 2FA for sensitive operations

📋 Deliverable Summary
Component	Description
Middleware	Detect subdomain and validate API key
Database	owners table linked to stations
Auth System	Header-based API key validation
Filtering	Station and report data scoped to req.owner
Security	403 Forbidden for invalid keys or mismatched owners
Testing	Valid/invalid key tests + station ownership filtering