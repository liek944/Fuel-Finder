# Serving Frontend from Backend

## Option: Serve React Frontend from Express (ifuel-dangay.duckdns.org)

If you want https://ifuel-dangay.duckdns.org to serve the full Fuel Finder UI:

### Step 1: Build the Frontend

```bash
cd frontend
npm run build
```

This creates `frontend/build/` with production-ready files.

### Step 2: Copy Build to Backend

```bash
# From project root
cp -r frontend/build backend/public
```

### Step 3: Update backend/app.js

Add BEFORE the `app.use("/api", apiRoutes);` line:

```javascript
// Serve frontend static files (PRODUCTION ONLY)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}
```

### Step 4: Restart Backend

```bash
cd backend
pm2 restart all
# or
npm start
```

Now `https://ifuel-dangay.duckdns.org/` will show your Fuel Finder map!

---

## Important: CORS & API URL

Your frontend needs to know where the API is. Update `frontend/.env.production`:

```env
REACT_APP_API_URL=https://ifuel-dangay.duckdns.org
```

Then rebuild:
```bash
cd frontend
npm run build
cp -r build ../backend/public
```

---

## Architecture After This Change

```
https://ifuel-dangay.duckdns.org/
├── /                          → React App (Map UI)
├── /api/stations             → API endpoints
├── /api/owner/info           → Owner API
└── /uploads/stations/        → Station images
```

---

## Alternative: Keep Separate (Recommended for Scalability)

**Frontend:** Vercel/Netlify (your-app.vercel.app)
**Backend:** DuckDNS (ifuel-dangay.duckdns.org/api/*)

This keeps them independent and easier to deploy/scale.
