# Owner Theme Customization Guide

## 🎨 Quick Start

Update owner theme in database:

```sql
UPDATE owners
SET theme_config = '{
  "brandName": "Your Brand",
  "logoUrl": "https://example.com/logo.png",
  "colors": {
    "primary": "#FF6B00",
    "secondary": "#FFB800",
    "accent": "#00D4FF",
    "background": "#0A0E1A",
    "surface": "#151B2E",
    "text": "#FFFFFF"
  },
  "mode": "dark",
  "features": {
    "analytics": true,
    "priceVerification": true,
    "stationEditing": true
  }
}'::jsonb
WHERE domain = 'owner-subdomain';
```

## 📋 Theme Properties

- **brandName**: Display name (string)
- **logoUrl**: Logo image URL (200×80px recommended)
- **colors**: primary, secondary, accent, background, surface, text
- **mode**: "light" or "dark"
- **fonts**: heading and body font families
- **features**: Enable/disable dashboard features

## 🧪 Apply Migration

```bash
cd backend
node database/apply-theme-migration.js
```

## 📖 Files Created

**Backend:**
- `/backend/database/migrations/007_add_owner_theme_config.sql`
- `/backend/database/apply-theme-migration.js`
- `/backend/controllers/ownerController.js` (updated)

**Frontend:**
- `/frontend/src/contexts/OwnerThemeContext.tsx`
- `/frontend/src/components/owner/OwnerLogin.tsx` (updated)
- `/frontend/src/components/owner/OwnerLogin.css` (updated)
- `/frontend/src/components/owner/OwnerDashboard.css` (updated)
- `/frontend/src/App.tsx` (updated)

## 🎨 Example Themes

**Shell:**
```json
{"colors": {"primary": "#FFC600", "secondary": "#DD1D21"}}
```

**Petron:**
```json
{"colors": {"primary": "#003DA5", "secondary": "#FF6600"}}
```

**Caltex:**
```json
{"colors": {"primary": "#E31E24", "secondary": "#005EB8"}}
```

---

**Status:** ✅ Implementation Complete
