# Quick Start: Supabase Storage Migration

**TL;DR:** Your image uploads now use Supabase Storage instead of ephemeral Render filesystem.

## ⚡ Quick Setup (5 Minutes)

### 1. Create Supabase Bucket
```
1. Go to https://app.supabase.com
2. Storage → New Bucket
3. Name: "station-images"
4. Public: ✓ YES
5. Create Bucket
```

### 2. Add Environment Variables

**Backend `.env` file:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_STORAGE_BUCKET=station-images
```

Get these from: Supabase Dashboard → Settings → API

### 3. Run Migration
```bash
cd backend
psql -U postgres -d fuel_finder -f database/migrations/003_add_supabase_storage.sql
```

### 4. Test It
```bash
npm start
curl http://localhost:3001/api/health
# Should show storage.connected: true
```

## 🎯 What You Need

| Item | Where to Get | Required |
|------|-------------|----------|
| Supabase URL | Project Settings → API | ✅ Yes |
| Service Role Key | Project Settings → API | ✅ Yes |
| Bucket Name | Create in Storage | ✅ Yes |

## 🔄 Upload Flow

**Before (Render Filesystem):**
```
Frontend → Base64 → Backend → Save to /uploads → Ephemeral ❌
```

**After (Supabase Storage):**
```
Frontend → Base64 → Backend → Upload to Supabase → Persistent ✅
```

## 📁 Storage Structure

```
station-images/
├── station-1/
│   ├── uuid.jpeg        (main image)
│   └── thumb_uuid.jpeg  (thumbnail)
└── station-2/
    └── ...
```

## ✅ What Still Works

- ✅ Base64 image uploads from frontend
- ✅ Same API endpoints (`/api/stations/:id/images`)
- ✅ Image deletion and primary selection
- ✅ Existing local images (backward compatible)

## 🆕 What's New

- ✅ Images persist across redeploys
- ✅ Stored in Supabase CDN
- ✅ Better organized by folders
- ✅ Health check shows storage status

## 🐛 Quick Troubleshooting

**Problem:** `storage.connected: false`
```bash
# Check environment variables are set
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Restart backend
npm start
```

**Problem:** "Bucket not found"
```bash
# Verify bucket name is exactly: station-images
# Check it's marked as public
# Add storage policies (see SUPABASE_STORAGE_SETUP.md)
```

**Problem:** Images upload but don't display
```bash
# Check bucket is public
# Verify image_url in database is correct
# Test URL directly in browser
```

## 📚 Full Documentation

- `SUPABASE_STORAGE_SETUP.md` - Complete setup guide
- `MIGRATION_CHECKLIST.md` - Step-by-step checklist
- `services/supabaseStorage.js` - Code reference

## 🚀 Production Deployment

1. Add environment variables to Render
2. Deploy backend
3. Run migration on production database
4. Test `/api/health`
5. Upload a test image

**Done! Images now persist forever.** 🎉

---

Need help? Check the full docs or test with `/api/health`.
