# Owner Logo & Theme Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     OWNER LOGIN PAGE                            │
│  https://ifuel-dangay.fuelfinder.com/login                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 1. Fetch owner info
                         │ GET /api/owner/info
                         │ Header: x-owner-domain: ifuel-dangay
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND MIDDLEWARE LAYER                          │
│  ownerDetection.js - detectOwner()                              │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Extracts subdomain from header/hostname                     │
│  ✅ Queries database with theme_config (NEW!)                   │
│                                                                  │
│  SELECT id, name, domain, email, contact_person,                │
│         phone, is_active, created_at, theme_config              │
│  FROM owners WHERE domain = $1 AND is_active = TRUE             │
│                                                                  │
│  ✅ Attaches req.ownerData with theme_config                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 2. Pass to controller
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND CONTROLLER LAYER                          │
│  ownerController.js - getOwnerInfo()                            │
├─────────────────────────────────────────────────────────────────┤
│  res.json({                                                      │
│    name: owner.name,                                             │
│    domain: owner.domain,                                         │
│    contact_person: owner.contact_person,                         │
│    email: owner.email,                                           │
│    phone: owner.phone,                                           │
│    theme_config: owner.theme_config || {}  ← Returns JSONB      │
│  });                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 3. JSON Response
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API RESPONSE                                 │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    "name": "iFuel Dangay Station",                              │
│    "domain": "ifuel-dangay",                                    │
│    "contact_person": "Juan Dela Cruz",                          │
│    "email": "ifuel.dangay@example.com",                         │
│    "phone": "+63 912 345 6789",                                 │
│    "theme_config": {                                            │
│      "logoUrl": "https://cdn.example.com/logo.png",             │
│      "primaryColor": "#FF6B35",                                 │
│      "secondaryColor": "#004E89",                               │
│      "backgroundColor": "#F7F7F7",                              │
│      "textColor": "#333333"                                     │
│    }                                                             │
│  }                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 4. Frontend processes response
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│               FRONTEND COMPONENTS                               │
│  OwnerLogin.tsx + OwnerThemeContext                             │
├─────────────────────────────────────────────────────────────────┤
│  if (ownerInfo?.theme_config?.logoUrl) {                        │
│    <img src={ownerInfo.theme_config.logoUrl} />                 │
│  } else {                                                        │
│    <h1>🏪 Owner Portal</h1>                                     │
│  }                                                               │
│                                                                  │
│  + Applies theme colors to:                                     │
│    - Background gradient                                        │
│    - Button colors                                              │
│    - Brand accents                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- owners table
CREATE TABLE owners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  email TEXT,
  contact_person TEXT,
  phone TEXT,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  theme_config JSONB DEFAULT '{}'::jsonb  ← Theme configuration
);

-- Example theme_config structure
{
  "logoUrl": "https://cdn.example.com/logo.png",
  "primaryColor": "#FF6B35",
  "secondaryColor": "#004E89", 
  "backgroundColor": "#F7F7F7",
  "textColor": "#333333"
}
```

## Component Hierarchy

```
App.tsx
├── Subdomain Detection Logic
│   └── If subdomain → Owner Portal Routes
│       ├── /login → OwnerLogin.tsx
│       │   ├── Fetches /api/owner/info
│       │   ├── OwnerThemeContext (applies colors)
│       │   └── Displays logo if available
│       └── /dashboard → OwnerDashboard.tsx
│           └── Main dashboard (no logo currently)
```

## File Locations

### Backend
```
backend/
├── middleware/
│   └── ownerDetection.js          ← 🔧 FIXED (added theme_config)
├── controllers/
│   └── ownerController.js         ← Returns theme_config
├── routes/
│   └── ownerRoutes.js             ← GET /api/owner/info
└── database/
    ├── migrations/
    │   └── 007_add_owner_theme_config.sql  ← Added theme_config column
    ├── set-owner-logo.sql         ← Helper to set logos
    └── check-owner-theme.sql      ← Helper to check configs
```

### Frontend
```
frontend/src/
├── App.tsx                        ← Subdomain routing
├── components/owner/
│   ├── OwnerLogin.tsx            ← 🖼️ Displays logo
│   ├── OwnerLogin.css            ← Logo styles
│   ├── OwnerDashboard.tsx        ← Main dashboard
│   └── OwnerDashboard.css
└── contexts/
    └── OwnerThemeContext.tsx     ← Applies theme colors
```

## Theme Application Flow

```
1. User visits: https://ifuel-dangay.fuelfinder.com/login
   ↓
2. Frontend extracts subdomain: "ifuel-dangay"
   ↓
3. Sends to API: x-owner-domain: ifuel-dangay
   ↓
4. Backend fetches owner with theme_config
   ↓
5. Frontend receives theme_config
   ↓
6. OwnerThemeContext.Provider wraps component
   ↓
7. Theme applied via CSS variables:
   - --primary-color
   - --secondary-color
   - --background-color
   - --text-color
   ↓
8. Logo rendered if logoUrl exists
```

## Security Considerations

### API Key vs Theme
- **Theme config**: Public (no auth required)
  - Used on login page (before authentication)
  - Safe to expose (branding only)
  
- **Owner data**: Protected (requires API key)
  - Used on dashboard (after authentication)
  - Includes sensitive station data

### Logo URL Requirements
- ✅ Must be publicly accessible (CORS-friendly)
- ✅ HTTPS recommended for secure pages
- ✅ No authentication headers required
- ✅ Should be on CDN for performance

## Logo Display Rules

### OwnerLogin.tsx
```typescript
// Priority order:
1. If logoUrl exists → Display logo image
2. If logoUrl null → Display "🏪 Owner Portal" text
3. If API fails → Display generic login form
```

### OwnerDashboard.tsx
```typescript
// Current behavior:
- Shows owner name in header
- Shows domain in header
- No logo display (by design)

// Optional enhancement:
- Add logo to sidebar/header
- Add to station cards
- Use as favicon
```

## Testing Checklist

- [ ] Backend returns theme_config in /api/owner/info
- [ ] theme_config includes logoUrl field
- [ ] Logo URL is publicly accessible
- [ ] Logo displays on login page
- [ ] Theme colors apply to UI elements
- [ ] Fallback works if no logo set
- [ ] Multiple owners have independent themes

## Future Enhancements

1. **Admin UI for logo management**
   - Upload logo via admin panel
   - Store in Supabase Storage
   - Auto-generate theme colors from logo

2. **Dashboard logo integration**
   - Add to sidebar header
   - Use in email templates
   - Display on printed reports

3. **Theme customization**
   - Color picker in admin panel
   - Preview before saving
   - Reset to default option

4. **Logo validation**
   - File size limits (< 500KB)
   - Format restrictions (PNG, JPG, SVG)
   - Dimension requirements (min/max)
   - Accessibility checks (contrast ratio)

---

**Status:** ✅ Architecture implemented and documented  
**Last Updated:** Oct 28, 2024  
**Version:** 1.0
